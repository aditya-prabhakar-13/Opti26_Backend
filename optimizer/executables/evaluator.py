"""
evaluator.py — Constraint Violation Checker for Velora Routing Output
======================================================================
Usage:
    python evaluator.py <output.json>          # prints a full report
    python evaluator.py <output.json> --json   # prints machine-readable JSON

The evaluator reads the combined output JSON (which contains both the
solver result AND the original input under the "input" key) and checks
every constraint that the solver must satisfy.

Constraints checked
-------------------
HARD (must never be violated):
  H1  All employees routed            – no employee left unserved
  H2  Earliest pickup                 – pickup_time >= earliest_pickup
  H3  Latest drop                     – drop_time   <= latest_drop
  H4  Vehicle capacity                – load <= vehicle capacity
  H5  Employee appears exactly once   – not duplicated across trips/vehicles
  H6  Employee-vehicle match          – every passenger_id is in input employees

SOFT (tracked but not "failures"):
  S1  Vehicle category preference     – premium employee → premium vehicle
                                        normal employee  → non-premium vehicle
  S2  Sharing preference              – single → load == 1
                                        double → load <= 2
                                        triple → load <= 3
  S3  Priority delay budget           – pickup delay vs latest_drop window,
                                        using priority_N_max_delay_min from metadata
  S4  Cost vs baseline                – optimized_cost vs baseline_cost per employee
"""

import json
import sys
from datetime import datetime
from dataclasses import dataclass, field
from typing import Any


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def parse_time(t: str) -> int:
    """Convert 'HH:MM' to integer minutes since midnight."""
    h, m = t.strip().split(":")
    return int(h) * 60 + int(m)


def fmt_time(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


@dataclass
class Violation:
    constraint_id: str          # e.g. "H2"
    constraint_name: str        # e.g. "Earliest Pickup"
    severity: str               # "HARD" or "SOFT"
    employee_id: str
    vehicle_id: str
    trip_number: int
    detail: str                 # human-readable description


@dataclass
class EvaluationResult:
    test_case_id: str
    violations: list = field(default_factory=list)
    warnings: list = field(default_factory=list)   # SOFT violations
    stats: dict = field(default_factory=dict)

    @property
    def hard_violations(self):
        return [v for v in self.violations if v.severity == "HARD"]

    @property
    def soft_violations(self):
        return [v for v in self.violations if v.severity == "SOFT"]

    @property
    def passed(self) -> bool:
        return len(self.hard_violations) == 0


# ─────────────────────────────────────────────
# Core evaluator
# ─────────────────────────────────────────────

def evaluate(output: dict) -> EvaluationResult:
    """
    Main entry point.  `output` is the parsed top-level dict from the
    solver's output JSON (must contain 'input', 'summary', 'vehicles',
    'unrouted_employees').
    """
    inp         = output["input"]
    summary     = output["summary"]
    vehicles    = output.get("vehicles", [])
    unrouted    = output.get("unrouted_employees", [])

    # ── Build employee lookup from input ──────────────────────────────
    emp_input: dict[str, dict] = inp.get("employees", {})
    # Normalise earliest_pickup / latest_drop to "HH:MM" strings
    for eid, edata in emp_input.items():
        for key in ("earliest_pickup", "latest_drop"):
            val = edata.get(key)
            if isinstance(val, (int, float)):
                # stored as day-fraction (0.0–1.0)
                total_min = round(val * 24 * 60)
                edata[key] = fmt_time(total_min)

    # ── Build vehicle lookup from input ──────────────────────────────
    veh_input: dict[str, dict] = {
        v["vehicle_id"]: v for v in inp.get("vehicles", [])
    }

    # ── Metadata: priority delay budgets ─────────────────────────────
    metadata: dict[str, Any] = {
        m["key"]: m["value"] for m in inp.get("metadata", [])
    }
    priority_delay: dict[int, int] = {}
    for p in range(1, 6):
        key = f"priority_{p}_max_delay_min"
        if key in metadata:
            priority_delay[p] = int(metadata[key])

    tc_id = str(metadata.get("test_case_id", "unknown"))
    result = EvaluationResult(test_case_id=tc_id)

    viols = result.violations  # shorthand

    # ── Track which employees we actually see in the output ───────────
    seen_employees: dict[str, list[tuple[str, int]]] = {}  # emp_id → [(veh_id, trip_no)]

    # ──────────────────────────────────────────────────────────────────
    # H1 – All employees routed
    # ──────────────────────────────────────────────────────────────────
    for ur in unrouted:
        eid    = ur.get("employee_id", "?")
        reason = ur.get("reason", "")
        viols.append(Violation(
            constraint_id   = "H1",
            constraint_name = "All Employees Routed",
            severity        = "HARD",
            employee_id     = eid,
            vehicle_id      = "—",
            trip_number     = 0,
            detail          = f"Employee {eid} was NOT routed. Reason: {reason}"
        ))

    # ──────────────────────────────────────────────────────────────────
    # Per-vehicle, per-trip checks
    # ──────────────────────────────────────────────────────────────────
    for veh in vehicles:
        vid       = veh["vehicle_id"]
        v_cat     = veh.get("category", "any").lower()        # "premium" / "normal"
        v_cap     = int(veh.get("capacity", 0))

        for trip in veh.get("trips", []):
            tno      = trip["trip_number"]
            load     = trip.get("load", 0)
            cap_lim  = trip.get("capacity_limit", v_cap)
            route    = trip.get("route", [])
            passengers = trip.get("passengers", [])

            # ── H4 – Vehicle capacity ─────────────────────────────────
            if load > v_cap:
                viols.append(Violation(
                    constraint_id   = "H4",
                    constraint_name = "Vehicle Capacity",
                    severity        = "HARD",
                    employee_id     = "—",
                    vehicle_id      = vid,
                    trip_number     = tno,
                    detail          = (
                        f"Trip load {load} exceeds vehicle capacity {v_cap} "
                        f"on {vid} trip#{tno}"
                    )
                ))

            # per-passenger checks
            for pax in passengers:
                eid         = pax["employee_id"]
                pickup_str  = pax.get("pickup_time", "00:00")
                drop_str    = pax.get("drop_time",   "00:00")
                pickup_min  = parse_time(pickup_str)
                drop_min    = parse_time(drop_str)

                # track appearances
                seen_employees.setdefault(eid, []).append((vid, tno))

                # ── H6 – Employee exists in input ─────────────────────
                if eid not in emp_input:
                    viols.append(Violation(
                        constraint_id   = "H6",
                        constraint_name = "Unknown Employee",
                        severity        = "HARD",
                        employee_id     = eid,
                        vehicle_id      = vid,
                        trip_number     = tno,
                        detail          = (
                            f"Employee {eid} in trip output does not exist "
                            f"in input employees"
                        )
                    ))
                    continue  # can't check further without input data

                edata     = emp_input[eid]
                ep_min    = parse_time(edata["earliest_pickup"])
                ld_min    = parse_time(edata["latest_drop"])
                veh_pref  = edata.get("vehicle_preference", "any").lower()
                share_pref = edata.get("sharing_preference", "any").lower()
                priority   = int(edata.get("priority", 99))

                # ── H2 – Earliest pickup ──────────────────────────────
                if pickup_min < ep_min:
                    viols.append(Violation(
                        constraint_id   = "H2",
                        constraint_name = "Earliest Pickup",
                        severity        = "HARD",
                        employee_id     = eid,
                        vehicle_id      = vid,
                        trip_number     = tno,
                        detail          = (
                            f"{eid} picked up at {pickup_str} but earliest "
                            f"allowed is {edata['earliest_pickup']} "
                            f"(early by {ep_min - pickup_min} min)"
                        )
                    ))

                # ── H3 – Latest drop ──────────────────────────────────
                if drop_min > ld_min:
                    viols.append(Violation(
                        constraint_id   = "H3",
                        constraint_name = "Latest Drop",
                        severity        = "HARD",
                        employee_id     = eid,
                        vehicle_id      = vid,
                        trip_number     = tno,
                        detail          = (
                            f"{eid} dropped at {drop_str} but latest allowed "
                            f"is {edata['latest_drop']} "
                            f"(late by {drop_min - ld_min} min)"
                        )
                    ))

                # ── S1 – Vehicle category preference ─────────────────
                if veh_pref == "premium" and v_cat != "premium":
                    viols.append(Violation(
                        constraint_id   = "S1",
                        constraint_name = "Vehicle Category Preference",
                        severity        = "SOFT",
                        employee_id     = eid,
                        vehicle_id      = vid,
                        trip_number     = tno,
                        detail          = (
                            f"{eid} requires a PREMIUM vehicle but is on "
                            f"{vid} which is category '{v_cat}'"
                        )
                    ))
                elif veh_pref == "normal" and v_cat == "premium":
                    viols.append(Violation(
                        constraint_id   = "S1",
                        constraint_name = "Vehicle Category Preference",
                        severity        = "SOFT",
                        employee_id     = eid,
                        vehicle_id      = vid,
                        trip_number     = tno,
                        detail          = (
                            f"{eid} requires a NORMAL vehicle but is on "
                            f"{vid} which is category '{v_cat}'"
                        )
                    ))

                # ── S2 – Sharing preference (soft) ───────────────────
                share_limit = {"single": 1, "double": 2, "triple": 3}.get(share_pref, 9999)
                if load > share_limit:
                    viols.append(Violation(
                        constraint_id   = "S2",
                        constraint_name = "Sharing Preference",
                        severity        = "SOFT",
                        employee_id     = eid,
                        vehicle_id      = vid,
                        trip_number     = tno,
                        detail          = (
                            f"{eid} has sharing_preference='{share_pref}' "
                            f"(preferred max {share_limit} passengers) but trip load is {load}"
                        )
                    ))

                # ── S3 – Priority delay budget ────────────────────────
                if priority in priority_delay:
                    budget = priority_delay[priority]
                    delay  = drop_min - ld_min   # positive means late
                    if delay > budget:
                        viols.append(Violation(
                            constraint_id   = "S3",
                            constraint_name = "Priority Delay Budget",
                            severity        = "SOFT",
                            employee_id     = eid,
                            vehicle_id      = vid,
                            trip_number     = tno,
                            detail          = (
                                f"{eid} (priority {priority}) arrived at "
                                f"{drop_str}, latest_drop={edata['latest_drop']}, "
                                f"delay={delay} min, budget={budget} min"
                            )
                        ))

    # ──────────────────────────────────────────────────────────────────
    # H5 – Employee appears exactly once
    # ──────────────────────────────────────────────────────────────────
    for eid, appearances in seen_employees.items():
        if len(appearances) > 1:
            locs = ", ".join(f"{v} trip#{t}" for v, t in appearances)
            viols.append(Violation(
                constraint_id   = "H5",
                constraint_name = "Employee Appears Exactly Once",
                severity        = "HARD",
                employee_id     = eid,
                vehicle_id      = "—",
                trip_number     = 0,
                detail          = f"{eid} appears {len(appearances)} times: {locs}"
            ))

    # ──────────────────────────────────────────────────────────────────
    # S4 – Cost vs baseline (per-employee not available granularly,
    #      so we do aggregate-level comparison)
    # ──────────────────────────────────────────────────────────────────
    baseline_total  = summary.get("total_baseline_cost", 0)
    optimized_total = summary.get("total_optimized_cost", 0)
    if optimized_total > baseline_total and baseline_total > 0:
        pct = (optimized_total - baseline_total) / baseline_total * 100
        viols.append(Violation(
            constraint_id   = "S4",
            constraint_name = "Cost vs Baseline",
            severity        = "SOFT",
            employee_id     = "—",
            vehicle_id      = "—",
            trip_number     = 0,
            detail          = (
                f"Optimized cost ({optimized_total:.2f}) exceeds baseline "
                f"({baseline_total:.2f}) by {pct:.1f}%"
            )
        ))

    # ──────────────────────────────────────────────────────────────────
    # Stats summary
    # ──────────────────────────────────────────────────────────────────
    result.stats = {
        "test_case_id"           : tc_id,
        "total_employees"        : summary.get("total_employees", 0),
        "employees_routed"       : summary.get("employees_routed", 0),
        "employees_unrouted"     : summary.get("employees_unrouted", 0),
        "total_baseline_cost"    : round(baseline_total, 4),
        "total_optimized_cost"   : round(optimized_total, 4),
        "net_savings"            : round(summary.get("net_savings", 0), 4),
        "savings_pct"            : round(summary.get("savings_percentage", 0), 2),
        "hard_violations"        : len(result.hard_violations),
        "soft_violations"        : len(result.soft_violations),
        "passed"                 : result.passed,
    }

    return result


# ─────────────────────────────────────────────
# Report printers
# ─────────────────────────────────────────────

RESET  = "\033[0m"
RED    = "\033[91m"
YELLOW = "\033[93m"
GREEN  = "\033[92m"
BOLD   = "\033[1m"
CYAN   = "\033[96m"
DIM    = "\033[2m"


def _color(text, code):
    return f"{code}{text}{RESET}"


def print_report(result: EvaluationResult, use_color: bool = True):
    def c(text, code):
        return _color(text, code) if use_color else text

    bar = "=" * 62
    print(f"\n{c(bar, BOLD)}")
    print(c(f"  VELORA CONSTRAINT EVALUATOR — {result.test_case_id}", BOLD))
    print(c(bar, BOLD))

    s = result.stats
    print(f"\n  Employees : {s['employees_routed']}/{s['total_employees']} routed")
    print(f"  Baseline  : Rs.{s['total_baseline_cost']:,.2f}")
    print(f"  Optimized : Rs.{s['total_optimized_cost']:,.2f}")
    print(f"  Savings   : Rs.{s['net_savings']:,.2f}  ({s['savings_pct']:.1f}%)")

    status = c("✓  ALL HARD CONSTRAINTS SATISFIED", GREEN) if result.passed \
             else c(f"✗  {s['hard_violations']} HARD VIOLATION(S) FOUND", RED)
    print(f"\n  Status    : {status}")
    print(f"  Soft flags: {s['soft_violations']}\n")

    # ── Hard violations ───────────────────────────────────────────────
    hard = result.hard_violations
    if hard:
        print(c(f"  {'─'*58}", RED))
        print(c(f"  HARD VIOLATIONS  ({len(hard)} total)", RED + BOLD))
        print(c(f"  {'─'*58}", RED))
        _print_viol_group(hard, use_color, RED)
    else:
        print(c("  ✓  No hard violations.", GREEN))

    # ── Soft violations ───────────────────────────────────────────────
    soft = result.soft_violations
    if soft:
        print(c(f"\n  {'─'*58}", YELLOW))
        print(c(f"  SOFT / WARNING   ({len(soft)} total)", YELLOW + BOLD))
        print(c(f"  {'─'*58}", YELLOW))
        _print_viol_group(soft, use_color, YELLOW)
    else:
        print(c("\n  ✓  No soft warnings.", GREEN))

    print(c(f"\n{bar}\n", BOLD))


def _print_viol_group(viols, use_color, color_code):
    def c(t, code):
        return _color(t, code) if use_color else t

    # Group by constraint_id for readability
    groups: dict[str, list[Violation]] = {}
    for v in viols:
        groups.setdefault(v.constraint_id, []).append(v)

    for cid, items in groups.items():
        name = items[0].constraint_name
        print(c(f"\n  [{cid}] {name}  ({len(items)} instance(s))", color_code + BOLD))
        for v in items:
            loc = f"  Vehicle {v.vehicle_id} Trip#{v.trip_number}" \
                  if v.vehicle_id != "—" else ""
            emp = f"  Employee {v.employee_id}" if v.employee_id != "—" else ""
            print(f"    {'•'} {v.detail}")
            if use_color:
                print(f"      {DIM}{emp}{loc}{RESET}")
            else:
                print(f"      {emp}{loc}")


def print_json_report(result: EvaluationResult):
    out = {
        "stats": result.stats,
        "violations": [
            {
                "constraint_id"  : v.constraint_id,
                "constraint_name": v.constraint_name,
                "severity"       : v.severity,
                "employee_id"    : v.employee_id,
                "vehicle_id"     : v.vehicle_id,
                "trip_number"    : v.trip_number,
                "detail"         : v.detail,
            }
            for v in result.violations
        ],
    }
    print(json.dumps(out, indent=2))


# ─────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: python evaluator.py <output.json> [--json]")
        sys.exit(1)

    output_file = args[0]
    as_json     = "--json" in args

    try:
        with open(output_file, encoding="utf-8") as f:
            output = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: File not found: {output_file}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in {output_file}: {e}")
        sys.exit(1)

    result = evaluate(output)

    if as_json:
        print_json_report(result)
    else:
        # Disable ANSI colors if stdout is redirected
        use_color = sys.stdout.isatty()
        print_report(result, use_color=use_color)

    sys.exit(0 if result.passed else 1)


if __name__ == "__main__":
    main()

export function darkenHex(hex, factor = 0.72) {
  if (typeof hex !== "string" || !hex.startsWith("#") || hex.length !== 7) {
    return "#2f6bb0";
  }

  const r = Math.max(0, Math.floor(parseInt(hex.slice(1, 3), 16) * factor));
  const g = Math.max(0, Math.floor(parseInt(hex.slice(3, 5), 16) * factor));
  const b = Math.max(0, Math.floor(parseInt(hex.slice(5, 7), 16) * factor));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

# Opti26 Backend + Frontend

Velora corporate mobility optimization system with:
- Django backend (`velora.exe` orchestration + result APIs)
- React + Vite frontend (Figma-inspired dashboard/test-cases/new-case flow)

## Project Structure
- `optimizer/` Django app for Excel parsing and optimizer execution
- `frontend/` React + Vite web UI
- `results/` runtime temporary optimizer files (ignored in git)

## Backend APIs
- `POST /api/optimize` upload `.xlsx` and run optimization
- `GET /api/results` list latest saved runs
- `GET /api/results/<id>` get one result with full payload
- `GET /api/results/latest` fetch most recent run

## Run Locally
1. Start backend:
```powershell
cd Opti26_Backend
python manage.py runserver
```

2. Start frontend:
```powershell
cd Opti26_Backend\frontend
npm install
npm run dev
```

3. Open `http://localhost:5173`.

## Notes
- Frontend proxies `/api/*` to Django at `http://127.0.0.1:8000`.
- `velora.exe` must exist in project root (`Opti26_Backend/velora.exe`).
- Only `.xlsx` input files are accepted.

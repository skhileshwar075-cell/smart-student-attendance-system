# SmartAttend — Start / Stop Guide

This project runs in two separate processes:
- Backend API: `server/index.js` (default port 5000)
- Frontend app: Vite dev server in `client/` (default port 5173)

## 1) Start the backend
From the project root:
```bash
cd server
npm run dev
```

If you prefer to run the backend from the root folder:
```bash
npm run dev
```

The backend should start on:
`http://localhost:5000`

## 2) Start the frontend
Open a second terminal:
```bash
cd client
npm run dev
```

The frontend should open at:
`http://localhost:5173`

## 3) Stop a running server
In the terminal where the process is running, press:
- `Ctrl + C`

If PowerShell asks to terminate batch job, type:
- `Y`

Do this separately for the backend and frontend terminals.

## 4) Force-stop a process by port
### Backend (port 5000)
```powershell
$pid = (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)
if ($pid) { Stop-Process -Id $pid -Force } else { Write-Host "No process found on port 5000" }
```

### Frontend (port 5173)
```powershell
$pid = (Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)
if ($pid) { Stop-Process -Id $pid -Force } else { Write-Host "No process found on port 5173" }
```

## 5) Check active ports
```powershell
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
```

## 6) Common issues
- **Backend not reachable**: Confirm `node server/index.js` is running and
  `DATABASE_URL` is configured.
- **Frontend loads but API calls fail**: Confirm frontend proxy is enabled in
  `client/vite.config.js` and backend is running on port 5000.
- **Port already in use**: Use the power shell commands above to find and stop
  the owning process.

## 7) Quick restart
If you make code changes, restart both processes:
1. Stop backend
2. Stop frontend
3. Start backend
4. Start frontend

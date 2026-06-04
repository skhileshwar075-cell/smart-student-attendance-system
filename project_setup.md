# SMART ATTEND — SETUP & CONFIGURATION GUIDE

**Version 3.1 | May 2026**

## 1. Prerequisites
- Node.js 20+
- npm 9+
- PostgreSQL 16+
- Git
- Optional: Android Studio for `android/` native app

## 2. Install dependencies
From the repository root:

```bash
npm install
```

Then install frontend packages:

```bash
cd client && npm install && cd ..
```

If you prefer to install backend packages separately:

```bash
cd server && npm install && cd ..
```

## 3. Database setup
Create the local database:

```bash
psql -U postgres -c "CREATE DATABASE smartattend;"
```

Create `server/.env` from the example:

```powershell
copy server\.env.example server\.env
```

Edit `server/.env` and update the following values:

- `DATABASE_URL=postgresql://username:password@localhost:5432/smartattend`
- `JWT_SECRET=your-strong-secret`
- `SESSION_SECRET=another-strong-secret`
- `PORT=5000`

## 4. Run the backend

```bash
cd server
npm run dev
```

The backend will automatically create missing tables and seed demo data if `admin@smartattend.edu` is not already present.

## 5. Run the frontend

```bash
cd client
npm run dev
```

Open: http://localhost:5173

## 6. Optional production build

```bash
cd client
npm run build
```

The backend can serve `client/dist/` if the static build is present.

## 7. Environment variables summary
- `DATABASE_URL` — required
- `JWT_SECRET` — required for production
- `SESSION_SECRET` — required for production
- `PORT` — optional (default 5000)

## 8. Demo credentials
- Admin:   `admin@smartattend.edu` / `Admin@123`
- Teacher: `priya@smartattend.edu` / `Teacher@123`
- Student: `aarav@smartattend.edu` / `Student@123`

## 9. Production notes
- Verify `server/.env` does not use development-only secrets.
- In production, restrict CORS origins in `server/index.js`.
- Confirm Firebase credentials only if you require FCM.

# Admin App

`admin-app` is the HR monitoring and employee administration interface.

## Responsibilities

- Employee management:
  - list with pagination
  - role and search filters
  - create employee (validated + confirmation modal)
  - update employee (validated + confirmation modal)
- Attendance history for all employees:
  - date range + employee filter
  - pagination and grouped date rows
  - work-hour status badges and legend
- Real-time admin notifications via websocket
- App switch CTA to Employee app with confirmation
- Account menu with avatar and sign-out

## Key Features

- Standardized toast behavior:
  - `error500` (red)
  - `warning` (yellow)
  - `success` (green)
  - `adminNotification` (blue + bell icon)
- Access control UX:
  - non-admin users see Access Denied modal
  - redirected to Auth app chooser without breaking session
- Attendance work-hour classification:
  - `< 9h` less hours
  - `9h to < 10h` normal
  - `>= 10h` overtime
- Attendance time display in 24-hour format

## Tech Stack

- React + TypeScript + Vite
- React Router
- Socket.IO client
- Custom CSS

## Environment Variables

Defined in `.env.development`:

- `VITE_GATEWAY_BASE_URL`
- `VITE_APP_PORT` (default: `7020`)
- `VITE_AUTH_APP_URL`
- `VITE_ADMIN_APP_URL`
- `VITE_EMPLOYEE_APP_URL`
- `VITE_NOTIFICATION_WS_URL`

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:7020`.

## Docker

Build image:

```bash
docker build -t dexa-admin-app:latest ./frontend/admin-app
```

Run container:

```bash
docker run --rm -p 7020:80 dexa-admin-app:latest
```

Notes:

- Nginx serves static assets and handles SPA routing fallback.
- Ensure `.env` values are correct before build because Vite inlines them.

## Notes

- Filters trigger fetch automatically (debounced for text fields).
- Pagination layout follows: `Limit | Page x/y | Prev/Next`.
- Header and navigation styling are aligned with Employee app for visual consistency.

# Employee App

`employee-app` is the user-facing attendance and profile management application.

## Responsibilities

- Show today attendance status (IN/OUT and latest action)
- Clock-in and clock-out actions
- Attendance summary with date range filtering and pagination
- Employee profile page (photo, phone, password update)
- App switch CTA to Admin app (for admin users) with confirmation
- Standardized toast and confirmation-modal UX

## Key Features

- Hybrid token refresh handling for resilient API requests
- Consistent bottom-right toast system:
  - `error500`, `warning`, `success`, `adminNotification`
- Attendance reporting enhancements:
  - Work-hour status badge (`Less hours`, `Normal`, `Overtime`)
  - Legend describing company rule:
    - `< 9h` less hours
    - `9h to < 10h` normal
    - `>= 10h` overtime
  - 24-hour time format in attendance table

## Tech Stack

- React + TypeScript + Vite
- React Router
- Custom CSS

## Environment Variables

Defined in `.env.development`:

- `VITE_GATEWAY_BASE_URL`
- `VITE_APP_PORT` (default: `7010`)
- `VITE_AUTH_API_KEY`
- `VITE_AUTH_APP_URL`
- `VITE_EMPLOYEE_APP_URL`
- `VITE_ADMIN_APP_URL`

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

Open `http://localhost:7010`.

## Docker

Build image:

```bash
docker build -t dexa-employee-app:latest ./frontend/employee-app
```

Run container:

```bash
docker run --rm -p 7010:80 dexa-employee-app:latest
```

Notes:

- Nginx serves static bundle from `dist`.
- SPA fallback is enabled via `nginx.conf`.
- Vite env values are resolved at build time.

## Notes

- Main content layout is full-width shell with centered, readable content containers.
- Profile and password updates use confirmation modals before submitting.

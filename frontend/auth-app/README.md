# Auth App

`auth-app` handles authentication and application entry routing for the platform.

## Responsibilities

- User login with company email and password
- Session bootstrap on app load
- App chooser screen (Employee App / Admin App)
- Logout flow that returns users to the login screen
- Standardized toast feedback (warning, error500, success)

## Tech Stack

- React + TypeScript + Vite
- Custom CSS

## Environment Variables

Defined in `.env.development`:

- `VITE_GATEWAY_BASE_URL`
- `VITE_APP_PORT` (default: `7000`)
- `VITE_AUTH_API_KEY`
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

Open `http://localhost:7000`.

## Docker

Build image:

```bash
docker build -t dexa-auth-app:latest ./frontend/auth-app
```

Run container:

```bash
docker run --rm -p 7000:80 dexa-auth-app:latest
```

Notes:

- Nginx serves the built static files.
- SPA fallback is enabled via `nginx.conf`.
- Vite env values are baked at build time, so provide the correct `.env` before building.

## Notes

- Toasts are positioned at bottom-right for consistency with other apps.
- Login success uses green `success` toast.
- Auth bootstrap logic prioritizes refresh token state to avoid incorrect redirect behavior after logout.

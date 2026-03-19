# Frontend Overview

This folder contains three React applications that work together in a microservice-based attendance platform:

- `auth-app`: login and application switcher
- `employee-app`: employee attendance and profile management
- `admin-app`: HR monitoring, employee management, and global attendance history

All apps are built with:

- React + TypeScript + Vite
- Custom CSS (no external UI framework)
- API integration through the Gateway (`VITE_GATEWAY_BASE_URL`)

---

## Folder Structure

```text
frontend/
  auth-app/
  employee-app/
  admin-app/
```

Each app is an independent Vite project with its own:

- `package.json`
- `.env.development`
- routing, context, and API client utilities

This folder now also includes a workspace runner:

- `frontend/package.json` for centralized run/lint/build commands

---

## Frontend Architecture Summary

### 1) Authentication and Session

- The login flow starts in `auth-app`.
- After successful login, user is redirected to app selection and then to employee/admin app based on role and choice.
- Employee/Admin apps use a hybrid token refresh strategy:
  - proactive refresh when needed
  - reactive refresh on `401`
  - deduplicated refresh calls to avoid request storms

### 2) API Communication

- Frontend apps call the API Gateway.
- API errors are normalized and converted into standardized toast feedback.
- Request wrappers handle refresh and retry behavior.

### 3) UX Patterns Shared Across Apps

- Confirmation modals for sensitive actions (logout, update, create, app switching)
- Standardized toasts:
  - `error500` (danger/red)
  - `warning` (yellow)
  - `success` (green)
  - `adminNotification` (blue + bell icon)
- Toast host position: bottom-right on all apps

### 4) Real-time Notifications

- `admin-app` subscribes to notification websocket events.
- Admin receives blue notification toasts for employee profile/password updates.

### 5) Attendance Reporting UX

- Employee and Admin attendance tables include work-hour classification:
  - `< 9h`: Less hours
  - `>= 9h and < 10h`: Normal
  - `>= 10h`: Overtime
- Visual status badges with color dots and legend are provided in UI.
- Time display uses 24-hour format.

---

## Environment Variables

Commonly used variables across apps:

- `VITE_GATEWAY_BASE_URL`
- `VITE_AUTH_API_KEY` (used by auth/employee flows where needed)
- `VITE_AUTH_APP_URL`
- `VITE_EMPLOYEE_APP_URL`
- `VITE_ADMIN_APP_URL`
- `VITE_NOTIFICATION_WS_URL` (admin websocket)

Check each app's local `.env.development` file for exact values.

---

## Run Instructions

### Option A: Run from frontend root (recommended)

From `frontend/`:

```bash
npm install
```

Available scripts:

- `npm run start:auth` - run Auth app only
- `npm run start:employee` - run Employee app only
- `npm run start:admin` - run Admin app only
- `npm run start:all` - run all three apps in parallel

### Option B: Run each app directly

From each app folder:

```bash
npm install
npm run dev
```

Default ports:

- `auth-app`: `7000`
- `employee-app`: `7010`
- `admin-app`: `7020`

---

## Build and Lint

From `frontend/` root:

```bash
npm run lint:all
npm run build:all
```

Or per app:

```bash
npm run lint
npm run build
```

---

## Docker Images

Dockerfiles are available for all frontend apps:

- `frontend/auth-app/Dockerfile`
- `frontend/employee-app/Dockerfile`
- `frontend/admin-app/Dockerfile`

Build commands from repository root:

```bash
docker build -t dexa-auth-app:latest ./frontend/auth-app
docker build -t dexa-employee-app:latest ./frontend/employee-app
docker build -t dexa-admin-app:latest ./frontend/admin-app
```

Run commands:

```bash
docker run --rm -p 7000:80 dexa-auth-app:latest
docker run --rm -p 7010:80 dexa-employee-app:latest
docker run --rm -p 7020:80 dexa-admin-app:latest
```

Notes:

- Apps are served by Nginx inside the container.
- SPA routing fallback is configured in each app's `nginx.conf`.
- Vite environment variables are inlined at image build time.

---

## Cross-App Behavior Notes

- Sign-out should return users to the Auth login page.
- Employee attempting to access Admin app gets an access-denied modal and is redirected to Auth app selection without breaking session state.
- Navigation/header style is aligned across Employee and Admin apps for consistency.


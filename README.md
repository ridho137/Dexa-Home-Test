# Dexa Home Test

Full-stack WFH attendance platform built with React and NestJS microservices.

This repository delivers:

- employee self-service attendance and profile management
- admin HR employee management and attendance monitoring
- centralized authentication with JWT + session tracking
- real-time admin notifications via WebSocket
- asynchronous event logging via RabbitMQ
- scheduled jobs for session lifecycle and attendance auto clock-out

---

## System Overview

### Frontend Apps

- `frontend/auth-app` — login and application switcher
- `frontend/employee-app` — employee attendance and profile features
- `frontend/admin-app` — admin HR dashboard and monitoring

### Backend Services

- `backend/gateway` — API gateway (routing, token validation, signed internal headers)
- `backend/auth-service` — auth, sessions, token lifecycle, auth gRPC
- `backend/employee-service` — employee profile/admin CRUD, employee gRPC
- `backend/attendance-service` — attendance records, summaries, auto clock-out scheduler
- `backend/notification-service` — RabbitMQ consumer, log storage, admin WebSocket push

---

## Tech Stack

- **Backend**: TypeScript, NestJS, PostgreSQL, gRPC, RabbitMQ, Socket.IO
- **Frontend**: React, TypeScript, Vite
- **Deployment-ready assets**: Dockerfile per backend service and frontend app

---

## Quick Start (Local Dev)

### 1) Start infrastructure

```bash
./docker/run-postgres.sh
./docker/run-rabbitmq.sh
```

### 2) Run backend

```bash
cd backend
npm install
npm run start:all
```

### 3) Run frontend

```bash
cd frontend
npm install
npm run start:all
```

Default app URLs:

- Auth App: `http://localhost:7000`
- Employee App: `http://localhost:7010`
- Admin App: `http://localhost:7020`
- Gateway API: `http://localhost:3000`

---

## Docker

Dockerfiles are available for all components:

- Backend: `backend/*/Dockerfile`
- Frontend: `frontend/*-app/Dockerfile`

Detailed build/run commands are documented in:

- `backend/README.md`
- `frontend/README.md`

---

## Requirement Mapping and Technical Report

To see architecture reasoning and requirement traceability to `brief.md`, read:

- `report.md`

---

## Documentation Map

### Top-Level

- `brief.md` — original assignment brief
- `report.md` — architecture and delivery reasoning report
- `docker/README.md` — infrastructure helper scripts

### Backend Docs

- `backend/README.md`
- `backend/gateway/README.md`
- `backend/auth-service/README.md`
- `backend/employee-service/README.md`
- `backend/attendance-service/README.md`
- `backend/notification-service/README.md`

### Frontend Docs

- `frontend/README.md`
- `frontend/auth-app/README.md`
- `frontend/employee-app/README.md`
- `frontend/admin-app/README.md`

---

## Notes

- Repository is prepared for submission with `node_modules` and `dist` excluded from committed artifacts.
- For production-style deployments, use environment-specific `.env` values and prefer orchestration (Docker Compose/Kubernetes) for service networking.


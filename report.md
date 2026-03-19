# Architecture and Delivery Report

This report explains the implemented full-stack architecture, key technical decisions, and how the final solution answers the requirements in `brief.md`.

---

## 1. Executive Summary

The project is delivered as a microservice-based employee attendance platform with:

- **3 frontend apps**:
  - `auth-app` (authentication and app switch)
  - `employee-app` (employee self-service)
  - `admin-app` (HR monitoring and management)
- **5 backend services**:
  - `gateway`
  - `auth-service`
  - `employee-service`
  - `attendance-service`
  - `notification-service`

Core capabilities implemented:

- Login + token/session management (access + refresh token pattern)
- Employee profile management (photo, phone, password)
- Attendance clock-in / clock-out + summary reporting
- Admin employee CRUD and attendance monitoring
- Real-time admin notifications via WebSocket
- Async event logging via message queue
- Scheduled jobs for session hygiene and attendance auto clock-out

---

## 2. End-to-End Architecture

### 2.1 Frontend Layer

Three independent React + TypeScript + Vite applications are used to separate concerns and user journeys:

- **`auth-app`**: centralized entry point for login and app selection.
- **`employee-app`**: focused UX for employee daily operations.
- **`admin-app`**: focused UX for HR data operations and monitoring.

Why this split:

- Clear ownership per user role and workflow.
- Better security/authorization boundaries on the UI layer.
- Lower coupling and easier evolution of each app.

### 2.2 API Gateway Layer

The `gateway` acts as the single public backend entry point:

- Validates tokens via Auth gRPC.
- Routes requests to downstream services.
- Propagates user context through signed internal headers.

Why gateway:

- Centralized auth enforcement and request routing.
- Prevents direct exposure of all internal services to clients.
- Makes policy changes (auth, headers, CORS, routing) consistent and centralized.

### 2.3 Microservice Layer

- **Auth Service**
  - Login/refresh/logout
  - Session lifecycle and validation
  - gRPC methods used by gateway and internal services
- **Employee Service**
  - Profile and admin employee management
  - Integrates with Auth service for password/user lifecycle
  - Publishes change events to queue
- **Attendance Service**
  - Attendance records and summaries
  - Validates employee context via Employee gRPC
  - Scheduler for auto clock-out on missing OUT records
- **Notification Service**
  - Consumes queue events
  - Stores notification logs in dedicated DB
  - Pushes real-time events to admin clients via Socket.IO

Why microservices:

- Aligns directly with `brief.md` requirement for microservice API architecture.
- Keeps business domains isolated (`auth`, `employee`, `attendance`, `notification`).
- Supports independent scaling and deployment by domain.

### 2.4 Data and Messaging Layer

- **PostgreSQL** used as main datastore (schema-per-service boundary model).
- **RabbitMQ** used for asynchronous event distribution.
- **Socket.IO** used for real-time admin notification delivery.

Why this combination:

- PostgreSQL gives strong transactional reliability for operational data.
- RabbitMQ decouples write path from notification fan-out/logging path.
- Socket.IO provides practical real-time UX for browser clients.

---

## 3. Key Engineering Decisions and Reasoning

### 3.1 Session + Token Strategy

Implemented hybrid access/refresh token handling with server-side sessions.

Reasoning:

- Access token stays short-lived for security.
- Refresh token enables stable UX without frequent re-login.
- Server-side session flags (`is_active`, activity timestamps) allow immediate invalidation and operational controls.

### 3.2 Scheduler Strategy

Implemented cron jobs for operational correctness:

- Auth:
  - `deactivateStaleSessions` (inactive sessions)
  - `deactivateExpiredSessionsOverThreeMonths` (session age policy)
- Attendance:
  - Daily auto OUT generation for previous-day open attendance

Reasoning:

- Reduces manual cleanup burden.
- Protects data quality (especially attendance completeness).
- Enforces lifecycle policy as system behavior, not manual process.

### 3.3 Database Integrity and Indexing

- Added FK for `auth.sessions.user_id -> auth.users.id`.
- Added targeted indexes for:
  - session cleanup filters
  - attendance list/sort and scheduler paths
  - employee filtering and fuzzy search (`pg_trgm`)
  - notification log querying dimensions

Reasoning:

- FK guarantees core auth data consistency.
- Indexes follow actual query patterns to keep read/write costs balanced and predictable.

### 3.4 UX Consistency

Standardized shared UX patterns across frontend apps:

- Toast tones and placement
- Confirmation modal behavior
- Header/navigation consistency
- Access denied handling
- Attendance status visualization with legend and 24-hour format

Reasoning:

- Improves usability and trust.
- Reduces cognitive load across apps.
- Makes behavior predictable for both employee and admin users.

---

## 4. Mapping to `brief.md`

Below is direct traceability from brief requirements to implemented solution.

### 4.1 Mandatory Skills

- **Backend**:
  - TypeScript + NestJS: implemented.
  - PostgreSQL: implemented.
- **Frontend**:
  - React.js: implemented in all 3 apps.

### 4.2 Backend Objectives

- Proper DB structure: implemented with domain schemas and migrations.
- DB connectivity: implemented in each service.
- Microservice APIs: implemented with gateway and service boundaries.
- CRUD via API: implemented for employee and attendance domains.

### 4.3 Frontend Objectives

- Application screens/pages: implemented for auth, employee, admin.
- CSS framework objective: implemented via robust custom CSS system (no third-party CSS framework).
- API consumption: implemented through gateway integration.
- Custom components: implemented (modals, toasts, headers, attendance widgets, etc.).

### 4.4 Use Case 1 — WFH Attendance App

- Employee login via corporate email/password: implemented.
- Profile view + update (photo, phone, password): implemented.
- Attendance IN/OUT: implemented with business rules.
- Summary with default month-to-date and date filters: implemented.
- Additional feature:
  - Admin popup/notification: implemented (Socket.IO + toasts).
  - Stream/message queue logging: implemented (RabbitMQ + notification log DB).

### 4.5 Use Case 2 — Employee Monitoring App (Admin HR)

- Add/update employee: implemented.
- Read-only attendance history: implemented.

---

## 5. Security and Operational Posture

- Centralized auth checks at gateway.
- Internal context header signing between gateway and services.
- Role-based restrictions for admin endpoints.
- Session revocation and scheduled deactivation policies.
- Dockerfiles available for each service and frontend app.

This setup supports both local development and production-style deployment pipelines.

---

## 6. Documentation Links

### Main References

- Brief: `brief.md`
- Backend overview: `backend/README.md`
- Frontend overview: `frontend/README.md`

### Service/App Specific

- `backend/gateway/README.md`
- `backend/auth-service/README.md`
- `backend/employee-service/README.md`
- `backend/attendance-service/README.md`
- `backend/notification-service/README.md`
- `frontend/auth-app/README.md`
- `frontend/employee-app/README.md`
- `frontend/admin-app/README.md`

---

## 7. Final Notes

The delivered architecture prioritizes:

- domain separation,
- operational safety,
- data correctness,
- UX consistency,
- and clear traceability back to the test brief.

The implementation is production-leaning in structure (gateway, asynchronous events, schedulers, dockerization), while remaining practical for local development and evaluation.


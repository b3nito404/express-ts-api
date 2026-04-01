# Express TypeScript REST API

Production-ready REST API built with **TypeScript**, **Express**, **MongoDB**, tested with **Jest**, Dockerized, and integrated into a **Jenkins CI/CD pipeline**.

---

## Architecture

```
├── docker/
│   ├── Dockerfile.dev         # Dev image with hot reload
│   └── mongo-init.js          # MongoDB initialization
├── scripts/
│   ├── seed.ts                # Database seeder
│   └── healthcheck.sh         # Shell health check
├── src/
│   ├── config/                # Centralized configuration
│   ├── controllers/           # Request handlers (thin layer)
│   ├── dtos/                  # Data Transfer Objects & interfaces
│   ├── middlewares/           # Auth, validation, error handling
│   ├── models/                # Mongoose schemas
│   ├── repositories/          # Data access layer
│   ├── routes/                # Route definitions with validation
│   ├── services/              # Business logic layer
│   ├── utils/                 # Logger, API response helpers
│   ├── app.ts                 # Express app setup
│   └── server.ts              # Entry point + graceful shutdown
├── tests/
│   ├── setup.ts               # Jest global setup
│   ├── helpers.ts             # Shared test utilities
│   ├── health.test.ts         # Health endpoint tests
│   └── user.test.ts           # User CRUD + auth tests
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # Dev stack (API + MongoDB + Mongo Express)
├── docker-compose.prod.yml    # Production overrides
├── Jenkinsfile                # CI/CD pipeline (10 stages)
└── jest.config.ts             # Jest + coverage configuration
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript 5 |
| Framework | Express 4 |
| Database | MongoDB 7 + Mongoose 8 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | express-validator |
| Security | Helmet, CORS, express-rate-limit |
| Logging | Winston |
| Testing | Jest + Supertest |
| Container | Docker (multi-stage) + Docker Compose |
| CI/CD | Jenkins declarative pipeline |

---

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB running locally, or use Docker Compose

### Local Development

```bash
# 1. Clone and install
npm ci

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Start MongoDB (if not running)
docker run -d -p 27017:27017 --name mongo mongo:7.0-jammy

# 4. Seed the database (optional)
npx ts-node scripts/seed.ts

# 5. Start dev server (hot reload)
npm run dev
```

API available at `http://localhost:3000/api/v1`

### Docker Compose (recommended)

```bash
# Start full stack (API + MongoDB)
docker-compose up -d

# With Mongo Express UI on port 8081
docker-compose --profile tools up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down
```

### Production

```bash
# Build and start production stack
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or build image manually
docker build -t express-api:latest .
docker run -p 3000:3000 --env-file .env express-api:latest
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Environment |
| `PORT` | `3000` | Server port |
| `API_VERSION` | `v1` | API version prefix |
| `MONGODB_URI` | `mongodb://localhost:27017/api_db` | MongoDB connection string |
| `JWT_SECRET` | — | **Required in production** |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `LOG_LEVEL` | `info` | Winston log level |

---

## API Reference

### Base URL

```
http://localhost:3000/api/v1
```

### Health Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Full health status (DB, memory, system) |
| GET | `/health/live` | None | Liveness probe |
| GET | `/health/ready` | None | Readiness probe |

### User Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/users/register` | None | Register new user |
| POST | `/users/login` | None | Login, returns JWT |
| GET | `/users/me` | Bearer | Get own profile |
| PATCH | `/users/me/password` | Bearer | Change own password |
| GET | `/users` | Admin | List all users (paginated) |
| GET | `/users/:id` | Admin | Get user by ID |
| PATCH | `/users/:id` | Bearer | Update user |
| DELETE | `/users/:id` | Admin | Delete user |

### Example Requests

#### Register
```bash
curl -X POST http://localhost:3000/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com",
    "password": "Password1"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "Password1"}'
```

#### Get Profile
```bash
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer <token>"
```

#### List Users (Admin)
```bash
curl "http://localhost:3000/api/v1/users?page=1&limit=10&search=alice" \
  -H "Authorization: Bearer <admin_token>"
```

### Response Format

All endpoints return a consistent JSON envelope:

```json
{
  "success": true,
  "message": "Users retrieved",
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "msg": "Valid email required" }
  ]
}
```

---

## Testing

```bash
# Run all tests with coverage
npm test

# Watch mode during development
npm run test:watch

# Run specific test file
npx jest tests/user.test.ts
```

Coverage thresholds enforced in CI: **80% lines, 75% functions**.

### Test Structure

- `tests/setup.ts` — Connects to test MongoDB, clears collections between tests
- `tests/helpers.ts` — `createUser()`, `loginUser()`, `authHeader()` utilities
- `tests/health.test.ts` — Health endpoint smoke tests
- `tests/user.test.ts` — Full auth flow + CRUD + RBAC scenarios (25+ cases)

---

## CI/CD Pipeline (Jenkins)

The `Jenkinsfile` defines a **10-stage declarative pipeline**:

| Stage | Description |
|---|---|
| Checkout | Clone repo, compute image tag (`buildNum-gitSHA`) |
| Install | `npm ci` with dependency caching |
| Lint | ESLint — fails fast on errors |
| Build | TypeScript compilation |
| Test | Jest with ephemeral MongoDB container, publishes coverage |
| Security Audit | `npm audit --audit-level=high` |
| Docker Build | Multi-stage production image |
| Docker Push | Push to registry (main + develop only) |
| Deploy Staging | Auto-deploy to staging on `develop` branch |
| Deploy Production | Manual approval gate → deploy to production on `main` |

### Required Jenkins Credentials

| ID | Type | Description |
|---|---|---|
| `docker-registry-url` | Secret text | Registry hostname |
| `docker-registry-credentials` | Username/password | Registry login |
| `deploy-ssh-key` | SSH key | Deploy server access |

---

## Project Patterns

**Layered architecture:** Routes → Controllers → Services → Repositories → Models. Each layer has a single responsibility.

**Error handling:** `AppError` class carries HTTP status codes. Global `errorHandler` middleware catches all errors including Mongoose and MongoDB driver errors.

**Security:** Passwords hashed with bcrypt (12 rounds). JWT authentication. Role-based access control (`admin` / `user`). Helmet headers, CORS, and rate limiting applied globally.

**Graceful shutdown:** SIGTERM/SIGINT close the HTTP server and MongoDB connection cleanly before exit.

---

## Seed Data

After running `npx ts-node scripts/seed.ts`:

| Email | Password | Role |
|---|---|---|
| admin@example.com | Admin@1234 | admin |
| user@example.com | User@1234 | user |
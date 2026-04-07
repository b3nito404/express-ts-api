# express-jenkins-starter

![npm](https://img.shields.io/npm/v/express-jenkins-starter?style=flat-square&color=CB3837)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)
![Jenkins](https://img.shields.io/badge/Jenkins-CI%2FCD-D24939?style=flat-square&logo=jenkins&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-tested-C21325?style=flat-square&logo=jest&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

Production-ready REST API in **TypeScript** with **Express**, tested, **Dockerized**, and integrated into a CI/CD pipeline with **Jenkins**.
---

## Features

- JWT authentication + role-based access control (`admin` / `user`)
- Layered architecture : Routes -> Controllers -> Services -> Repositories -> Models
- Dockerized with multi-stage build + Docker Compose
- 10-stage Jenkins declarative pipeline with manual approval gate
- Jest test suite 25+ cases, 80% coverage enforced in CI
- Helmet, CORS, rate limiting, bcrypt (12 rounds)
- Graceful shutdown on SIGTERM/SIGINT
- Consistent JSON envelope on all responses

---

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB locally or via Docker

```bash
# Install
npm ci

# Configure
cp .env.example .env

# Start MongoDB (if not running)
docker run -d -p 27017:27017 --name mongo mongo:7.0-jammy

# Seed (optional)
npx ts-node scripts/seed.ts

# Dev server (hot reload)
npm run dev
```

API -> `http://localhost:3000/api/v1`

### Docker Compose

```bash
# Full stack (API + MongoDB)
docker-compose up -d

# With Mongo Express UI (port 8081)
docker-compose --profile tools up -d

# Logs
docker-compose logs -f api

# Stop
docker-compose down
```

### Production

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or manually
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

Base URL: `http://localhost:3000/api/v1`

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Full status (DB, memory, system) |
| GET | `/health/live` | None | Liveness probe |
| GET | `/health/ready` | None | Readiness probe |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/users/register` | None | Register |
| POST | `/users/login` | None | Login -> JWT |
| GET | `/users/me` | Bearer | Own profile |
| PATCH | `/users/me/password` | Bearer | Change password |
| GET | `/users` | Admin | List all (paginated) |
| GET | `/users/:id` | Admin | Get by ID |
| PATCH | `/users/:id` | Bearer | Update |
| DELETE | `/users/:id` | Admin | Delete |

### Examples

```bash
# Register
curl -X POST http://localhost:3000/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"Password1"}'

# Login
curl -X POST http://localhost:3000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Password1"}'

# Profile
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer <token>"

# List users (admin)
curl "http://localhost:3000/api/v1/users?page=1&limit=10&search=alice" \
  -H "Authorization: Bearer <admin_token>"
```

### Response Format

```json
{
  "success": true,
  "message": "Users retrieved",
  "data": [],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "msg": "Valid email required" }]
}
```

---

## Testing

```bash
npm test                          # All tests + coverage
npm run test:watch                # Watch mode
npx jest tests/user.test.ts       # Single file
```

Coverage enforced in CI: **80% lines / 75% functions**

| File | Description |
|---|---|
| `tests/setup.ts` | MongoDB test connection + collection cleanup |
| `tests/helpers.ts` | `createUser()`, `loginUser()`, `authHeader()` |
| `tests/health.test.ts` | Health endpoint smoke tests |
| `tests/user.test.ts` | Full auth, CRUD, RBAC  25+ cases |

---

## CI/CD — Jenkins Pipeline

10-stage declarative pipeline defined in `Jenkinsfile`:

| Stage | Description |
|---|---|
| Checkout | Clone + compute image tag (`buildNum-gitSHA`) |
| Install | `npm ci` with dependency cache |
| Lint | ESLint  fails fast |
| Build | TypeScript compilation |
| Test | Jest + ephemeral MongoDB + coverage report |
| Security Audit | `npm audit --audit-level=high` |
| Docker Build | Multi-stage production image |
| Docker Push | Push to registry (`main` + `develop` only) |
| Deploy Staging | Auto-deploy on `develop` |
| Deploy Production | Manual approval gate -> `main` |

### Required Jenkins Credentials

| ID | Type | Description |
|---|---|---|
| `docker-registry-url` | Secret text | Registry hostname |
| `docker-registry-credentials` | Username/password | Registry login |
| `deploy-ssh-key` | SSH key | Deploy server access |

---

## Architecture

src/
├── config/         # Env, DB connection
├── middleware/     # Auth, error handler, rate limit
├── modules/
│   └── users/
│       ├── user.model.ts
│       ├── user.repository.ts
│       ├── user.service.ts
│       ├── user.controller.ts
│       └── user.routes.ts
├── utils/          # AppError, logger, response helpers
└── app.ts

**Error handling:** `AppError` carries HTTP status. Global `errorHandler` catches all errors including Mongoose/MongoDB driver errors.

---

## Seed Data

```bash
npx ts-node scripts/seed.ts
```

| Email | Password | Role |
|---|---|---|
| admin@example.com | Admin@1234 | admin |
| user@example.com | User@1234 | user |

---

## License

[MIT](./LICENSE)
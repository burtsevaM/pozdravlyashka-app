# Pozdravlyashka

«Поздравляшка» - MVP-приложение для командных поздравлений: база участников, история подарков, идеи, голосования, сборы и напоминания.

## Stack

- Frontend: Angular, TypeScript, Angular Material, SCSS, PWA
- Backend: NestJS, TypeScript, Prisma
- Database: PostgreSQL
- Email: Nodemailer, Mailpit for local demo mode
- Import: exceljs
- Run: Docker Compose

## Structure

```text
frontend/          Angular application
backend/           NestJS API
docs/              short project documentation
docker-compose.yml PostgreSQL and Mailpit
```

## Quick Start

```bash
docker compose up -d
```

```bash
cp backend/.env.example backend/.env
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

```bash
cd frontend
npm install
npm start
```

API health check: `GET http://localhost:3000/api/health`.
Database health check: `GET http://localhost:3000/api/health/db`.

Auth endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Backend `.env` must contain `DATABASE_URL`, `JWT_SECRET` and `JWT_EXPIRES_IN`.

## Docs

- [Project overview](docs/project-overview.md)
- [Technical solution](docs/technical-solution.md)

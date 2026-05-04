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
cp backend/.env.example backend/.env
cd backend
npm install
npx prisma generate
npm run start:dev
```

```bash
cd frontend
npm install
npm start
```

API health check: `GET http://localhost:3000/api/health`.

## Docs

- [Project overview](docs/project-overview.md)
- [Technical solution](docs/technical-solution.md)

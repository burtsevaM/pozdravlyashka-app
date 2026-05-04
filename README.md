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
docker compose up -d postgres
```

```bash
cd backend
cp .env.example .env
npm install
npx prisma validate
npx prisma migrate dev
npx prisma generate
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

Teams endpoints:

- `POST /api/teams`
- `GET /api/teams`
- `GET /api/teams/:teamId`

People endpoints:

- `POST /api/teams/:teamId/people`
- `GET /api/teams/:teamId/people`
- `GET /api/teams/:teamId/people/:personId`
- `PATCH /api/teams/:teamId/people/:personId`
- `PATCH /api/teams/:teamId/people/:personId/archive`
- `GET /api/teams/:teamId/people/upcoming-birthdays?days=30`

Import endpoints:

- `POST /api/teams/:teamId/imports/people/preview`
- `POST /api/teams/:teamId/imports/people/commit`

Backend `.env` must contain `DATABASE_URL`, `JWT_SECRET` and `JWT_EXPIRES_IN`.
Useful Prisma scripts: `npm run prisma:validate`, `npm run prisma:migrate`,
`npm run prisma:generate`, `npm run prisma:studio`.

## MVP Teams And People

Implemented in this stage:

- user teams with membership-based access;
- manual people management inside a team;
- archived people hidden from active lists;
- upcoming birthdays for the active team on dashboard.

Manual check:

1. Run PostgreSQL with `docker compose up -d postgres`.
2. Start backend and frontend.
3. Register or log in.
4. Create a team on dashboard.
5. Add a person on `/people`.
6. Edit and archive the person.
7. Check that dashboard shows upcoming birthdays for the active team.

## Excel Import MVP

The `/import` page imports people into the active team from a fixed `.xlsx`
template. The file must be up to 5 MB. The first row must contain headers.

Expected columns:

| ФИО | Дата рождения | Email | Группа/отдел | Прошлый подарок | Год подарка | Комментарий |
|---|---|---|---|---|---|---|
| Иванова Анна | 15.05.2005 | anna@example.com | Группа 102-43 | Сертификат Ozon | 2025 | Подарок от группы |

Rules:

- required columns: `ФИО`, `Дата рождения`;
- supported birth date formats: Excel date, `DD.MM.YYYY`, `YYYY-MM-DD`;
- `Email`, `Группа/отдел`, `Прошлый подарок`, `Год подарка`, `Комментарий` are optional;
- if email is filled, it must be valid;
- if gift year is filled, it must be a number;
- empty rows are ignored;
- duplicate people by full name and birth date are skipped.

Manual import check:

1. Run PostgreSQL, backend and frontend.
2. Register or log in.
3. Create or select a team on dashboard.
4. Open `/import`, choose a valid `.xlsx` file and click `Проверить файл`.
5. Confirm valid and invalid rows are shown in preview.
6. Click `Сохранить валидные строки`.
7. Open `/people` and confirm imported people are listed.
8. Open dashboard and confirm upcoming birthdays appear when dates are within 30 days.
9. Check `GiftHistory` in the database for rows with previous gifts.

## Docs

- [Project overview](docs/project-overview.md)
- [Technical solution](docs/technical-solution.md)

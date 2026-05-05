# Technical Solution

## Stack

- Angular, TypeScript, Angular Material, SCSS, PWA for frontend.
- NestJS and TypeScript for backend API.
- PostgreSQL and Prisma for data storage.
- Nodemailer for email.
- exceljs for Excel import.
- Docker Compose for local PostgreSQL and Mailpit.

## Choices

Angular подходит для аккуратного MVP с роутингом, строгим TypeScript, готовыми UI-компонентами и PWA. NestJS дает понятную модульную структуру API. PostgreSQL хорошо подходит для связанной бизнес-модели, а Prisma упрощает миграции и типизированный доступ к данным.

PWA нужна, чтобы приложение было удобно открыть на телефоне и использовать как внутренний инструмент команды. SMTP Mail.ru и Яндекс Почты можно поддержать через универсальные переменные `.env`: host, port, secure, user, password и from.

Для реальной отправки email:

- Mail.ru: `smtp.mail.ru`, порт `465`, `EMAIL_SECURE=true`;
- Яндекс Почта: `smtp.yandex.ru`, порт `465`, `EMAIL_SECURE=true`;
- использовать пароль приложения, а не обычный пароль от почты.

## Requirements

- Node.js
- npm
- Docker Desktop
- Git

## Local Run

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

## Prisma

```bash
cd backend
cp .env.example .env
npx prisma validate
npx prisma generate
npx prisma migrate dev
```

PostgreSQL starts from `docker-compose.yml`. Local `DATABASE_URL` is documented in
`backend/.env.example`.

Database health check:

- `GET http://localhost:3000/api/health`
- `GET http://localhost:3000/api/health/db`

## Authorization

Required backend variables:

```env
JWT_SECRET=change-me-in-local-env
JWT_EXPIRES_IN=1d
```

Available endpoints:

- `POST /api/auth/register` - creates a user and returns `accessToken`.
- `POST /api/auth/login` - checks email and password and returns `accessToken`.
- `GET /api/auth/me` - returns current user by bearer token.

## Teams And People MVP

This stage adds protected team and people management. A user can create a team,
become its owner, switch the active team in frontend and manage people attached
to that team. `Person` records are not system users.

Protected team endpoints:

- `POST /api/teams` - create team and current user's `TeamMember`.
- `GET /api/teams` - list teams where current user is a member.
- `GET /api/teams/:teamId` - get one accessible team with current user's role.

Protected people endpoints:

- `POST /api/teams/:teamId/people` - manually add an active person.
- `GET /api/teams/:teamId/people` - list active people, with `includeArchived=true`.
- `GET /api/teams/:teamId/people/:personId` - get full person card with gift history and related celebration events.
- `PATCH /api/teams/:teamId/people/:personId` - update passed person fields.
- `PATCH /api/teams/:teamId/people/:personId/archive` - set `ARCHIVED` status.
- `GET /api/teams/:teamId/people/upcoming-birthdays?days=30` - active birthdays.

Protected gift history endpoints:

- `GET /api/teams/:teamId/people/:personId/gift-history` - list one person's gifts.
- `POST /api/teams/:teamId/people/:personId/gift-history` - add a gift history record.
- `PATCH /api/teams/:teamId/people/:personId/gift-history/:giftHistoryId` - update a record that belongs to the person.
- `DELETE /api/teams/:teamId/people/:personId/gift-history/:giftHistoryId` - delete a record that belongs to the person.

Protected celebration event endpoints:

- `GET /api/teams/:teamId/events` - list team initiatives, with optional `status` and `personId`.
- `POST /api/teams/:teamId/events` - create an initiative for a team person.
- `GET /api/teams/:teamId/events/:eventId` - get one team initiative.
- `PATCH /api/teams/:teamId/events/:eventId` - update date or budget.
- `PATCH /api/teams/:teamId/events/:eventId/status` - update status.

The current Prisma schema already has the required `GiftHistory`,
`CelebrationEvent` and `EventStatus` fields, so this stage does not add a new
migration.

Manual check:

1. Run `docker compose up -d postgres`.
2. Start backend with `npm run start:dev` in `backend`.
3. Start frontend with `npm start` in `frontend`.
4. Register or log in.
5. Create a team, add a person, edit and archive the person.
6. Open the person card, add/edit/delete a gift history record.
7. Create a celebration initiative from the person card.
8. Open `/events`, open the initiative, edit date/budget and change status.
9. Refresh the page and confirm the saved data remains.
10. Confirm archived people are hidden and dashboard shows upcoming birthdays.

## Excel Import Format

The MVP supports one fixed `.xlsx` template on `/import`. The backend parses
the first worksheet from memory, validates rows, returns preview and saves only
valid rows after user confirmation.

Expected columns:

| ФИО | Дата рождения | Email | Группа/отдел | Прошлый подарок | Год подарка | Комментарий |
|---|---|---|---|---|---|---|
| Иванова Анна | 15.05.2005 | anna@example.com | Группа 102-43 | Сертификат Ozon | 2025 | Подарок от группы |

Protected import endpoints:

- `POST /api/teams/:teamId/imports/people/preview` - upload `.xlsx`, validate rows and return preview without database writes.
- `POST /api/teams/:teamId/imports/people/commit` - save valid preview rows as `Person` and optional `GiftHistory`.

Import rules:

- JWT is required and the user must be a member of the team from URL.
- Maximum file size is 5 MB.
- Required columns are `ФИО` and `Дата рождения`.
- Birth date supports Excel date, `DD.MM.YYYY` and `YYYY-MM-DD`.
- Empty rows are ignored.
- Rows without full name or birth date are invalid.
- Email is optional, but validated when present.
- Gift year is optional, but must be numeric when present.
- Previous gift creates `GiftHistory`; empty gift name does not.
- Duplicate people by full name and birth date are skipped.

Manual check:

1. Start PostgreSQL, backend and frontend.
2. Register or log in.
3. Create or select a team.
4. Open `/import`, choose `.xlsx`, click `Проверить файл`.
5. Check preview statistics and row errors.
6. Click `Сохранить валидные строки`.
7. Confirm people appear on `/people`.
8. Confirm dashboard shows upcoming birthdays for imported people.
9. Confirm previous gifts are written to `GiftHistory`.

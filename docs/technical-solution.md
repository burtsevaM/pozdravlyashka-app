# Technical Solution

## Stack

- Angular, TypeScript, Angular Material, SCSS, PWA for frontend.
- NestJS and TypeScript for backend API.
- PostgreSQL and Prisma for data storage.
- Nodemailer for email.
- exceljs for future Excel import.
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
- `GET /api/teams/:teamId/people/:personId` - get one team person.
- `PATCH /api/teams/:teamId/people/:personId` - update passed person fields.
- `PATCH /api/teams/:teamId/people/:personId/archive` - set `ARCHIVED` status.
- `GET /api/teams/:teamId/people/upcoming-birthdays?days=30` - active birthdays.

Manual check:

1. Run `docker compose up -d postgres`.
2. Start backend with `npm run start:dev` in `backend`.
3. Start frontend with `npm start` in `frontend`.
4. Register or log in.
5. Create a team, add a person, edit and archive the person.
6. Confirm archived people are hidden and dashboard shows upcoming birthdays.

## Future Excel Format

```text
ФИО | Дата рождения | Email | Группа/отдел | Прошлый подарок | Год подарка | Комментарий
```

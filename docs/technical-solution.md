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
docker compose up -d
```

```bash
cd backend
cp .env.example .env
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

## Prisma

```bash
cd backend
cp .env.example .env
npx prisma generate
npx prisma migrate dev
```

PostgreSQL starts from `docker-compose.yml`. Local `DATABASE_URL` is documented in
`backend/.env.example`.

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

## Future Excel Format

```text
ФИО | Дата рождения | Email | Группа/отдел | Прошлый подарок | Год подарка | Комментарий
```

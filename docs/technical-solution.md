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
docker compose up -d postgres mailpit
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

Mailpit UI:

- `http://localhost:8025`

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
- `PATCH /api/auth/profile` - updates only the current user's profile name.

## Teams And People MVP

This stage adds protected team and people management. A user can create a team,
become its owner, switch the active team in frontend and manage people attached
to that team. `Person` records are not system users.

Protected team endpoints:

- `POST /api/teams` - create team and current user's `TeamMember`.
- `GET /api/teams` - list teams where current user is a member.
- `GET /api/teams/:teamId` - get one accessible team with current user's role.
- `PATCH /api/teams/:teamId` - update team name for OWNER/ADMIN members.
- `GET /api/teams/:teamId/members` - list team users for contribution and role assignment forms.

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
- `GET /api/teams/:teamId/events/:eventId/gift-ideas` - list gift ideas with vote counts and current user's vote.
- `POST /api/teams/:teamId/events/:eventId/gift-ideas` - create a gift idea for the initiative.
- `PATCH /api/teams/:teamId/events/:eventId/gift-ideas/:ideaId` - update title, description, price or link.
- `DELETE /api/teams/:teamId/events/:eventId/gift-ideas/:ideaId` - delete a non-selected gift idea.
- `POST /api/teams/:teamId/events/:eventId/gift-ideas/:ideaId/vote` - vote for one idea in the initiative.
- `DELETE /api/teams/:teamId/events/:eventId/vote` - remove current user's vote in the initiative.
- `PATCH /api/teams/:teamId/events/:eventId/selected-gift` - store the final gift idea on the initiative.
- `DELETE /api/teams/:teamId/events/:eventId/selected-gift` - clear the final gift selection.
- `GET /api/teams/:teamId/events/:eventId/contributions` - list contributions and calculated collection summary.
- `POST /api/teams/:teamId/events/:eventId/contributions` - add one team member to the collection.
- `PATCH /api/teams/:teamId/events/:eventId/contributions/:contributionId` - update amount, status or comment.
- `PATCH /api/teams/:teamId/events/:eventId/contributions/:contributionId/status` - update only contribution status.
- `DELETE /api/teams/:teamId/events/:eventId/contributions/:contributionId` - delete a contribution record.
- `PATCH /api/teams/:teamId/events/:eventId/deputy` - assign or clear initiative deputy.
- `DELETE /api/teams/:teamId/events/:eventId/deputy` - clear initiative deputy.
- `POST /api/teams/:teamId/events/:eventId/delegations` - transfer initiative organizer rights and create history.
- `GET /api/teams/:teamId/events/:eventId/delegations` - list organizer transfer history.

Gift ideas and votes are persisted with Prisma. `Vote.eventId` plus a unique
`eventId/userId` index enforces one active vote per user in one initiative.
`CelebrationEvent.selectedGiftIdeaId` stores the final gift. Deleting a selected
gift idea is blocked with a conflict error.

The `/events` page is an overview of celebration initiatives. Each initiative
card shows the person, department, event date, status, budget, organizer and a
gift summary: number of ideas, number of votes, current voting leader or final
gift. Initiative details open in a centered Material dialog with the person
card, gift history and related initiatives. Gift ideas, voting, editing and
final gift selection are handled in a separate Material dialog; when it closes,
the initiative card is refreshed from the updated backend response.

Money collection, deputy assignment and organizer transfer are managed inside
the initiative details dialog. Contributions are unique per `eventId/userId`
and use `ContributionStatus`. The backend checks that the selected user belongs
to the team, that the event belongs to the URL team and that only the organizer,
deputy or team OWNER/ADMIN can change collection, deputy or delegation data.
Regular team members can view initiatives, gift ideas and contribution summary.
When the birthday person's email matches organizer email, event responses
include `organizerIsBirthdayPerson` so the frontend can recommend assigning a
deputy without changing organizer automatically.

## Notifications And Email Reminders

Notifications are stored in PostgreSQL in `Notification`. The MVP uses the
existing channels `APP` and `EMAIL`, plus `readAt` for read state,
`reminderOffsetDays` for reminder thresholds and `errorMessage` for failed SMTP
delivery. A unique database index prevents duplicates for one
`eventId/userId/channel/type/reminderOffsetDays` combination.

Protected notification endpoints:

- `GET /api/notifications` - current user's notifications, with optional `unreadOnly`, `limit` and `channel`.
- `GET /api/notifications/unread-count` - current unread count.
- `PATCH /api/notifications/:notificationId/read` - mark one own notification read.
- `PATCH /api/notifications/read-all` - mark all own notifications read.
- `DELETE /api/notifications/:notificationId` - delete one own notification.
- `POST /api/reminders/run` - manually run reminder generation for teams where the current user is a member.

The daily scheduler runs event reminders at 09:00 server time with
`@nestjs/schedule`. The manual endpoint is kept for demo and QA. Reminder
thresholds are 14, 7, 3, 1 and 0 days before an active celebration initiative.
Recipients are the organizer and deputy; if the organizer is the birthday
person and a deputy exists, the deputy is notified first. If no deputy exists,
the organizer receives a message asking to appoint one.

Email is sent by Nodemailer. `EMAIL_MODE=dev` sends to Mailpit on localhost
SMTP port `1025`; `EMAIL_MODE=smtp` uses `EMAIL_HOST`, `EMAIL_PORT`,
`EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD` and `EMAIL_FROM`. Mail.ru uses
`smtp.mail.ru:465`, Yandex uses `smtp.yandex.ru:465`, both with app passwords.

Manual check:

1. Run `docker compose up -d postgres mailpit`.
2. Start backend and frontend.
3. Log in.
4. Create a team, person and celebration initiative dated in 1/3/7/14 days.
5. Open `/reminders` and click `Проверить напоминания`.
6. Confirm the in-app notification, unread count and Mailpit email.
7. Mark notifications read, delete one and rerun reminders to confirm duplicates are skipped.

Manual check:

1. Run `docker compose up -d postgres`.
2. Start backend with `npm run start:dev` in `backend`.
3. Start frontend with `npm start` in `frontend`.
4. Register or log in.
5. Create a team, add a person, edit and archive the person.
6. Open the person card, add/edit/delete a gift history record.
7. Create a celebration initiative from the person card.
8. Open `/events` and confirm there is no permanent right details panel.
9. Confirm the initiative card shows gift ideas, votes, leader or final gift.
10. Open initiative details from the card and check the dialog content.
11. Open gift ideas from the card and add two gift ideas.
12. Vote for the first idea, then vote for the second and confirm the vote moved.
13. Select the second idea as final gift and close the dialog.
14. Confirm the initiative card shows the selected final gift.
15. Refresh the page and confirm the saved data remains.
16. Try to delete the final gift and confirm the conflict message is shown.
17. Confirm archived people are hidden and dashboard shows upcoming birthdays.
18. Add a contribution, mark it paid, edit amount and delete it.
19. Assign a deputy, refresh and confirm the deputy remains.
20. Transfer organizer rights, confirm history is shown and refresh again.

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
- `GET /api/teams/:teamId/imports/people/template` - download `people-import-template.xlsx` with fixed headers and fictional examples.

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

## Settings MVP

The `/settings` frontend page is a protected Angular page with five cards:
profile, active team, notifications, email reminders and Excel import. Profile
and active team forms save through backend endpoints and update frontend
signals so the header and dashboard reflect the latest values after refresh.

Notification settings are stored in the new Prisma model
`UserNotificationSettings`. `GET /api/settings/notifications` creates default
settings when missing, and `PATCH /api/settings/notifications` updates only the
current user's row. `RemindersService` checks the saved channel switches and
14/7/3/1/0 day flags before creating in-app or email reminder notifications.

`GET /api/settings/email-status` returns only non-secret SMTP status:
`mode`, `host`, `port`, `secure`, `from` and the Mailpit UI URL in dev mode.
`EMAIL_PASSWORD` and SMTP credentials are never returned to frontend. Default
organizer and deputy remain informational because the existing business model
assigns them on each celebration initiative.

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

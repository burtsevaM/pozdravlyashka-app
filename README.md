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

API health check: `GET http://localhost:3000/api/health`.
Database health check: `GET http://localhost:3000/api/health/db`.
Mailpit UI for dev email: `http://localhost:8025`.

Auth endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/profile`

Teams endpoints:

- `POST /api/teams`
- `GET /api/teams`
- `GET /api/teams/:teamId`
- `PATCH /api/teams/:teamId`
- `GET /api/teams/:teamId/members`

People endpoints:

- `POST /api/teams/:teamId/people`
- `GET /api/teams/:teamId/people`
- `GET /api/teams/:teamId/people/:personId` - full person card with gift history and related celebration initiatives
- `PATCH /api/teams/:teamId/people/:personId`
- `PATCH /api/teams/:teamId/people/:personId/archive`
- `GET /api/teams/:teamId/people/upcoming-birthdays?days=30`

Gift history endpoints:

- `GET /api/teams/:teamId/people/:personId/gift-history`
- `POST /api/teams/:teamId/people/:personId/gift-history`
- `PATCH /api/teams/:teamId/people/:personId/gift-history/:giftHistoryId`
- `DELETE /api/teams/:teamId/people/:personId/gift-history/:giftHistoryId`

Celebration event endpoints:

- `GET /api/teams/:teamId/events?status=PLANNED&personId=:personId`
- `POST /api/teams/:teamId/events`
- `GET /api/teams/:teamId/events/:eventId`
- `PATCH /api/teams/:teamId/events/:eventId`
- `PATCH /api/teams/:teamId/events/:eventId/status`
- `GET /api/teams/:teamId/events/:eventId/gift-ideas`
- `POST /api/teams/:teamId/events/:eventId/gift-ideas`
- `PATCH /api/teams/:teamId/events/:eventId/gift-ideas/:ideaId`
- `DELETE /api/teams/:teamId/events/:eventId/gift-ideas/:ideaId`
- `POST /api/teams/:teamId/events/:eventId/gift-ideas/:ideaId/vote`
- `DELETE /api/teams/:teamId/events/:eventId/vote`
- `PATCH /api/teams/:teamId/events/:eventId/selected-gift`
- `DELETE /api/teams/:teamId/events/:eventId/selected-gift`
- `GET /api/teams/:teamId/events/:eventId/contributions`
- `POST /api/teams/:teamId/events/:eventId/contributions`
- `PATCH /api/teams/:teamId/events/:eventId/contributions/:contributionId`
- `PATCH /api/teams/:teamId/events/:eventId/contributions/:contributionId/status`
- `DELETE /api/teams/:teamId/events/:eventId/contributions/:contributionId`
- `PATCH /api/teams/:teamId/events/:eventId/deputy`
- `DELETE /api/teams/:teamId/events/:eventId/deputy`
- `POST /api/teams/:teamId/events/:eventId/delegations`
- `GET /api/teams/:teamId/events/:eventId/delegations`

Import endpoints:

- `POST /api/teams/:teamId/imports/people/preview`
- `POST /api/teams/:teamId/imports/people/commit`
- `GET /api/teams/:teamId/imports/people/template`

Settings endpoints:

- `GET /api/settings/notifications`
- `PATCH /api/settings/notifications`
- `GET /api/settings/email-status`

Notifications endpoints:

- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/:notificationId/read`
- `PATCH /api/notifications/read-all`
- `DELETE /api/notifications/:notificationId`
- `POST /api/reminders/run`

Backend `.env` must contain `DATABASE_URL`, `JWT_SECRET` and `JWT_EXPIRES_IN`.
Email reminders use Nodemailer. In dev mode Mailpit receives messages on SMTP
port `1025` and exposes UI on `http://localhost:8025`. Real sending is enabled
with `EMAIL_MODE=smtp` and SMTP variables in `backend/.env`; Mail.ru and Yandex
must use app passwords.

## Settings MVP

The `/settings` page contains real MVP settings instead of a placeholder:

- profile name and birth date can be edited through `PATCH /api/auth/profile`;
- the active team name can be edited by OWNER/ADMIN through `PATCH /api/teams/:teamId`;
- notification channels and reminder days are saved in `UserNotificationSettings`;
- reminder generation respects disabled in-app/email channels and disabled day offsets;
- email status shows `mode`, `host`, `port`, `secure`, `from` and Mailpit URL without returning SMTP password or other secrets;
- Excel import template is downloaded as `people-import-template.xlsx` from the protected team import endpoint.

Default organizer and deputy are informational in settings: they are assigned
inside a concrete celebration initiative.
Useful Prisma scripts: `npm run prisma:validate`, `npm run prisma:migrate`,
`npm run prisma:generate`, `npm run prisma:studio`.

## Celebration Event Occasions

Инициативы поздравлений теперь хранят повод события. По умолчанию используется
«День рождения», поэтому основной сценарий дней рождения остается главным и не
ломается. Дополнительно поддерживаются: «Корпоратив», «Профессиональный
праздник», «Юбилей», «Проводы», «Поддержка» и «Другое». Это позволяет вести
разные коллективные события без превращения приложения в универсальный
календарь.

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
- `GiftHistory` is created only when `Прошлый подарок` is filled;
- imported gift history is shown in each person's card on `/people`;
- empty rows are ignored;
- duplicate people by full name and birth date are skipped.

Manual import check:

1. Run PostgreSQL, backend and frontend.
2. Register or log in.
3. Create or select a team on dashboard.
4. Open `/import`, choose a valid `.xlsx` file and click `Проверить файл`.
5. Confirm valid and invalid rows are shown in preview.
6. Click `Сохранить валидные строки`.
7. Open `/people` and confirm imported people and their gift history are listed.
8. Open dashboard and confirm upcoming birthdays appear when dates are within 30 days.
9. Check `GiftHistory` in the database for rows with previous gifts.

## Person Card, Gift History And Events MVP

Implemented in this stage:

- `/people/:personId` opens a real person card from backend and PostgreSQL;
- gift history can be viewed, added, edited and deleted manually;
- `/events` shows real celebration initiatives for the active team;
- an initiative can be created for a person, opened, edited and moved through statuses;
- all new endpoints require JWT and check that the user belongs to the team from URL.

Manual check:

1. Log in to the application.
2. Create or select a team.
3. Add or import a person.
4. Open the person's card from `/people`.
5. Add a gift history record.
6. Create a celebration initiative from the person card.
7. Open `/events` and confirm the initiative is listed.
8. Change the initiative status.
9. Refresh the page and confirm gift history and status are still saved.

## Gift Ideas, Voting And Final Gift MVP

Implemented in this stage:

- gift ideas are stored in PostgreSQL for a concrete celebration initiative;
- team members can add, edit and delete gift ideas on `/events`;
- each user has one vote per initiative, and voting for another idea replaces the previous vote;
- a team member can select one idea as the final gift, which is stored on the initiative;
- selected final gifts are returned in event lists and person cards.

Manual check:

1. Log in to the application.
2. Create or select a team.
3. Create a person.
4. Create a celebration initiative.
5. Open the initiative on `/events`.
6. Add several gift ideas.
7. Vote for one idea.
8. Vote for another idea and confirm the vote moved.
9. Select the final gift.
10. Refresh the page and confirm votes and final gift remain.
11. Try to delete the final gift and confirm the app shows an error.

## Contributions, Deputy And Delegation MVP

Implemented in this stage:

- money collection is stored in PostgreSQL as `Contribution` records for a concrete celebration initiative;
- contribution status and summary are calculated from real database data;
- an initiative can have a saved deputy organizer;
- organizer rights can be transferred to another team member and saved in `Delegation` history;
- collection management is allowed for the organizer, deputy, OWNER or ADMIN;
- deputy assignment and organizer transfer are allowed only for the organizer, OWNER or ADMIN.

Manual check:

1. Log in to the application.
2. Create or select a team.
3. Create a celebration initiative.
4. Open initiative details from `/events`.
5. Add a contribution, mark it as «Сдал», edit the amount and delete it.
6. Assign a deputy and refresh the page.
7. Transfer organizer rights to another team member.
8. Confirm the organizer changed and delegation history appeared.
9. Refresh the page and confirm contributions, deputy and delegation history remain.
10. Try invalid cases: zero or negative amount, duplicate contribution, non-member deputy, non-member new organizer and end date before start date.

## Notifications And Email Reminders MVP

Implemented in this stage:

- in-app notifications are stored in PostgreSQL as `Notification` records;
- `/reminders` shows persisted notifications after page refresh;
- notifications can be marked as read, marked all read and deleted;
- the header shows unread notifications count;
- event reminders are generated for 14/7/3/1/0 days before an active initiative;
- organizer and deputy receive reminders, with deputy priority when the organizer is the birthday person;
- email reminders are sent through Nodemailer and tracked as `EMAIL` notifications;
- repeated runs skip duplicates by event, user, channel, type and reminder offset;
- assigning a deputy and transferring organizer rights create in-app notifications.

Manual check:

1. Run `docker compose up -d postgres mailpit`.
2. Start backend and frontend.
3. Register or log in.
4. Create or select a team.
5. Create a person.
6. Create a celebration initiative with date in 1, 3, 7 or 14 days.
7. Open `/reminders`.
8. Click `Проверить напоминания`.
9. Confirm an in-app notification appeared and unread count increased.
10. Open Mailpit at `http://localhost:8025` and confirm the email arrived.
11. Mark the notification as read and confirm unread count decreased.
12. Mark all as read and confirm the count is 0.
13. Delete a notification and confirm it disappeared.
14. Run reminders again and confirm duplicate notifications are skipped.

## Docs

- [Project overview](docs/project-overview.md)
- [Technical solution](docs/technical-solution.md)

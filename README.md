# Samarth Early Warning (frontend)

Complete frontend and local API prototype for "Samarth Early Warning": an early-warning system for seniors living at home.
It combines vitals, medicine records and call notes into a daily risk score compared with each senior's own baseline—not a population average.
The interface is built to make the alert understandable and route it to a human; it does not diagnose.
Built with HTML, CSS, JavaScript, Node.js, Express REST, and SQLite.

## Run it

Install dependencies and start the complete app:

    npm install
    npm start

Then visit http://localhost:4173.

For an offline static preview, open `index.html` directly.

## Screens

- **Care Coordinator** (`#coordinator`): ranked daily list, reasons in plain language, suggested next step, useful / not useful feedback.
- **Senior check-in** (`#senior`): big one-tap answers and browser speech-to-text in Hindi or English.
- **Voice health chat** (`#member`): the assistant speaks each question, listens, converts the spoken answer to text, and submits the complete update.
- **Member dashboard** (`#member`): users report health problems, choose reading/writing support, add notes and submit a care-team update.
- **Family** (`#family`): short weekly summary, urgent banner only when serious.
- **Operations** (`#operations`): alert volumes, response times and outcomes by city.

## Structure

    index.html
    css/styles.css
    js/data.js     sample data (replace with API calls later)
    js/charts.js   small SVG chart helpers
    js/views.js    HTML for each screen
    js/app.js      routing and state

All data is synthetic. This UI flags risk and routes to a human; it does not diagnose.

## Backend API

- `GET /api/health` — service and database status
- `GET /api/dashboard` — live dashboard counts
- `GET /api/seniors` and `GET /api/seniors/:id` — seniors
- `PATCH /api/seniors/:id` — follow-up and feedback updates
- `POST /api/checkins` and `GET /api/checkins/:seniorId` — senior check-ins
- `POST /api/followups` and `PATCH /api/followups/:id/complete` — care follow-ups
- `POST /api/member-updates` — member health submissions
- `POST /api/vitals` and `GET /api/vitals/:seniorId` — manually entered or device-reported vitals
- `POST /api/nlp/analyze` — classify Hindi/English health-note signals, negation, urgency and confidence
- `POST /api/alerts/:id/feedback` — alert usefulness feedback
- `GET /api/operations` — operations and feedback summary
- `POST /api/auth/login` — demo role login (`coordinator`, `admin`, `senior`, or `family`; password: `samarth123`)
- `POST /api/auth/logout` — end the current demo session
- `GET /api/auth/me` — validate the current bearer session
- `POST /api/seniors`, `PUT /api/seniors/:id`, `DELETE /api/seniors/:id` — complete senior management
- `GET /api/followups` and `GET /api/member-updates/:seniorId` — persisted follow-up and member records
- `POST /api/risk/calculate` — rolling-baseline risk calculation
- `GET /api/audit-log` — recent backend audit events
- `GET /api/rewards/:seniorId` — redeemable balance, lifetime earned points, partner and doctor benefit
- `POST /api/rewards/:seniorId/redeem` — redeem 250 points for a 10% pharmacy coupon
- `POST /api/pharmacy/orders` — place a medicine order with the partner pharmacy and optional active coupon

## Backend validation

    npm test
    npm run test:integration

## Deploy

## MySQL migration schema

A production MySQL/InnoDB schema is provided at `sql/mysql-schema.sql`. The local prototype continues to use SQLite, which keeps setup and demonstrations fast without requiring a database server.

The project is ready for Render, Railway, Docker, or any Node.js 20 host.

### Render

1. Push this repository to GitHub.
2. Create a new Blueprint from `render.yaml`.
3. Render will install dependencies, start the Node.js server, run the health check, and attach persistent SQLite storage.

### Docker

    docker build -t samarth-early-warning .
    docker run --rm -p 4173:4173 -e DATABASE_PATH=/app/data/samarth.db -v samarth-data:/app/data samarth-early-warning

For production, use a persistent disk or volume for `DATABASE_PATH`. SQLite data is not preserved if the host replaces ephemeral storage.

# Samarth Early Warning (frontend)

Frontend prototype for "Samarth Early Warning": an early-warning system for seniors living at home.
It combines vitals, medicine records and call notes into a daily risk score compared with each senior's own baseline—not a population average.
The interface is built to make the alert understandable and route it to a human; it does not diagnose.
Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Run it

Open `index.html` in a browser. Or serve the folder:

    python -m http.server 8000

then visit http://localhost:8000

## Screens

- **Care Coordinator** (`#coordinator`): ranked daily list, reasons in plain language, suggested next step, useful / not useful feedback.
- **Senior check-in** (`#senior`): big one-tap answers and a voice option (simulated).
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

// Mock data for the demo UI. Replace with API calls once a backend is connected.
// score: 0-100 risk. trend: last 7 days. `off` lists vitals that differ from the senior's own baseline.

const SENIORS = [
  {
    id: 1, name: "Kamla Devi", age: 78, city: "Mathura", lang: "Hindi", score: 86,
    trend: [22, 25, 31, 44, 58, 71, 86],
    reasons: [
      "Slept about 3 hours less than usual for the last 4 nights",
      "Missed her morning BP tablet 3 times this week",
      "Mentioned dizziness on Tuesday's call and said she has not eaten",
      "BP is higher than her normal range"
    ],
    action: "Call today. Ask about dizziness and meals, then check whether a medicine review with her doctor is needed.",
    vitals: { bp: "158/96", spo2: "96%", sugar: "142", weight: "54 kg" }, off: ["bp"],
    note: "I have been feeling dizzy this morning, and I have not eaten anything yet. My son is away.",
    lastCheckin: "Missed yesterday"
  },
  {
    id: 2, name: "Ramesh Gupta", age: 82, city: "Jaipur", lang: "Hindi", score: 79,
    trend: [30, 28, 35, 40, 52, 66, 79],
    reasons: [
      "Evening check-in call missed 3 days in a row",
      "SpO2 is 4 points below his own average",
      "Mentioned a fall in the bathroom on the last call"
    ],
    action: "Send a nearby coordinator within 24 hours. Confirm he is not hurt and the bathroom is safe.",
    vitals: { bp: "132/84", spo2: "90%", sugar: "118", weight: "63 kg" }, off: ["spo2"],
    note: "I slipped in the bathroom, but I am feeling better now.",
    lastCheckin: "3 days ago"
  },
  {
    id: 3, name: "Sarla Menon", age: 74, city: "Kochi", lang: "English", score: 68,
    trend: [40, 38, 44, 47, 55, 62, 68],
    reasons: [
      "Sugar readings have been rising for five days",
      "Notes mention she feels lonely since her husband's passing",
      "Eating less: two calls mention skipped dinners"
    ],
    action: "Friendly call this afternoon. Ask about meals, and flag the sugar trend for her doctor.",
    vitals: { bp: "126/80", spo2: "97%", sugar: "188", weight: "58 kg" }, off: ["sugar"],
    note: "I am okay, just don't feel like cooking. The house is very quiet.",
    lastCheckin: "Today, 9:10 am"
  },
  {
    id: 4, name: "Harbans Singh", age: 80, city: "Ludhiana", lang: "Hindi", score: 57,
    trend: [35, 40, 42, 48, 50, 54, 57],
    reasons: [
      "Much less movement than normal for two days",
      "Weight down 2 kg in two weeks"
    ],
    action: "Schedule a call in the next two days. Ask about appetite and daily walks.",
    vitals: { bp: "130/82", spo2: "95%", sugar: "110", weight: "69 kg" }, off: [],
    note: "I feel a little weak and have not had much appetite.",
    lastCheckin: "Today, 8:40 am"
  },
  {
    id: 5, name: "Leela Iyer", age: 71, city: "Chennai", lang: "English", score: 44,
    trend: [50, 46, 45, 48, 44, 43, 44],
    reasons: ["Slightly irregular sleep this week, no other changes"],
    action: "Routine call this week. No urgent action.",
    vitals: { bp: "122/78", spo2: "98%", sugar: "104", weight: "60 kg" }, off: [],
    note: "All fine. My grandson visited on Sunday.",
    lastCheckin: "Today, 10:00 am"
  },
  {
    id: 6, name: "Mohan Lal", age: 76, city: "Agra", lang: "Hindi", score: 36,
    trend: [30, 33, 35, 34, 38, 37, 36],
    reasons: ["One missed tablet on Monday, everything else is in his normal range"],
    action: "Remind him about the evening tablet on the next call.",
    vitals: { bp: "128/80", spo2: "96%", sugar: "112", weight: "66 kg" }, off: [],
    note: "Everything is fine. I went to the temple.",
    lastCheckin: "Today, 7:55 am"
  },
  {
    id: 7, name: "Prabha Joshi", age: 69, city: "Pune", lang: "Hindi", score: 21,
    trend: [24, 22, 20, 23, 21, 20, 21],
    reasons: ["All signals are close to her usual pattern"],
    action: "No action needed today.",
    vitals: { bp: "118/76", spo2: "98%", sugar: "98", weight: "57 kg" }, off: [],
    note: "I am feeling well and worked in the garden.",
    lastCheckin: "Today, 9:30 am"
  },
  {
    id: 8, name: "Abdul Rahim", age: 73, city: "Hyderabad", lang: "English", score: 18,
    trend: [20, 19, 18, 20, 17, 18, 18],
    reasons: ["All signals are close to his usual pattern"],
    action: "No action needed today.",
    vitals: { bp: "120/78", spo2: "97%", sugar: "101", weight: "72 kg" }, off: [],
    note: "Good morning, took my walk.",
    lastCheckin: "Today, 6:50 am"
  }
];

const CITY_ALERTS = [
  { city: "Mathura", alerts: 14, avgResponse: 3.1 },
  { city: "Jaipur", alerts: 22, avgResponse: 4.4 },
  { city: "Pune", alerts: 18, avgResponse: 2.8 },
  { city: "Chennai", alerts: 11, avgResponse: 3.6 },
  { city: "Ludhiana", alerts: 9, avgResponse: 5.2 },
  { city: "Kochi", alerts: 7, avgResponse: 2.9 }
];

const OUTCOMES = [
  { label: "Doctor visit", pct: 38 },
  { label: "Call resolved", pct: 34 },
  { label: "Medicine review", pct: 17 },
  { label: "Family told", pct: 8 },
  { label: "No action", pct: 3 }
];

// Check-in questions, shown in both languages
const QUESTIONS = [
  { en: "How are you feeling today?", hi: "आज आप कैसा महसूस कर रहे हैं?" },
  { en: "Did you take your medicines?", hi: "क्या आपने अपनी दवाइयाँ लीं?" },
  { en: "Did you eat properly today?", hi: "क्या आपने आज ठीक से खाना खाया?" }
];
const ANSWERS = {
  en: ["Good", "So-so", "Not good"],
  hi: ["अच्छा", "ठीक-ठाक", "अच्छा नहीं"]
};

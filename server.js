const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database(path.join(__dirname, "samarth.db"));
const port = process.env.PORT || 4173;
db.pragma("foreign_keys = ON");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "100kb" }));
app.use(express.static(__dirname, {
  etag: false,
  lastModified: false,
  maxAge: 0,
  setHeaders: (res) => res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
}));

db.exec(`
  CREATE TABLE IF NOT EXISTS seniors (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    city TEXT NOT NULL,
    lang TEXT NOT NULL,
    score INTEGER NOT NULL,
    reasons TEXT NOT NULL,
    action TEXT NOT NULL,
    vitals TEXT NOT NULL,
    off_signals TEXT NOT NULL,
    note TEXT NOT NULL,
    last_checkin TEXT NOT NULL,
    trend TEXT NOT NULL,
    feedback TEXT,
    followup_done INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senior_id INTEGER NOT NULL,
    language TEXT NOT NULL,
    answers TEXT NOT NULL,
    voice_used INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senior_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS member_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senior_id INTEGER DEFAULT 1,
    concerns TEXT NOT NULL,
    literacy TEXT,
    notes TEXT,
    consent INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS vitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senior_id INTEGER NOT NULL,
    systolic INTEGER,
    diastolic INTEGER,
    pulse INTEGER,
    spo2 INTEGER,
    temperature REAL,
    glucose INTEGER,
    source TEXT NOT NULL DEFAULT 'manual',
    recorded_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS alert_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senior_id INTEGER NOT NULL,
    useful INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT NOT NULL DEFAULT 'system',
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reward_accounts (
    senior_id INTEGER PRIMARY KEY,
    balance INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    prescription_unlocked INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reward_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senior_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    points INTEGER NOT NULL,
    description TEXT NOT NULL,
    balance_after INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pharmacy_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senior_id INTEGER NOT NULL,
    partner TEXT NOT NULL,
    items TEXT NOT NULL,
    order_amount REAL NOT NULL,
    discount_amount REAL NOT NULL DEFAULT 0,
    payable_amount REAL NOT NULL,
    coupon_code TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reward_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senior_id INTEGER NOT NULL,
    coupon_code TEXT UNIQUE NOT NULL,
    discount_percent INTEGER NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_checkins_senior ON checkins(senior_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status, id DESC);
  CREATE INDEX IF NOT EXISTS idx_member_updates_senior ON member_updates(senior_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_alert_feedback_senior ON alert_feedback(senior_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_vitals_senior ON vitals(senior_id, recorded_at DESC);
`);

const memberColumns = db.prepare("PRAGMA table_info(member_updates)").all();
if (!memberColumns.some(column => column.name === "nlp_analysis")) {
  db.exec("ALTER TABLE member_updates ADD COLUMN nlp_analysis TEXT");
}

const seed = [
  [1, "Preeti Sharma", 78, "Mathura", "Hindi", 86, ["Slept about 3 hours less than usual", "Missed her morning BP tablet 3 times", "Mentioned dizziness and said she has not eaten", "BP is higher than her normal range"], "Call today. Ask about dizziness and meals, then review medicines.", { bp: "158/96", spo2: "96%", sugar: "142", weight: "54 kg" }, ["bp"], "I have been feeling dizzy this morning, and I have not eaten anything yet.", "Missed yesterday", [22,25,31,44,58,71,86]],
  [2, "Priya Sharma", 82, "Jaipur", "Hindi", 79, ["Evening check-in missed 3 days in a row", "SpO2 is below her own average", "Mentioned a fall in the bathroom"], "Send a nearby coordinator within 24 hours and confirm she is safe.", { bp: "132/84", spo2: "90%", sugar: "118", weight: "63 kg" }, ["spo2"], "I slipped in the bathroom, but I am feeling better now.", "3 days ago", [30,28,35,40,52,66,79]],
  [3, "Harsh Kumar", 74, "Kochi", "English", 68, ["Sugar readings rising for five days", "Has mentioned feeling lonely", "Two calls mention skipped dinners"], "Friendly call this afternoon and flag the sugar trend for her doctor.", { bp: "126/80", spo2: "97%", sugar: "188", weight: "58 kg" }, ["sugar"], "I am okay, just don't feel like cooking.", "Today, 9:10 am", [40,38,44,47,55,62,68]],
  [4, "Gauri Singh", 80, "Ludhiana", "Hindi", 57, ["Much less movement than normal for two days", "Weight down 2 kg in two weeks"], "Schedule a call in the next two days.", { bp: "130/82", spo2: "95%", sugar: "110", weight: "69 kg" }, [], "I feel weak and have not had much appetite.", "Today, 8:40 am", [35,40,42,48,50,54,57]],
  [5, "Priyanshi Garg", 71, "Chennai", "English", 44, ["Slightly irregular sleep this week"], "Routine call this week. No urgent action.", { bp: "122/78", spo2: "98%", sugar: "104", weight: "60 kg" }, [], "All fine. My grandson visited on Sunday.", "Today, 10:00 am", [50,46,45,48,44,43,44]],
  [6, "Chavii Mehta", 76, "Agra", "Hindi", 36, ["One missed tablet on Monday"], "Remind about the evening tablet on the next call.", { bp: "128/80", spo2: "96%", sugar: "112", weight: "66 kg" }, [], "Everything is fine. I went to the temple.", "Today, 7:55 am", [30,33,35,34,38,37,36]],
  [7, "Meenu Joshi", 69, "Pune", "Hindi", 21, ["All signals are close to her usual pattern"], "No action needed today.", { bp: "118/76", spo2: "98%", sugar: "98", weight: "57 kg" }, [], "I am feeling well and worked in the garden.", "Today, 9:30 am", [24,22,20,23,21,20,21]],
  [8, "Kamlesh Verma", 73, "Hyderabad", "English", 18, ["All signals are close to his usual pattern"], "No action needed today.", { bp: "120/78", spo2: "97%", sugar: "101", weight: "72 kg" }, [], "Good morning, took my walk.", "Today, 6:50 am", [20,19,18,20,17,18,18]],
  [9, "Ramesh Gupta", 81, "Delhi", "Hindi", 16, ["All signals are close to his usual pattern"], "No action needed today.", { bp: "118/76", spo2: "97%", sugar: "99", weight: "68 kg" }, [], "I completed my morning walk and feel fine.", "Today, 8:15 am", [18,17,16,18,15,17,16]],
  [10, "Reema Kapoor", 70, "Jaipur", "Hindi", 14, ["No persistent changes from her personal baseline"], "Continue routine check-ins.", { bp: "122/78", spo2: "98%", sugar: "105", weight: "61 kg" }, [], "All is well today.", "Today, 9:05 am", [16,15,14,15,14,13,14]],
  [11, "Mukesh Yadav", 77, "Agra", "Hindi", 12, ["Stable vitals and regular check-ins"], "No urgent action needed.", { bp: "124/80", spo2: "97%", sugar: "108", weight: "65 kg" }, [], "Feeling comfortable and active.", "Today, 7:40 am", [14,13,12,13,11,12,12]],
  [12, "Suman Devi", 75, "Mathura", "Hindi", 10, ["No new concern detected"], "Continue the regular follow-up schedule.", { bp: "120/78", spo2: "98%", sugar: "102", weight: "59 kg" }, [], "I slept well and had breakfast.", "Today, 8:30 am", [12,11,10,12,10,9,10]],
  [13, "Mohan Lal", 79, "Pune", "Hindi", 8, ["All recent signals remain stable"], "No action needed today.", { bp: "126/82", spo2: "97%", sugar: "106", weight: "67 kg" }, [], "Everything is normal.", "Today, 9:20 am", [10,9,8,9,8,7,8]],
  [14, "Kalpna Arora", 72, "Chennai", "English", 6, ["No material change from normal"], "Routine wellbeing check.", { bp: "118/76", spo2: "98%", sugar: "100", weight: "56 kg" }, [], "I am doing well and spoke with my family.", "Today, 10:10 am", [8,7,6,7,6,6,6]]
];

const insert = db.prepare(`INSERT OR IGNORE INTO seniors
  (id, name, age, city, lang, score, reasons, action, vitals, off_signals, note, last_checkin, trend)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

for (const row of seed) {
  insert.run(row[0], row[1], row[2], row[3], row[4], row[5],
    JSON.stringify(row[6]), row[7], JSON.stringify(row[8]), JSON.stringify(row[9]),
    row[10], row[11], JSON.stringify(row[12]));
}

db.prepare("UPDATE seniors SET name=? WHERE id=? AND name=?").run("Preeti Sharma", 1, "Anshika Priya");
db.prepare("UPDATE seniors SET name=? WHERE id=? AND name=?").run("Priyanshi Garg", 5, "Priyanshi Iyer");

const followupCount = db.prepare("SELECT COUNT(*) AS count FROM followups").get().count;
if (followupCount === 0) {
  const seedFollowups = db.prepare(`
    INSERT INTO followups (senior_id, action, status, created_at)
    VALUES (?, ?, 'pending', datetime('now'))
  `);
  for (const id of [1, 2, 3]) {
    const row = db.prepare("SELECT name, action FROM seniors WHERE id = ?").get(id);
    if (row) seedFollowups.run(id, row.action);
  }
}

function toSenior(row) {
  return {
    id: row.id, name: row.name, age: row.age, city: row.city, lang: row.lang, score: row.score,
    reasons: JSON.parse(row.reasons), action: row.action, vitals: JSON.parse(row.vitals),
    off: JSON.parse(row.off_signals), note: row.note, lastCheckin: row.last_checkin,
    trend: JSON.parse(row.trend), feedback: row.feedback, done: Boolean(row.followup_done)
  };
}

function audit(actor, action, entityType, entityId = null, details = null) {
  db.prepare(`
    INSERT INTO audit_log (actor, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(actor, action, entityType, String(entityId ?? ""), details ? JSON.stringify(details) : null);
}

function validId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function seniorExists(id) {
  return Boolean(db.prepare("SELECT 1 FROM seniors WHERE id = ?").get(id));
}

function ensureRewardAccount(seniorId) {
  db.prepare(`
    INSERT OR IGNORE INTO reward_accounts
      (senior_id, balance, total_earned, prescription_unlocked, updated_at)
    VALUES (?, 0, 0, 0, datetime('now'))
  `).run(seniorId);
  return db.prepare("SELECT * FROM reward_accounts WHERE senior_id = ?").get(seniorId);
}

function addRewardPoints(seniorId, points, description) {
  const account = ensureRewardAccount(seniorId);
  const balance = account.balance + points;
  const totalEarned = account.total_earned + points;
  const prescriptionUnlocked = account.prescription_unlocked || (totalEarned >= 5000 ? 1 : 0);
  db.prepare(`
    UPDATE reward_accounts
    SET balance=?, total_earned=?, prescription_unlocked=?, updated_at=datetime('now')
    WHERE senior_id=?
  `).run(balance, totalEarned, prescriptionUnlocked, seniorId);
  db.prepare(`
    INSERT INTO reward_transactions
      (senior_id, type, points, description, balance_after, created_at)
    VALUES (?, 'earned', ?, ?, ?, datetime('now'))
  `).run(seniorId, points, description, balance);
  return { balance, totalEarned, prescriptionUnlocked };
}

function analyzeHealthText(text = "", language = "en") {
  const normalized = String(text).toLowerCase();
  const signals = [
    { key: "bp", terms: ["blood pressure", "bp", "बीपी", "ब्लड प्रेशर", "प्रेशर"] },
    { key: "medicine", terms: ["medicine", "tablet", "dose", "दवा", "गोली"] },
    { key: "sleep", terms: ["sleep", "insomnia", "नींद"] },
    { key: "food", terms: ["eat", "food", "appetite", "weakness", "खाना", "भूख", "कमजोर"] },
    { key: "pain", terms: ["pain", "ache", "hurt", "दर्द"] }
  ];
  const urgentTerms = [
    "chest pain", "cannot breathe", "can't breathe", "fainting", "stroke",
    "सीने में दर्द", "सांस नहीं", "बेहोश", "चक्कर बहुत ज्यादा"
  ];
  const negationTerms = ["no ", "not ", "without ", "never ", "नहीं", "नही", "बिना"];
  const matched = [];
  const excluded = [];

  for (const signal of signals) {
    const term = signal.terms.find(value => normalized.includes(value));
    if (!term) continue;
    const termIndex = normalized.indexOf(term);
    const beforeTerm = normalized.slice(Math.max(0, termIndex - 18), termIndex);
    const afterTerm = normalized.slice(termIndex + term.length, termIndex + term.length + 5);
    const context = `${beforeTerm} ${afterTerm}`;
    if (negationTerms.some(value => context.includes(value))) excluded.push(signal.key);
    else matched.push({ key: signal.key, evidence: term });
  }

  const urgent = urgentTerms.some(term => normalized.includes(term));
  const missedMedicine = /missed|forgot|skip|छूट|भूल|नहीं ली/i.test(normalized);
  const highRisk = urgent || missedMedicine && /medicine|tablet|dose|दवा|गोली/i.test(normalized);
  const categories = [...new Map(matched.map(item => [item.key, item])).values()];
  const score = highRisk ? 88 : categories.length >= 2 ? 62 : categories.length ? 42 : 18;

  return {
    language,
    categories,
    negatedCategories: [...new Set(excluded)],
    urgent,
    missedMedicine,
    riskLevel: score >= 70 ? "high" : score >= 45 ? "medium" : "low",
    confidence: categories.length || urgent ? 0.82 : 0.55,
    summary: highRisk
      ? (language === "hi" ? "तुरंत मानवीय समीक्षा की आवश्यकता वाले संकेत मिले।" : "Signals were found that require prompt human review.")
      : categories.length
        ? (language === "hi" ? "स्वास्थ्य चिंता पहचान ली गई है और देखभाल टीम को भेजी जाएगी।" : "Health concern signals were identified for care-team review.")
        : (language === "hi" ? "कोई स्पष्ट चिंता शब्द नहीं मिला। देखभाल टीम वांछित विवरण देख सकती है।" : "No clear concern was detected; the care team can review the full note.")
  };
}

const crypto = require("crypto");
const sessions = new Map();
const userInsert = db.prepare("INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)");
userInsert.run("coordinator", "samarth123", "coordinator");
userInsert.run("admin", "samarth123", "admin");
userInsert.run("senior", "samarth123", "senior");
userInsert.run("family", "samarth123", "family");

function requireRole(...roles) {
  return (req, res, next) => {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const session = sessions.get(token);
    if (!session || !roles.includes(session.role)) {
      return res.status(401).json({ error: "Unauthorised" });
    }
    req.user = session;
    next();
  };
}

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  const user = db.prepare("SELECT id, username, role FROM users WHERE username = ? AND password = ?").get(username, password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, user);
  audit(user.username, "login", "session", null, { role: user.role });
  res.json({ token, user });
});

app.post("/api/auth/logout", (req, res) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const session = sessions.get(token);
  if (session) audit(session.username, "logout", "session");
  sessions.delete(token);
  res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const session = sessions.get(token);
  if (!session) return res.status(401).json({ error: "Invalid or expired session" });
  res.json({ user: session });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "connected", service: "Samarth Early Warning API", timestamp: new Date().toISOString() });
});

app.post("/api/nlp/analyze", (req, res) => {
  const { text = "", language = "en" } = req.body;
  if (typeof text !== "string" || text.length > 5000) {
    return res.status(400).json({ error: "text must be a string of at most 5000 characters" });
  }
  if (!["en", "hi"].includes(language)) {
    return res.status(400).json({ error: "language must be en or hi" });
  }
  const analysis = analyzeHealthText(text, language);
  audit("member", "analyze", "nlp_note", null, { language, categories: analysis.categories.map(item => item.key), urgent: analysis.urgent });
  res.json(analysis);
});

app.get("/api/dashboard", (req, res) => {
  const seniors = db.prepare("SELECT score FROM seniors").all();
  res.json({
    totalSeniors: seniors.length,
    actToday: seniors.filter(s => s.score >= 70).length,
    watchClosely: seniors.filter(s => s.score >= 45 && s.score < 70).length,
    stable: seniors.filter(s => s.score < 45).length,
    checkinsToday: db.prepare("SELECT COUNT(*) AS count FROM checkins WHERE created_at >= date('now')").get().count,
    pendingFollowups: db.prepare("SELECT COUNT(*) AS count FROM followups WHERE status = 'pending'").get().count
  });
});

app.get("/api/seniors", (req, res) => {
  const rows = db.prepare("SELECT * FROM seniors ORDER BY score DESC").all();
  res.json(rows.map(toSenior));
});

app.post("/api/seniors", (req, res) => {
  const { name, age, city, lang = "Hindi", score = 0, reasons = [], action = "Routine follow-up", vitals = {}, off = [], note = "", lastCheckin = "Not checked in" , trend = [] } = req.body;
  if (typeof name !== "string" || !name.trim() || !Number.isInteger(age) || age < 1 || age > 120) {
    return res.status(400).json({ error: "Valid name and age are required" });
  }
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    return res.status(400).json({ error: "score must be between 0 and 100" });
  }
  const result = db.prepare(`
    INSERT INTO seniors
      (name, age, city, lang, score, reasons, action, vitals, off_signals, note, last_checkin, trend)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name.trim(), age, String(city || ""), lang, score,
    JSON.stringify(reasons), action, JSON.stringify(vitals), JSON.stringify(off), note, lastCheckin, JSON.stringify(trend));
  audit("api", "create", "senior", result.lastInsertRowid, { name });
  const row = db.prepare("SELECT * FROM seniors WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(toSenior(row));
});

app.put("/api/seniors/:id", (req, res) => {
  const id = validId(req.params.id);
  if (!id || !seniorExists(id)) return res.status(404).json({ error: "Senior not found" });
  const existing = db.prepare("SELECT * FROM seniors WHERE id = ?").get(id);
  const old = toSenior(existing);
  const body = req.body;
  const score = body.score === undefined ? old.score : Number(body.score);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    return res.status(400).json({ error: "score must be between 0 and 100" });
  }
  db.prepare(`
    UPDATE seniors SET name=?, age=?, city=?, lang=?, score=?, reasons=?, action=?, vitals=?,
      off_signals=?, note=?, last_checkin=?, trend=? WHERE id=?
  `).run(
    body.name ?? old.name,
    body.age ?? old.age,
    body.city ?? old.city,
    body.lang ?? old.lang,
    score,
    JSON.stringify(body.reasons ?? old.reasons),
    body.action ?? old.action,
    JSON.stringify(body.vitals ?? old.vitals),
    JSON.stringify(body.off ?? old.off),
    body.note ?? old.note,
    body.lastCheckin ?? old.lastCheckin,
    JSON.stringify(body.trend ?? old.trend),
    id
  );
  audit("api", "update", "senior", id, { score });
  res.json(toSenior(db.prepare("SELECT * FROM seniors WHERE id = ?").get(id)));
});

app.delete("/api/seniors/:id", (req, res) => {
  const id = validId(req.params.id);
  if (!id || !seniorExists(id)) return res.status(404).json({ error: "Senior not found" });
  db.prepare("DELETE FROM seniors WHERE id = ?").run(id);
  audit("api", "delete", "senior", id);
  res.status(204).send();
});

app.get("/api/seniors/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare("SELECT * FROM seniors WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Senior not found" });
  res.json(toSenior(row));
});

app.post("/api/checkins", (req, res) => {
  const { seniorId = 1, language = "en", answers, voiceUsed = false } = req.body;
  if (!seniorExists(Number(seniorId))) return res.status(404).json({ error: "Senior not found" });
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "At least one check-in answer is required" });
  }
  const result = db.prepare(`
    INSERT INTO checkins (senior_id, language, answers, voice_used, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(seniorId, language, JSON.stringify(answers), voiceUsed ? 1 : 0);
  db.prepare("UPDATE seniors SET last_checkin = 'Today' WHERE id = ?").run(seniorId);
  audit("senior", "submit", "checkin", result.lastInsertRowid, { seniorId });
  const positiveTerms = [
    "good", "yes", "taken", "complete", "fine", "well", "eaten", "ate",
    "अच्छा", "हाँ", "हां", "ली", "खाया", "ठीक", "पूरा", "completely"
  ];
  const positiveAnswers = answers.filter(answer => {
    const value = String(answer.answer || "").toLowerCase();
    const negative = /(not good|bad|no|missed|forgot|skipped|not eaten|not take|अच्छा नहीं|नहीं|छूट|भूल|खाना नहीं)/i.test(value);
    return !negative && positiveTerms.some(term => value.includes(term));
  }).length;
  let reward = { points: 0, ...ensureRewardAccount(Number(seniorId)) };
  if (positiveAnswers >= 2) {
    const points = positiveAnswers === 3 ? 15 : 10;
    const update = addRewardPoints(Number(seniorId), points, `${positiveAnswers} positive daily check-in answers`);
    reward = { points, ...update };
  }
  res.status(201).json({
    id: result.lastInsertRowid, seniorId, answers, voiceUsed,
    createdAt: new Date().toISOString(), positiveAnswers, reward
  });
});

app.get("/api/checkins/:seniorId", (req, res) => {
  const rows = db.prepare("SELECT * FROM checkins WHERE senior_id = ? ORDER BY id DESC").all(Number(req.params.seniorId));
  res.json(rows.map(row => ({
    id: row.id, seniorId: row.senior_id, language: row.language,
    answers: JSON.parse(row.answers), voiceUsed: Boolean(row.voice_used), createdAt: row.created_at
  })));
});

app.post("/api/followups", (req, res) => {
  const { seniorId, action, status = "pending" } = req.body;
  if (!Number.isInteger(Number(seniorId)) || !action) {
    return res.status(400).json({ error: "seniorId and action are required" });
  }
  if (!seniorExists(Number(seniorId))) return res.status(404).json({ error: "Senior not found" });
  if (!["pending", "in_progress", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid follow-up status" });
  }
  const result = db.prepare(`
    INSERT INTO followups (senior_id, action, status, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(Number(seniorId), action, status);
  audit("coordinator", "create", "followup", result.lastInsertRowid, { seniorId, status });
  res.status(201).json({ id: result.lastInsertRowid, seniorId: Number(seniorId), action, status });
});

app.get("/api/followups", (req, res) => {
  const status = req.query.status;
  const rows = status
    ? db.prepare("SELECT * FROM followups WHERE status = ? ORDER BY id DESC").all(status)
    : db.prepare("SELECT * FROM followups ORDER BY id DESC").all();
  res.json(rows.map(row => ({
    id: row.id, seniorId: row.senior_id, action: row.action, status: row.status,
    createdAt: row.created_at, completedAt: row.completed_at
  })));
});

app.patch("/api/followups/:id/complete", (req, res) => {
  const result = db.prepare(`
    UPDATE followups SET status = 'completed', completed_at = datetime('now') WHERE id = ?
  `).run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: "Follow-up not found" });
  audit("coordinator", "complete", "followup", req.params.id);
  res.json({ id: Number(req.params.id), status: "completed" });
});

app.post("/api/member-updates", (req, res) => {
  const { seniorId = 1, concerns = [], literacy = "", notes = "", consent = true } = req.body;
  if (!Array.isArray(concerns)) return res.status(400).json({ error: "concerns must be an array" });
  if (!seniorExists(Number(seniorId))) return res.status(404).json({ error: "Senior not found" });
  if (!Array.from(concerns).every(value => typeof value === "string")) {
    return res.status(400).json({ error: "Each concern must be a string" });
  }
  if (typeof notes !== "string") return res.status(400).json({ error: "notes must be a string" });
  const nlp = analyzeHealthText(notes, req.body.language === "hi" ? "hi" : "en");
  const result = db.prepare(`
    INSERT INTO member_updates (senior_id, concerns, literacy, notes, consent, nlp_analysis, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(seniorId, JSON.stringify(concerns), literacy, notes, consent ? 1 : 0, JSON.stringify(nlp));
  audit("member", "submit", "member_update", result.lastInsertRowid, { seniorId, consent });
  res.status(201).json({ id: result.lastInsertRowid, seniorId, concerns, literacy, notes, consent, nlp });
});

app.get("/api/member-updates/:seniorId", (req, res) => {
  const seniorId = validId(req.params.seniorId);
  if (!seniorId) return res.status(400).json({ error: "Invalid senior id" });
  const rows = db.prepare("SELECT * FROM member_updates WHERE senior_id = ? ORDER BY id DESC").all(seniorId);
  res.json(rows.map(row => ({
    id: row.id, seniorId: row.senior_id, concerns: JSON.parse(row.concerns),
    literacy: row.literacy, notes: row.notes, consent: Boolean(row.consent),
    nlp: row.nlp_analysis ? JSON.parse(row.nlp_analysis) : null,
    createdAt: row.created_at
  })));
});

app.post("/api/alerts/:id/feedback", (req, res) => {
  const seniorId = Number(req.params.id);
  if (!seniorExists(seniorId)) return res.status(404).json({ error: "Senior not found" });
  const useful = req.body.useful === true ? 1 : req.body.useful === false ? 0 : null;
  if (useful === null) return res.status(400).json({ error: "useful must be true or false" });
  db.prepare("INSERT INTO alert_feedback (senior_id, useful, created_at) VALUES (?, ?, datetime('now'))").run(seniorId, useful);
  db.prepare("UPDATE seniors SET feedback = ? WHERE id = ?").run(useful ? "useful" : "notuseful", seniorId);
  audit("coordinator", "feedback", "alert", seniorId, { useful: Boolean(useful) });
  res.status(201).json({ seniorId, useful });
});

app.get("/api/rewards/:seniorId", (req, res) => {
  const seniorId = validId(req.params.seniorId);
  if (!seniorId || !seniorExists(seniorId)) return res.status(404).json({ error: "Senior not found" });
  const account = ensureRewardAccount(seniorId);
  const transactions = db.prepare(`
    SELECT * FROM reward_transactions
    WHERE senior_id=? ORDER BY id DESC LIMIT 30
  `).all(seniorId).map(row => ({
    id: row.id, type: row.type, points: row.points, description: row.description,
    balanceAfter: row.balance_after, createdAt: row.created_at
  }));
  res.json({
    seniorId,
    partner: "Samarth Health Pharmacy",
    balance: account.balance,
    totalEarned: account.total_earned,
    redemptionMinimum: 250,
    discountPercent: 10,
    prescriptionUnlocked: Boolean(account.prescription_unlocked),
    prescriptionMilestone: 5000,
    doctorBenefit: account.prescription_unlocked
      ? "Consultation voucher unlocked with an eligible partner doctor"
      : null,
    transactions
  });
});

app.post("/api/rewards/:seniorId/redeem", (req, res) => {
  const seniorId = validId(req.params.seniorId);
  if (!seniorId || !seniorExists(seniorId)) return res.status(404).json({ error: "Senior not found" });
  const orderAmount = Number(req.body.orderAmount);
  if (!Number.isFinite(orderAmount) || orderAmount <= 0 || orderAmount > 1000000) {
    return res.status(400).json({ error: "Valid orderAmount is required" });
  }
  const account = ensureRewardAccount(seniorId);
  if (account.balance < 250) {
    return res.status(400).json({ error: "At least 250 reward points are required" });
  }
  const balance = account.balance - 250;
  db.prepare(`
    UPDATE reward_accounts SET balance=?, updated_at=datetime('now') WHERE senior_id=?
  `).run(balance, seniorId);
  db.prepare(`
    INSERT INTO reward_transactions
      (senior_id, type, points, description, balance_after, created_at)
    VALUES (?, 'redeemed', -250, '10% discount at Samarth Health Pharmacy', ?, datetime('now'))
  `).run(seniorId, balance);
  const discountAmount = Math.round(orderAmount * 10) / 100;
  const couponCode = `SAMARTH-${Date.now().toString(36).toUpperCase()}`;
  db.prepare(`
    INSERT INTO reward_redemptions
      (senior_id, coupon_code, discount_percent, status, created_at)
    VALUES (?, ?, 10, 'active', datetime('now'))
  `).run(seniorId, couponCode);
  audit("senior", "redeem", "reward", seniorId, { points: 250, discountAmount, partner: "Samarth Health Pharmacy" });
  res.status(201).json({
    seniorId,
    pointsRedeemed: 250,
    discountPercent: 10,
    discountAmount,
    payableAmount: Math.max(0, Math.round((orderAmount - discountAmount) * 100) / 100),
    couponCode,
    partner: "Samarth Health Pharmacy",
    balanceAfter: balance
  });
});

app.post("/api/pharmacy/orders", (req, res) => {
  const seniorId = validId(req.body.seniorId);
  if (!seniorId || !seniorExists(seniorId)) return res.status(404).json({ error: "Senior not found" });
  if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
    return res.status(400).json({ error: "At least one medicine item is required" });
  }
  if (!req.body.items.every(item => typeof item.name === "string" && item.name.trim() && Number(item.price) > 0)) {
    return res.status(400).json({ error: "Each medicine item requires a valid name and price" });
  }
  const orderAmount = Math.round(req.body.items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0) * 100) / 100;
  let discountAmount = 0;
  let couponCode = req.body.couponCode ? String(req.body.couponCode).trim() : null;
  if (couponCode) {
    const redemption = db.prepare(`
      SELECT * FROM reward_redemptions
      WHERE senior_id=? AND coupon_code=? AND status='active'
    `).get(seniorId, couponCode);
    if (!redemption) return res.status(400).json({ error: "Invalid or already-used reward coupon" });
    discountAmount = Math.round(orderAmount * redemption.discount_percent) / 100;
    db.prepare("UPDATE reward_redemptions SET status='used' WHERE id=?").run(redemption.id);
  } else {
    couponCode = null;
  }
  const payableAmount = Math.round((orderAmount - discountAmount) * 100) / 100;
  const result = db.prepare(`
    INSERT INTO pharmacy_orders
      (senior_id, partner, items, order_amount, discount_amount, payable_amount, coupon_code, status, created_at)
    VALUES (?, 'Samarth Health Pharmacy', ?, ?, ?, ?, ?, 'confirmed', datetime('now'))
  `).run(seniorId, JSON.stringify(req.body.items), orderAmount, discountAmount, payableAmount, couponCode);
  audit("senior", "order", "pharmacy", seniorId, { partner: "Samarth Health Pharmacy", orderId: result.lastInsertRowid, discountAmount });
  res.status(201).json({
    id: result.lastInsertRowid,
    seniorId,
    partner: "Samarth Health Pharmacy",
    items: req.body.items,
    orderAmount,
    discountPercent: couponCode ? 10 : 0,
    discountAmount,
    payableAmount,
    status: "confirmed",
    deliveryPartnerOnly: "Samarth Health Pharmacy"
  });
});

app.get("/api/operations", (req, res) => {
  const cityRows = db.prepare("SELECT city, COUNT(*) AS alerts FROM seniors GROUP BY city ORDER BY alerts DESC").all();
  const feedbackRows = db.prepare("SELECT useful, COUNT(*) AS count FROM alert_feedback GROUP BY useful").all();
  res.json({
    cities: cityRows,
    feedback: feedbackRows,
    pendingFollowups: db.prepare("SELECT COUNT(*) AS count FROM followups WHERE status = 'pending'").get().count,
    completedFollowups: db.prepare("SELECT COUNT(*) AS count FROM followups WHERE status = 'completed'").get().count,
    totalSeniors: db.prepare("SELECT COUNT(*) AS count FROM seniors").get().count,
    highPriority: db.prepare("SELECT COUNT(*) AS count FROM seniors WHERE score >= 70").get().count,
    mediumPriority: db.prepare("SELECT COUNT(*) AS count FROM seniors WHERE score >= 45 AND score < 70").get().count,
    checkins: db.prepare("SELECT COUNT(*) AS count FROM checkins").get().count,
    memberUpdates: db.prepare("SELECT COUNT(*) AS count FROM member_updates").get().count,
    vitalsRecorded: db.prepare("SELECT COUNT(*) AS count FROM vitals").get().count
  });
});

app.post("/api/vitals", (req, res) => {
  const { seniorId = 1, systolic, diastolic, pulse, spo2, temperature, glucose, source = "manual" } = req.body;
  const id = validId(seniorId);
  if (!id || !seniorExists(id)) return res.status(404).json({ error: "Senior not found" });
  const optionalNumbers = { systolic, diastolic, pulse, spo2, temperature, glucose };
  for (const [key, value] of Object.entries(optionalNumbers)) {
    if (value !== undefined && value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
      return res.status(400).json({ error: `${key} must be numeric` });
    }
  }
  if (systolic !== undefined && (systolic < 70 || systolic > 260)) return res.status(400).json({ error: "systolic is outside supported range" });
  if (diastolic !== undefined && (diastolic < 40 || diastolic > 160)) return res.status(400).json({ error: "diastolic is outside supported range" });
  if (pulse !== undefined && (pulse < 30 || pulse > 220)) return res.status(400).json({ error: "pulse is outside supported range" });
  if (spo2 !== undefined && (spo2 < 50 || spo2 > 100)) return res.status(400).json({ error: "spo2 is outside supported range" });

  const result = db.prepare(`
    INSERT INTO vitals (senior_id, systolic, diastolic, pulse, spo2, temperature, glucose, source, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, systolic ?? null, diastolic ?? null, pulse ?? null, spo2 ?? null, temperature ?? null, glucose ?? null, source);
  audit("member", "record", "vitals", result.lastInsertRowid, { seniorId: id, source });
  res.status(201).json({ id: result.lastInsertRowid, seniorId: id, systolic, diastolic, pulse, spo2, temperature, glucose, source });
});

app.get("/api/vitals/:seniorId", (req, res) => {
  const id = validId(req.params.seniorId);
  if (!id || !seniorExists(id)) return res.status(404).json({ error: "Senior not found" });
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const rows = db.prepare("SELECT * FROM vitals WHERE senior_id = ? ORDER BY id DESC LIMIT ?").all(id, limit);
  res.json(rows.map(row => ({
    id: row.id, seniorId: row.senior_id, systolic: row.systolic, diastolic: row.diastolic,
    pulse: row.pulse, spo2: row.spo2, temperature: row.temperature, glucose: row.glucose,
    source: row.source, recordedAt: row.recorded_at
  })));
});

app.post("/api/risk/calculate", (req, res) => {
  const { seniorId, currentTrend, changedSignals = [] } = req.body;
  if (!Array.isArray(currentTrend) || currentTrend.length < 2 || !currentTrend.every(Number.isFinite)) {
    return res.status(400).json({ error: "currentTrend must contain at least two numeric values" });
  }
  const values = currentTrend.map(Number);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  const deviation = Math.sqrt(variance);
  const latest = values[values.length - 1];
  const zScore = deviation ? (latest - mean) / deviation : 0;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)]
    : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const absoluteDeviations = values.map(value => Math.abs(value - median)).sort((a, b) => a - b);
  const mad = absoluteDeviations.length % 2 ? absoluteDeviations[Math.floor(absoluteDeviations.length / 2)]
    : (absoluteDeviations[absoluteDeviations.length / 2 - 1] + absoluteDeviations[absoluteDeviations.length / 2]) / 2;
  const robustZ = mad ? 0.6745 * (latest - median) / mad : 0;
  const weights = { bp: 12, medicine: 14, sleep: 9, food: 10, pain: 16, spo2: 18, sugar: 12, mobility: 8 };
  const uniqueSignals = [...new Set(changedSignals.filter(value => typeof value === "string"))];
  const signalScore = Math.min(uniqueSignals.reduce((sum, signal) => sum + (weights[signal] || 8), 0), 42);
  const persistence = values.slice(-3).filter(value => value > median + Math.max(mad, 1)).length * 5;
  const anomalyScore = Math.max(0, Math.min(30, robustZ * 7));
  const trendScore = Math.max(0, Math.min(28, zScore * 8 + 12));
  const score = Math.round(Math.min(100, signalScore + persistence + anomalyScore + trendScore));
  const contributions = uniqueSignals.map(signal => ({
    signal,
    contribution: weights[signal] || 8,
    reason: `${signal.replace(/_/g, " ")} changed from the personal baseline`
  }));
  if (seniorId && !seniorExists(Number(seniorId))) {
    return res.status(404).json({ error: "Senior not found" });
  }
  if (seniorId) audit("model", "calculate", "risk", Number(seniorId), { score, zScore: Number(zScore.toFixed(2)) });
  res.json({
    score,
    level: score >= 70 ? "high" : score >= 45 ? "mid" : "low",
    zScore: Number(zScore.toFixed(3)),
    robustZScore: Number(robustZ.toFixed(3)),
    median: Number(median.toFixed(2)),
    mad: Number(mad.toFixed(2)),
    changedSignals,
    contributions,
    components: {
      signalScore,
      persistenceScore: persistence,
      anomalyScore: Math.round(anomalyScore),
      trendScore: Math.round(trendScore)
    },
    explanation: score >= 70
      ? "Several recent signals changed together; immediate human review is recommended."
      : score >= 45
        ? "Some signals need closer monitoring by the care team."
        : "No persistent multi-signal change was detected."
  });
});

app.get("/api/audit-log", (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const rows = db.prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?").all(limit);
  res.json(rows.map(row => ({
    id: row.id, actor: row.actor, action: row.action, entityType: row.entity_type,
    entityId: row.entity_id, details: row.details ? JSON.parse(row.details) : null, createdAt: row.created_at
  })));
});

app.patch("/api/seniors/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid senior id" });
  if (!seniorExists(id)) return res.status(404).json({ error: "Senior not found" });
  if (!req.body || !Object.keys(req.body).length) return res.status(400).json({ error: "At least one update field is required" });
  if (req.body.feedback !== undefined && !["useful", "notuseful"].includes(req.body.feedback)) {
    return res.status(400).json({ error: "Invalid feedback value" });
  }
  if (req.body.done !== undefined && typeof req.body.done !== "boolean") {
    return res.status(400).json({ error: "done must be boolean" });
  }
  if (req.body.feedback !== undefined) db.prepare("UPDATE seniors SET feedback = ? WHERE id = ?").run(req.body.feedback, id);
  if (req.body.done !== undefined) {
    db.prepare("UPDATE seniors SET followup_done = ? WHERE id = ?").run(req.body.done ? 1 : 0, id);
    if (req.body.done) {
      db.prepare(`
        INSERT INTO followups (senior_id, action, status, created_at, completed_at)
        VALUES (?, 'Care coordinator marked follow-up complete', 'completed', datetime('now'), datetime('now'))
      `).run(id);
    }
  }
  audit("coordinator", "update", "senior", id, req.body);
  res.json(toSenior(db.prepare("SELECT * FROM seniors WHERE id = ?").get(id)));
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Samarth Early Warning running at http://localhost:${port}`);
});

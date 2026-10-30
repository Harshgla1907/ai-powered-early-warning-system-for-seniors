const { spawn } = require("child_process");

const port = 4188;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server.js"], {
  cwd: __dirname,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});

async function request(path, options = {}) {
  const response = await fetch(baseUrl + path, options);
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      if ((await request("/api/health")).status === 200) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Backend did not start");
}

async function run() {
  await waitForServer();

  const health = await request("/api/health");
  if (health.status !== 200 || health.body.status !== "ok") throw new Error("Health check failed");

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "coordinator", password: "samarth123" })
  });
  if (login.status !== 200 || !login.body.token) throw new Error("Login failed");

  const seniors = await request("/api/seniors");
  if (seniors.status !== 200 || !Array.isArray(seniors.body) || seniors.body.length < 14) {
    throw new Error("Senior API failed");
  }

  const checkin = await request("/api/checkins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seniorId: 1,
      language: "en",
      answers: [{ question: "How are you feeling?", answer: "Good" }]
    })
  });
  if (checkin.status !== 201) throw new Error("Check-in API failed");

  const memberUpdate = await request("/api/member-updates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seniorId: 1, concerns: ["bp"], literacy: "comfortable", notes: "Missed my morning BP tablet and I feel dizzy", language: "en", consent: true })
  });
  if (memberUpdate.status !== 201 || memberUpdate.body.nlp?.riskLevel !== "high") throw new Error("Member NLP update API failed");

  const nlp = await request("/api/nlp/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "मुझे सीने में दर्द है और सांस लेने में परेशानी है", language: "hi" })
  });
  if (nlp.status !== 200 || nlp.body.urgent !== true || !["high", "medium", "low"].includes(nlp.body.riskLevel)) {
    throw new Error("Hindi NLP analysis API failed");
  }

  const risk = await request("/api/risk/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seniorId: 1, currentTrend: [20, 30, 40, 80], changedSignals: ["bp", "sleep"] })
  });
  if (risk.status !== 200 || !Number.isInteger(risk.body.score)) throw new Error("Risk API failed");

  const vitals = await request("/api/vitals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seniorId: 1, systolic: 158, diastolic: 96, pulse: 88, spo2: 96, glucose: 142, source: "integration-test" })
  });
  if (vitals.status !== 201 || vitals.body.systolic !== 158) throw new Error("Vitals API failed");

  const vitalsHistory = await request("/api/vitals/1");
  if (vitalsHistory.status !== 200 || !Array.isArray(vitalsHistory.body) || !vitalsHistory.body.length) {
    throw new Error("Vitals history API failed");
  }

  const operations = await request("/api/operations");
  if (operations.status !== 200 || operations.body.totalSeniors < 14) {
    throw new Error("Live operations API failed");
  }

  const memberHistory = await request("/api/member-updates/1");
  if (memberHistory.status !== 200 || !Array.isArray(memberHistory.body) || !memberHistory.body.length) {
    throw new Error("Member history API failed");
  }

  const followup = await request("/api/seniors/1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done: true })
  });
  if (followup.status !== 200 || followup.body.done !== true) {
    throw new Error("Follow-up persistence API failed");
  }

  const invalidRisk = await request("/api/risk/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentTrend: "invalid", changedSignals: [] })
  });
  if (invalidRisk.status !== 400) throw new Error("Invalid risk input was not rejected");

  const missingSenior = await request("/api/seniors/99999");
  if (missingSenior.status !== 404) throw new Error("Missing senior 404 handling failed");

  const invalidCheckin = await request("/api/checkins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seniorId: 1, language: "en", answers: [] })
  });
  if (invalidCheckin.status !== 400) throw new Error("Invalid check-in handling failed");

  console.log("Backend integration checks passed");
}

run()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => server.kill());

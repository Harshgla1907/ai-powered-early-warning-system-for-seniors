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

// Tiny hash router + state. No framework, just re-render on change.

const state = {
  filter: "all",
  selected: null,
  done: new Set(),
  feedback: {},
  lang: "en",
  step: 0,
  voice: false,
  familySenior: 1,
  memberConcerns: new Set(),
  memberLiteracy: "",
  memberOther: "",
  memberSubmitted: false,
  checkinAnswers: []
};

const view = document.getElementById("view");
const apiStatus = document.getElementById("apiStatus");

function setApiStatus(type, message, allowRetry = false) {
  if (!apiStatus) return;
  apiStatus.hidden = false;
  apiStatus.className = `api-status ${type}`;
  apiStatus.innerHTML = `<span>${message}</span>${allowRetry ? '<button type="button" data-api-retry="1">Retry</button>' : ""}`;
  if (type !== "error") {
    window.setTimeout(() => { apiStatus.hidden = true; }, 2200);
  }
}

function render() {
  const route = location.hash.replace("#", "") || "coordinator";
  const screens = {
    coordinator: () => coordinatorView(state),
    senior: () => seniorView(state),
    member: () => memberView(state),
    family: () => familyView(state),
    operations: () => operationsView(state)
  };
  view.innerHTML = (screens[route] || screens.coordinator)();
  document.querySelectorAll("#nav a").forEach(a => {
    a.classList.toggle("active", a.getAttribute("href") === "#" + route);
  });
  document.documentElement.lang = state.lang === "hi" ? "hi" : "en";
  document.querySelectorAll(".language-switch button").forEach(button => {
    button.classList.toggle("active", button.dataset.lang === state.lang);
  });
  document.querySelectorAll("[data-nav]").forEach(link => {
    const key = link.dataset.nav;
    const labels = state.lang === "hi"
      ? { coordinator: "देखभाल समन्वयक", senior: "सीनियर चेक-इन", member: "मेरा स्वास्थ्य", family: "परिवार", operations: "ऑपरेशन" }
      : { coordinator: "Care Coordinator", senior: "Senior check-in", member: "My health", family: "Family", operations: "Operations" };
    link.textContent = labels[key];
  });
}

document.querySelector(".language-switch").addEventListener("click", e => {
  const button = e.target.closest("button[data-lang]");
  if (!button) return;
  state.lang = button.dataset.lang;
  render();
});

// One click handler for the whole page, it checks data attributes
view.addEventListener("click", e => {
  const t = e.target.closest("button");
  if (!t) return;
  const d = t.dataset;

  if (d.id) state.selected = Number(d.id);
  if (d.filter) { state.filter = d.filter; state.selected = null; }
  if (d.done) state.done.add(Number(d.done));
  if (d.fb) state.feedback[d.sid] = d.fb;
  if (d.lang) state.lang = d.lang;
  if (d.answer) {
    const question = QUESTIONS[state.step];
    if (question) {
      state.checkinAnswers.push({
        question: question[state.lang],
        answer: ANSWERS[state.lang][Number(d.answer)]
      });
    }
    if (state.step >= QUESTIONS.length - 1) {
      submitCheckin(state.checkinAnswers, false);
      state.checkinAnswers = [];
    }
    state.step += 1;
  }
  if (d.concern) {
    state.memberConcerns.has(d.concern)
      ? state.memberConcerns.delete(d.concern)
      : state.memberConcerns.add(d.concern);
    state.memberSubmitted = false;
  }
  if (d.literacy) {
    state.memberLiteracy = d.literacy;
    state.memberSubmitted = false;
  }
  if (d.memberSubmit) {
    state.memberSubmitted = true;
    submitMemberUpdate(state);
  }
  if (d.voice) {
    state.voice = true;
    setTimeout(() => {
      state.voice = false;
      const question = QUESTIONS[state.step];
      if (question) state.checkinAnswers.push({ question: question[state.lang], answer: "Voice response recorded", source: "voice" });
      if (state.step >= QUESTIONS.length - 1) {
        submitCheckin(state.checkinAnswers, true);
        state.checkinAnswers = [];
      }
      state.step += 1;
      render();
    }, 2000);
  }
  if (d.restart) state.step = 0;
  render();
});

view.addEventListener("change", e => {
  if (e.target.id === "familyPick") {
    state.familySenior = Number(e.target.value);
    render();
  }
});

view.addEventListener("input", e => {
  if (e.target.id === "memberOther") {
    state.memberOther = e.target.value;
  }
});

window.addEventListener("hashchange", () => {
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

async function loadSeniorsFromApi() {
  setApiStatus("loading", "Loading latest senior data...");
  try {
    const response = await fetch("/api/seniors");
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Could not load seniors from API");
    }
    const seniors = await response.json();
    SENIORS.splice(0, SENIORS.length, ...seniors);
    setApiStatus("success", "Senior data loaded successfully.");
  } catch {
    setApiStatus("error", "Backend unavailable. Showing the last available demo data.", true);
  }
  render();
}

async function updateSeniorInApi(id, patch) {
  setApiStatus("loading", "Saving changes...");
  try {
    const response = await fetch(`/api/seniors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!response.ok) throw new Error("Could not save senior update");
    setApiStatus("success", "Changes saved.");
  } catch {
    setApiStatus("error", "Changes could not be saved. Please retry.", true);
  }
}

async function submitCheckin(answers, voiceUsed) {
  setApiStatus("loading", "Saving check-in...");
  try {
    const response = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seniorId: state.familySenior || 1,
        language: state.lang,
        answers,
        voiceUsed
      })
    });
    if (!response.ok) throw new Error("Check-in submission failed");
    setApiStatus("success", "Check-in submitted.");
  } catch {
    setApiStatus("error", "Check-in was not saved. Please retry.", true);
  }
}

async function submitMemberUpdate(currentState) {
  setApiStatus("loading", "Sharing the health update...");
  try {
    const response = await fetch("/api/member-updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seniorId: 1,
        concerns: Array.from(currentState.memberConcerns),
        literacy: currentState.memberLiteracy,
        notes: currentState.memberOther,
        consent: true
      })
    });
    if (!response.ok) throw new Error("Health update failed");
    setApiStatus("success", "Health update shared with the care team.");
  } catch {
    setApiStatus("error", "Health update was not shared. Please retry.", true);
  }
}

document.addEventListener("click", e => {
  const button = e.target.closest("button[data-done], button[data-fb]");
  if (!button) {
    const retry = e.target.closest("button[data-api-retry]");
    if (retry) loadSeniorsFromApi();
    return;
  }
  if (button.dataset.done) updateSeniorInApi(Number(button.dataset.done), { done: true });
  if (button.dataset.fb) {
    setApiStatus("loading", "Saving alert feedback...");
    fetch(`/api/alerts/${Number(button.dataset.sid)}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useful: button.dataset.fb === "useful" })
    }).then(response => {
      if (!response.ok) throw new Error("Feedback failed");
      setApiStatus("success", "Feedback saved.");
    }).catch(() => setApiStatus("error", "Feedback could not be saved.", true));
  }
});

loadSeniorsFromApi();
window.scrollTo({ top: 0, behavior: "smooth" });

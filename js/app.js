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
  memberSubmitted: false
};

const view = document.getElementById("view");

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
  if (d.answer) state.step += 1;
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
  }
  if (d.voice) {
    state.voice = true;
    setTimeout(() => { state.voice = false; state.step += 1; render(); }, 2000);
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
render();
window.scrollTo({ top: 0, behavior: "smooth" });

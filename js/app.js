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
  memberAnalysis: null,
  memberVitals: { systolic: "", diastolic: "", pulse: "", spo2: "", glucose: "" },
  operations: null,
  memberSenior: 1,
  memberVitalsHistory: [],
  memberUpdates: [],
  rewards: null,
  pharmacyCoupon: null,
  pharmacyOrderDraft: null,
  checkinReward: null,
  checkinAnswers: [],
  voiceStatus: "",
  familyAuthenticated: false,
  familyAccessId: null,
  familyToken: "",
  seniorAuthenticated: false,
  seniorAccessId: null,
  seniorToken: "",
  voiceRecognition: null,
  voiceChat: {
    active: false,
    step: 0,
    transcript: [],
    interim: ""
  }
};

let apiRetryAction = null;
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
  if (route === "member" && !state.seniorAuthenticated) {
    location.hash = "senior";
    return;
  }
  const screens = {
    coordinator: () => coordinatorView(state),
    senior: () => seniorView(state),
    member: () => memberView(state),
    family: () => familyView(state),
    operations: () => operationsView(state)
  };
  const content = (screens[route] || screens.coordinator)();
  let portalChrome = "";
  const portalLabels = {
    coordinator: state.lang === "hi" ? "केयर कोऑर्डिनेटर पोर्टल" : "Care Coordinator Portal",
    senior: state.lang === "hi" ? "सीनियर चेक-इन पोर्टल" : "Senior Check-in Portal",
    member: state.lang === "hi" ? "माई हेल्थ पोर्टल" : "My Health Portal",
    family: state.lang === "hi" ? "पारिवारिक पोर्टल" : "Family Portal",
    operations: state.lang === "hi" ? "ऑपरेशन पोर्टल" : "Operations Portal"
  };
  portalChrome = `<section class="standalone-portal"><span>${state.lang === "hi" ? "अलग पोर्टल" : "Independent portal"}</span><b>${portalLabels[route] || portalLabels.coordinator}</b></section>`;
  view.innerHTML = portalChrome + content;
  document.querySelectorAll("#nav a").forEach(a => {
    a.classList.toggle("active", a.getAttribute("href") === "#" + route);
  });
  document.documentElement.lang = state.lang === "hi" ? "hi" : "en";
  document.querySelectorAll(".language-switch button").forEach(button => {
    button.classList.toggle("active", button.dataset.lang === state.lang);
  });
  document.querySelectorAll("[data-nav]").forEach(link => {
    const key = link.dataset.nav;
    if (!key || key === "brand") return;
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

function createSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.lang = state.lang === "hi" ? "hi-IN" : "en-IN";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  return recognition;
}

function startSeniorVoice() {
  if (state.voiceRecognition) state.voiceRecognition.stop();
  const recognition = createSpeechRecognition();
  if (!recognition) {
    setApiStatus("error", state.lang === "hi" ? "इस ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है। नीचे जवाब चुनें।" : "Voice recognition is not available in this browser. Please choose an answer below.");
    return;
  }
  state.voice = true;
  state.voiceStatus = state.lang === "hi" ? "बोलना शुरू करें..." : "Start speaking...";
  recognition.onresult = event => {
    const transcript = Array.from(event.results).map(result => result[0].transcript).join(" ").trim();
    state.voiceStatus = transcript;
    if (event.results[event.results.length - 1].isFinal && transcript) {
      const question = QUESTIONS[state.step];
      if (question) {
        state.checkinAnswers.push({
          question: question[state.lang],
          answer: transcript,
          source: "voice"
        });
      }
      if (state.step >= QUESTIONS.length - 1) {
        submitCheckin(state.checkinAnswers, true);
        state.checkinAnswers = [];
      }
      state.step += 1;
      state.voice = false;
      state.voiceStatus = "";
      render();
    } else {
      render();
    }
  };
  recognition.onerror = event => {
    state.voice = false;
    state.voiceStatus = "";
    const message = event.error === "not-allowed"
      ? (state.lang === "hi" ? "माइक्रोफ़ोन अनुमति दें।" : "Please allow microphone access.")
      : (state.lang === "hi" ? "आवाज़ साफ़ सुनाई नहीं दी। फिर कोशिश करें।" : "The voice could not be understood. Please try again.");
    setApiStatus("error", message);
    render();
  };
  recognition.onend = () => {
    if (state.voice) {
      state.voice = false;
      state.voiceStatus = "";
      render();
    }
  };
  state.voiceRecognition = recognition;
  const question = QUESTIONS[state.step];
  if (question) {
    speakAssistant(question[state.lang], () => recognition.start());
  } else {
    recognition.start();
  }
  render();
}

function stopMemberVoice() {
  if (state.voiceRecognition) {
    state.voiceRecognition.stop();
  }
}

function voiceChatPrompts() {
  return state.lang === "hi"
    ? [
        "Namaste. Main aapki madad karunga. Aaj aapko kis tarah ki takleef hai?",
        "Dawaai ke baare mein batayiye. Kya koi dose chhoot gayi, ya koi side effect hai?",
        "Kya aapke BP, sugar ya pulse ki koi reading hai?",
        "Ab koi aur zaroori baat batayiye. Main suna raha hoon."
      ]
    : [
        "Hello. I am here to help you. What health problem are you experiencing today?",
        "Please tell me about your medicines. Did you miss a dose or have any side effect?",
        "Do you know your blood pressure, sugar or pulse reading?",
        "Please tell me anything else important you would like the care team to know."
      ];
}

function speakAssistant(text, onEnd) {
  if (!("speechSynthesis" in window)) {
    if (onEnd) onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = state.lang === "hi" ? "hi-IN" : "en-IN";
  utterance.rate = 0.78;
  utterance.pitch = 1;
  utterance.onend = () => { if (onEnd) onEnd(); };
  window.speechSynthesis.speak(utterance);
}

function listenForVoiceChatAnswer() {
  const recognition = createSpeechRecognition();
  if (!recognition) {
    setApiStatus("error", state.lang === "hi" ? "इस ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है।" : "Voice recognition is unavailable in this browser.");
    stopVoiceHealthChat();
    return;
  }

  state.voiceRecognition = recognition;
  state.voice = true;
  state.voiceStatus = state.lang === "hi" ? "बोलिए, मैं सुन रहा हूँ..." : "Please speak, I am listening...";
  recognition.onresult = event => {
    const transcript = Array.from(event.results).map(result => result[0].transcript).join(" ").trim();
    state.voiceChat.interim = transcript;
    state.voiceStatus = transcript || state.voiceStatus;
    if (event.results[event.results.length - 1].isFinal && transcript) {
      recognition.stop();
    }
    render();
  };
  recognition.onend = () => {
    const answer = state.voiceChat.interim.trim();
    state.voiceChat.interim = "";
    state.voice = false;
    if (!answer || !state.voiceChat.active) {
      render();
      return;
    }
    const prompts = voiceChatPrompts();
    const prompt = prompts[state.voiceChat.step] || "";
    state.voiceChat.transcript.push({ prompt, answer, source: "voice" });
    state.memberOther = state.voiceChat.transcript.map(item => item.answer).join(" ");
    state.voiceChat.step += 1;
    if (state.voiceChat.step >= prompts.length) {
      state.voiceChat.active = false;
      state.voiceStatus = "";
        submitMemberUpdate(state);
      return;
    }
    render();
    speakAssistant(prompts[state.voiceChat.step], listenForVoiceChatAnswer);
  };
  recognition.onerror = event => {
    state.voice = false;
    state.voiceStatus = event.error === "not-allowed"
      ? (state.lang === "hi" ? "माइक्रोफ़ोन अनुमति दें।" : "Please allow microphone access.")
      : (state.lang === "hi" ? "फिर से बोलने का प्रयास करें।" : "Please try speaking again.");
    render();
  };
  recognition.start();
  render();
}

function startVoiceHealthChat() {
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    setApiStatus("error", state.lang === "hi" ? "इस ब्राउज़र में आवाज़ चैट उपलब्ध नहीं है।" : "Voice chat is unavailable in this browser.");
    return;
  }
  state.voiceChat.active = true;
  state.voiceChat.step = 0;
  state.voiceChat.transcript = [];
  state.voiceChat.interim = "";
  state.memberSubmitted = false;
  render();
  const prompt = voiceChatPrompts()[0];
  speakAssistant(prompt, listenForVoiceChatAnswer);
}

function stopVoiceHealthChat() {
  state.voiceChat.active = false;
  state.voice = false;
  state.voiceStatus = "";
  if (state.voiceRecognition) {
    state.voiceRecognition.onend = null;
    state.voiceRecognition.stop();
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  render();
}

function startMemberVoice() {
  if (state.voiceRecognition) state.voiceRecognition.stop();
  const recognition = createSpeechRecognition();
  if (!recognition) {
    setApiStatus("error", state.lang === "hi" ? "इस ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है। टेक्स्ट लिखकर जानकारी दें।" : "Voice recognition is unavailable in this browser. Please type your health update.");
    return;
  }
  state.voice = true;
  state.voiceStatus = state.lang === "hi" ? "बोलना शुरू करें..." : "Start speaking...";
  recognition.onresult = event => {
    const transcript = Array.from(event.results).map(result => result[0].transcript).join(" ").trim();
    state.voiceStatus = transcript;
    if (event.results[event.results.length - 1].isFinal && transcript) {
      state.memberOther = state.memberOther.trim()
        ? `${state.memberOther.trim()} ${transcript}`
        : transcript;
      state.voice = false;
      state.voiceStatus = "";
      render();
    } else {
      render();
    }
  };
  recognition.onerror = event => {
    state.voice = false;
    state.voiceStatus = "";
    const message = event.error === "not-allowed"
      ? (state.lang === "hi" ? "माइक्रोफ़ोन अनुमति दें।" : "Please allow microphone access.")
      : (state.lang === "hi" ? "आवाज़ साफ़ सुनाई नहीं दी। फिर कोशिश करें।" : "The voice could not be understood. Please try again.");
    setApiStatus("error", message);
    render();
  };
  recognition.onend = () => {
    if (state.voice) {
      state.voice = false;
      state.voiceStatus = "";
      render();
    }
  };
  state.voiceRecognition = recognition;
  recognition.start();
  render();
}

// One click handler for the whole page, it checks data attributes
view.addEventListener("click", e => {
  const t = e.target.closest("button");
  if (!t) return;
  const d = t.dataset;

  if (d.id) state.selected = Number(d.id);
  if (d.filter) { state.filter = d.filter; state.selected = null; }
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
    state.memberAnalysis = null;
  }
  if (d.literacy) {
    state.memberLiteracy = d.literacy;
    state.memberSubmitted = false;
  }
  if (d.memberSubmit) {
    submitMemberUpdate(state);
  }
  if (d.memberHealth) {
    state.memberSenior = state.seniorAccessId || state.memberSenior;
    loadMemberDataFromApi();
    location.hash = "member";
  }
  if (d.seniorLogin) {
    loginSeniorPortal();
  }
  if (d.seniorLogout) {
    localStorage.removeItem("samarthSeniorSession");
    state.seniorAuthenticated = false;
    state.seniorToken = "";
    state.seniorAccessId = null;
    state.step = 0;
    location.hash = "senior";
    render();
  }
  if (d.familyLogin) {
    loginFamilyPortal();
  }
  if (d.familyLogout) {
    const token = state.familyToken;
    state.familyAuthenticated = false;
    state.familyToken = "";
    state.familyAccessId = null;
    fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    }).catch(() => {});
    render();
  }
  if (d.redeemRewards) {
    redeemRewardPoints(state.memberSenior || 1);
  }
  if (d.placePharmacyOrder) {
    placePharmacyOrder(state.memberSenior || 1);
  }
  if (d.memberVoice) {
    startMemberVoice();
  }
  if (d.voiceChat) {
    startVoiceHealthChat();
  }
  if (d.stopVoiceChat) {
    stopVoiceHealthChat();
  }
  if (d.speak) {
    const question = QUESTIONS[state.step];
    if (question && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(question[state.lang]);
      utterance.lang = state.lang === "hi" ? "hi-IN" : "en-IN";
      utterance.rate = 0.82;
      window.speechSynthesis.speak(utterance);
    }
  }
  if (d.voice) {
    startSeniorVoice();
  }
  if (d.restart) state.step = 0;
  render();
});

view.addEventListener("change", e => {
  if (e.target.id === "familyPick") {
    state.familySenior = Number(e.target.value);
    render();
  }
  if (e.target.id === "memberPick") {
    state.memberSenior = Number(e.target.value);
    state.memberSubmitted = false;
    state.memberAnalysis = null;
    loadMemberDataFromApi();
  }
});

view.addEventListener("input", e => {
  if (e.target.id === "memberOther") {
    state.memberOther = e.target.value;
    state.memberAnalysis = null;
  }
  if (e.target.dataset.memberVital) {
    state.memberVitals[e.target.dataset.memberVital] = e.target.value;
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
    const apiSeniors = await response.json();
    const localSeniors = SENIORS.map(senior => ({ ...senior }));
    const seniors = localSeniors.map(localSenior => {
      const apiSenior = apiSeniors.find(senior => senior.id === localSenior.id);
      return {
        ...localSenior,
        feedback: apiSenior?.feedback || null,
        done: Boolean(apiSenior?.done)
      };
    });
    SENIORS.splice(0, SENIORS.length, ...seniors);
    state.done.clear();
    state.feedback = {};
    seniors.forEach(senior => {
      if (senior.done) state.done.add(senior.id);
      if (senior.feedback) state.feedback[senior.id] = senior.feedback;
    });
    setApiStatus("success", "Senior data loaded successfully.");
  } catch {
    setApiStatus("error", "Backend unavailable. No live senior data could be loaded.", true);
  }
  render();
}

async function loadMemberDataFromApi() {
  const seniorId = state.memberSenior || 1;
  try {
    const [vitalsResponse, updatesResponse, rewardsResponse] = await Promise.all([
      fetch(`/api/vitals/${seniorId}`),
      fetch(`/api/member-updates/${seniorId}`),
      fetch(`/api/rewards/${seniorId}`)
    ]);
    if (!vitalsResponse.ok || !updatesResponse.ok || !rewardsResponse.ok) throw new Error("Member history unavailable");
    state.memberVitalsHistory = await vitalsResponse.json();
    state.memberUpdates = await updatesResponse.json();
    state.rewards = await rewardsResponse.json();
    render();
  } catch {
    state.memberVitalsHistory = [];
    state.memberUpdates = [];
  }
}

async function loadOperationsFromApi() {
  try {
    const response = await fetch("/api/operations");
    if (!response.ok) throw new Error("Could not load operations");
    state.operations = await response.json();
    render();
  } catch {
    // Keep demo values visible until live operations data becomes available.
  }
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
    await loadSeniorsFromApi();
  } catch {
    apiRetryAction = () => updateSeniorInApi(id, patch);
    setApiStatus("error", "Changes could not be saved. Please retry.", true);
  }
}

async function redeemRewardPoints(seniorId) {
  const amountInput = document.getElementById("medicineOrderAmount");
  const orderAmount = Number(amountInput?.value);
  if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
    setApiStatus("error", state.lang === "hi" ? "मेडिसिन ऑर्डर की वैध राशि डालें।" : "Enter a valid medicine order amount.");
    return;
  }
  setApiStatus("loading", "Checking Samarth Health Pharmacy redemption...");
  try {
    const response = await fetch(`/api/rewards/${seniorId}/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderAmount })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Redemption failed");
    state.pharmacyCoupon = body.couponCode;
    state.pharmacyOrderDraft = { medicineName: document.getElementById("medicineName")?.value?.trim(), orderAmount };
    setApiStatus("success", `${body.discountPercent}% discount applied at ${body.partner}. Pay ₹${body.payableAmount} after redemption.`);
    await loadMemberDataFromApi();
    render();
  } catch (error) {
    apiRetryAction = () => redeemRewardPoints(seniorId);
    setApiStatus("error", error.message || "Reward redemption failed.", true);
  }
}

async function loginSeniorPortal() {
  const idInput = document.getElementById("seniorLoginId");
  const nameInput = document.getElementById("seniorLoginName");
  const passwordInput = document.getElementById("seniorLoginPassword");
  const seniorId = Number(idInput?.value);
  const seniorName = nameInput?.value?.trim();
  const password = passwordInput?.value?.trim();
  if (!/^(?:[1-9]|1[0-9]|20)$/.test(String(idInput?.value || "")) || !seniorName || !password) {
    setApiStatus("error", state.lang === "hi" ? "वैध सीनियर ID और पासवर्ड डालें।" : "Enter a valid Senior ID and password.");
    return;
  }
  const knownSenior = SENIORS.find(item => item.id === seniorId);
  const senior = knownSenior || { id: seniorId, name: seniorName };
  if (knownSenior && knownSenior.name.toLocaleLowerCase() !== seniorName.toLocaleLowerCase()) {
    setApiStatus("error", state.lang === "hi" ? "ID और नाम मेल नहीं खाते।" : "Senior ID and name do not match.");
    return;
  }
  setApiStatus("loading", "Signing in to the senior portal...");
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: `senior${seniorId}`, name: seniorName, password })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Invalid senior credentials");
    state.seniorAuthenticated = true;
    state.seniorToken = body.token;
    state.seniorAccessId = seniorId;
    state.familySenior = seniorId;
    state.memberSenior = seniorId;
    localStorage.setItem("samarthSeniorSession", JSON.stringify({ seniorId, seniorName, password }));
    await loadMemberDataFromApi();
    setApiStatus("success", state.lang === "hi" ? `${senior.name}, आपका पोर्टल खुल गया।` : `${senior.name}, your portal is ready.`);
    render();
  } catch (error) {
    apiRetryAction = loginSeniorPortal;
    setApiStatus("error", error.message || "Senior login failed.", true);
  }
}

async function loginFamilyPortal() {
  const idInput = document.getElementById("familySeniorId");
  const passwordInput = document.getElementById("familyPassword");
  const seniorId = Number(idInput?.value);
  const password = passwordInput?.value?.trim();
  const seniorExists = SENIORS.some(senior => senior.id === seniorId);
  if (!seniorExists || !password) {
    setApiStatus("error", state.lang === "hi" ? "वैध वरिष्ठ ID और पासवर्ड डालें।" : "Enter a valid senior ID and password.");
    return;
  }
  setApiStatus("loading", "Verifying family access...");
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "family", password })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Invalid family credentials");
    state.familyAuthenticated = true;
    state.familyToken = body.token;
    state.familyAccessId = seniorId;
    state.familySenior = seniorId;
    setApiStatus("success", state.lang === "hi" ? "पारिवारिक पहुँच सफल।" : "Family access confirmed.");
    render();
  } catch (error) {
    apiRetryAction = loginFamilyPortal;
    setApiStatus("error", error.message || "Family login failed.", true);
  }
}

async function placePharmacyOrder(seniorId) {
  const amountInput = document.getElementById("medicineOrderAmount");
  const medicineInput = document.getElementById("medicineName");
  const orderAmount = Number(amountInput?.value || state.pharmacyOrderDraft?.orderAmount);
  const medicineName = medicineInput?.value?.trim() || state.pharmacyOrderDraft?.medicineName;
  if (!medicineName || !Number.isFinite(orderAmount) || orderAmount <= 0) {
    setApiStatus("error", state.lang === "hi" ? "दवा का नाम और वैध राशि डालें।" : "Enter a medicine name and valid amount.");
    return;
  }
  setApiStatus("loading", "Placing order with Samarth Health Pharmacy...");
  try {
    const response = await fetch("/api/pharmacy/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seniorId,
        items: [{ name: medicineName, price: orderAmount, quantity: 1 }],
        couponCode: state.pharmacyCoupon
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Order could not be placed");
    state.pharmacyCoupon = null;
    setApiStatus("success", `Order #${body.id} confirmed. Amount paid ₹${body.payableAmount}; discount ₹${body.discountAmount}.`);
    await loadMemberDataFromApi();
    render();
  } catch (error) {
    apiRetryAction = () => placePharmacyOrder(seniorId);
    setApiStatus("error", error.message || "Pharmacy order failed.", true);
  }
}

async function submitCheckin(answers, voiceUsed) {
  setApiStatus("loading", "Saving check-in...");
  try {
    const response = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seniorId: state.seniorAccessId || state.familySenior || 1,
        language: state.lang,
        answers,
        voiceUsed
      })
    });
    if (!response.ok) throw new Error("Check-in submission failed");
    const saved = await response.json();
    state.checkinReward = saved.reward || null;
    setApiStatus("success", "Check-in submitted.");
    await loadMemberDataFromApi();
    render();
  } catch {
    apiRetryAction = () => submitCheckin(answers, voiceUsed);
    setApiStatus("error", "Check-in was not saved. Please retry.", true);
  }
}

async function submitMemberUpdate(currentState) {
  setApiStatus("loading", "Sharing the health update...");
  try {
    currentState.memberSubmitted = false;
    const response = await fetch("/api/member-updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seniorId: currentState.memberSenior || 1,
        concerns: Array.from(currentState.memberConcerns),
        literacy: currentState.memberLiteracy,
        notes: currentState.memberOther,
        language: currentState.lang,
        consent: true
      })
    });
    if (!response.ok) throw new Error("Health update failed");
    const saved = await response.json();
    currentState.memberAnalysis = saved.nlp || null;
    const vitals = {};
    for (const [key, value] of Object.entries(currentState.memberVitals)) {
      if (value !== "" && Number.isFinite(Number(value))) vitals[key] = Number(value);
    }
    if (Object.keys(vitals).length) {
      const vitalsResponse = await fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seniorId: currentState.memberSenior || 1, ...vitals, source: "member_voice_or_manual" })
      });
      if (!vitalsResponse.ok) throw new Error("Vitals could not be saved");
    }
    currentState.memberSubmitted = true;
    setApiStatus("success", "Health update shared with the care team.");
    await loadMemberDataFromApi();
    render();
  } catch {
    currentState.memberSubmitted = false;
    apiRetryAction = () => submitMemberUpdate(currentState);
    setApiStatus("error", "Health update was not shared. Please retry.", true);
  }
}

document.addEventListener("click", e => {
  const button = e.target.closest("button[data-done], button[data-fb]");
  if (!button) {
    const retry = e.target.closest("button[data-api-retry]");
    if (retry) {
      if (apiRetryAction) apiRetryAction();
      else loadSeniorsFromApi();
    }
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
      loadSeniorsFromApi();
      loadOperationsFromApi();
    }).catch(() => {
      apiRetryAction = () => updateSeniorInApi(Number(button.dataset.sid), { feedback: button.dataset.fb });
      setApiStatus("error", "Feedback could not be saved.", true);
    });
  }
});

async function restoreSeniorSession() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem("samarthSeniorSession"));
  } catch {
    saved = null;
  }
  if (!saved || !/^(?:[1-9]|1[0-9]|20)$/.test(String(saved.seniorId)) || !String(saved.seniorName || "").trim() || !String(saved.password || "").trim()) {
    return;
  }
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: `senior${saved.seniorId}`,
        name: saved.seniorName,
        password: saved.password
      })
    });
    if (!response.ok) return;
    const body = await response.json();
    state.seniorAuthenticated = true;
    state.seniorToken = body.token;
    state.seniorAccessId = saved.seniorId;
    state.familySenior = saved.seniorId;
    state.memberSenior = saved.seniorId;
  } catch {
    localStorage.removeItem("samarthSeniorSession");
  }
}

restoreSeniorSession().finally(() => {
  loadSeniorsFromApi();
  loadOperationsFromApi();
  loadMemberDataFromApi();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

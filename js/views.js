// Each function returns the HTML for one screen. Event wiring lives in app.js.

function copy(state, en, hi) {
  return state.lang === "hi" ? hi : en;
}

function levelOf(score) {
  if (score >= 70) return "high";
  if (score >= 45) return "mid";
  return "low";
}
const LEVEL_LABEL = { high: "Act today", mid: "Watch closely", low: "Stable" };
const LEVEL_COLOR = { high: "#c23b2e", mid: "#d98a1f", low: "#3f8f5b" };

function queueRow(s, selectedId, done, state) {
  const lvl = levelOf(s.score);
  const cls = ["row", lvl, s.id === selectedId ? "sel" : "", done.has(s.id) ? "done" : ""].join(" ");
  return `<li><button class="${cls}" data-id="${s.id}">
    <span class="score">${s.score}</span>
    <span class="row-copy"><b>${s.name}, ${s.age}</b><small>${s.city} · ${s.reasons[0]}</small><em>${lvl === "high" ? copy(state, "Call today", "आज कॉल करें") : lvl === "mid" ? copy(state, "Call soon", "जल्द कॉल करें") : copy(state, "Within normal range", "सामान्य सीमा में")}</em></span>
  </button></li>`;
}

function coordinatorView(state) {
  const list = SENIORS
    .filter(s => state.filter === "all" || levelOf(s.score) === state.filter)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  const sel = list.find(s => s.id === state.selected) || list[0];
  const urgent = SENIORS.filter(s => levelOf(s.score) === "high").length;
  const hi = state.lang === "hi";
  const filters = hi
    ? [["all", "सभी"], ["high", "आज संपर्क करें"], ["mid", "नज़र रखें"], ["low", "स्थिर"]]
    : [["all", "All"], ["high", "Act today"], ["mid", "Watch closely"], ["low", "Stable"]];
  const filterHtml = filters
    .map(([k, t]) => `<button class="chip ${state.filter === k ? "on" : ""}" data-filter="${k}">${t}</button>`).join("");

  return `
    <section class="page-intro">
      <div>
        <p class="eyebrow">Samarth Early Warning</p>
        <h1>${copy(state, "Which senior should be contacted first today?", "आज किस वरिष्ठ से पहले बात करनी चाहिए?")}</h1>
        <p class="sub">${copy(state, `${urgent} seniors need attention today. Each score compares a senior with their own recent baseline.`, `${urgent} वरिष्ठों को आज ध्यान देने की ज़रूरत है। हर स्कोर उनकी अपनी हाल की स्थिति से तुलना करता है।`)}</p>
      </div>
      <div class="how-it-works">
        <span><b>1</b> ${copy(state, "Combine signals", "सिग्नल जोड़ें")}</span>
        <span><b>2</b> ${copy(state, "Notice the change", "बदलाव पहचानें")}</span>
        <span><b>3</b> ${copy(state, "A person follows up", "टीम फ़ॉलो-अप करे")}</span>
      </div>
    </section>
    <div class="split">
      <section>
        <div class="queue-heading"><h2>${copy(state, "Today's priority list", "आज की प्राथमिकता सूची")}</h2><span>${list.length} ${copy(state, "seniors", "वरिष्ठ")}</span></div>
        <div class="filters">${filterHtml}</div>
        <ul class="queue">${list.map(s => queueRow(s, sel.id, state.done, state)).join("")}</ul>
      </section>
      <section class="panel detail">${detailView(sel, state)}</section>
    </div>`;
}

function detailView(s, state) {
  const lvl = levelOf(s.score);
  const v = s.vitals;
  const vital = (key, label, val) =>
    `<div class="vital ${s.off.includes(key) ? "off" : ""}"><small>${label}</small><b>${val}</b></div>`;
  const fb = state.feedback[s.id];
  return `
    <div class="detail-heading">
      <div><p class="eyebrow">Selected senior</p><h1>${s.name}</h1></div>
      <span class="badge ${lvl}">${LEVEL_LABEL[lvl]} · ${s.score}/100</span>
    </div>
    <p class="sub">${s.age} years · ${s.city} · prefers ${s.lang} · Last check-in: ${s.lastCheckin}</p>
    <div class="signal-summary">
      <div><span>Changed signals</span><b>${s.off.length ? s.off.length + 1 : 1} areas</b></div>
      <div><span>Comparison</span><b>Personal baseline</b></div>
      <div><span>Confidence</span><b>${lvl === "high" ? "High" : lvl === "mid" ? "Medium" : "Low risk"}</b></div>
    </div>
    ${sparkline(s.trend, LEVEL_COLOR[lvl])}
    <p class="chart-caption">Risk score during the last 7 days</p>
    <h2>Why this alert?</h2>
    <ul class="reasons">${s.reasons.map(r => `<li>${r}</li>`).join("")}</ul>
    <div class="action"><b>Recommended action in the next 24 hours</b><br>${s.action}</div>
    <div class="care-context">
      <div><span>Information sources</span><b>Vitals · Medicines · Call notes</b></div>
      <div><span>Risk changed because</span><b>${lvl === "high" ? "Several signals changed together" : lvl === "mid" ? "Some signals need a closer check" : "No persistent multi-signal change"}</b></div>
      <div><span>Do not use this score to</span><b>Diagnose or replace a clinical decision</b></div>
    </div>
    <h2>Latest vitals <small>(red means outside this senior's personal baseline)</small></h2>
    <div class="vitals">
      ${vital("bp", "BP", v.bp)}${vital("spo2", "SpO2", v.spo2)}${vital("sugar", "Sugar", v.sugar)}${vital("weight", "Weight", v.weight)}
    </div>
    <h2>From the latest call</h2>
    <p class="note">"${s.note}"</p>
    <div class="btns">
      <button class="btn primary" data-done="${s.id}">${state.done.has(s.id) ? "Follow-up complete" : "Mark follow-up complete"}</button>
      <button class="btn" data-fb="useful" data-sid="${s.id}">Alert was useful</button>
      <button class="btn" data-fb="notuseful" data-sid="${s.id}">Alert was not useful</button>
    </div>
    <p class="feedback">${fb ? "Thank you. This feedback will help improve future priority scores." : "This is a risk flag, not a diagnosis. The care coordinator makes the final decision."}</p>
    <p class="privacy-note"><b>Privacy:</b> Only authorised care team members can see this information. Family updates are shared only with the senior's consent.</p>`;
}

function seniorView(state) {
  const lang = state.lang;
  const q = QUESTIONS[state.step];
  if (!q) {
    return `<div class="senior-wrap"><div class="phone">
      <div class="checkin-icon">✓</div>
      <h1>${copy(state, "Thank you", "धन्यवाद")}</h1>
      <p class="q">${copy(state, "Your answers have been saved. Your care coordinator will get in touch if a follow-up is needed.", "आपके जवाब सुरक्षित हो गए हैं। फ़ॉलो-अप की ज़रूरत हो तो देखभाल समन्वयक आपसे संपर्क करेंगे।")}</p>
      <p class="consent-note">${copy(state, "Your answers will not be shared with your family without your consent.", "आपकी सहमति के बिना आपके जवाब परिवार के साथ साझा नहीं किए जाएंगे।")}</p>
      <button class="big" data-restart="1">${copy(state, "Start again", "फिर से शुरू करें")}</button>
    </div></div>`;
  }
  const answers = ANSWERS[lang]
    .map((a, i) => `<button class="big ${i === 0 ? "good" : i === 2 ? "bad" : ""}" data-answer="${i}">${a}</button>`).join("");
  const hint = state.voice
    ? copy(state, state.voiceStatus || "Listening...", state.voiceStatus || "सुन रहा हूँ...")
    : copy(state, "Or give a missed call to our number", "या हमारे नंबर पर मिस्ड कॉल दें");
  return `
    <div class="senior-wrap"><div class="phone">
      <p class="eyebrow">${copy(state, "Today's quick check-in", "आज का आसान चेक-इन")}</p>
      <div class="lang">
        <button class="chip ${lang === "en" ? "on" : ""}" data-lang="en">English</button>
        <button class="chip ${lang === "hi" ? "on" : ""}" data-lang="hi">हिंदी</button>
      </div>
      <p class="hint">${state.step + 1} / ${QUESTIONS.length}</p>
      <p class="q">${q[lang]}</p>
      ${answers}
      <button class="big mic" data-voice="1">${copy(state, "Tell us by voice", "आवाज़ से बताएं")}</button>
      <button class="big speak-button" data-speak="1">${copy(state, "Hear this question", "यह सवाल सुनें")}</button>
      <p class="hint">${hint}</p>
    </div></div>`;
}

function memberView(state) {
  const concernOptions = [
    { key: "bp", icon: "01", label: copy(state, "Blood pressure is high", "ब्लड प्रेशर बढ़ रहा है"), detail: copy(state, "Headache, dizziness, high reading or feeling unwell", "सिरदर्द, चक्कर, रीडिंग ज्यादा या असहजता") },
    { key: "medicine", icon: "02", label: copy(state, "Medicine problem", "दवा से जुड़ी परेशानी"), detail: copy(state, "Missed dose, side effects or confusion about medicines", "दवा छूटना, साइड इफेक्ट या दवा लेने में उलझन") },
    { key: "sleep", icon: "03", label: copy(state, "Sleep problem", "नींद की समस्या"), detail: copy(state, "Not sleeping, waking often or feeling too sleepy", "नींद नहीं आना, बार-बार जागना या बहुत नींद आना") },
    { key: "food", icon: "04", label: copy(state, "Food or weakness", "खाना या कमजोरी"), detail: copy(state, "Poor appetite, skipped meals or feeling weak", "भूख कम लगना, खाना छोड़ना या कमजोरी") },
    { key: "pain", icon: "05", label: copy(state, "Pain or discomfort", "दर्द या असहजता"), detail: copy(state, "Body pain, headache, chest pain or difficulty walking", "शरीर में दर्द, सिरदर्द, सीने में दर्द या चलने में परेशानी") }
  ];
  const literacyOptions = [
    { key: "comfortable", label: copy(state, "Comfortable reading and writing", "पढ़ना और लिखना ठीक है"), detail: copy(state, "I can read forms and write my own notes", "मैं फ़ॉर्म पढ़ सकता/सकती हूँ और अपने नोट लिख सकता/सकती हूँ") },
    { key: "reading", label: copy(state, "Can read, but need help writing", "पढ़ सकता हूँ, लिखने में मदद चाहिए"), detail: copy(state, "I can read messages but need help with forms", "मैं संदेश पढ़ सकता हूँ, लेकिन फ़ॉर्म भरने में मदद चाहिए") },
    { key: "help", label: copy(state, "I prefer help from someone", "किसी से मदद लेना पसंद है"), detail: copy(state, "Please read questions aloud or help me record answers", "कृपया सवाल पढ़कर सुनाएँ या जवाब लिखने में मदद करें") }
  ];
  const concerns = concernOptions.map(item => `
    <button type="button" class="concern-card ${state.memberConcerns.has(item.key) ? "selected" : ""}" data-concern="${item.key}" aria-pressed="${state.memberConcerns.has(item.key)}">
      <span class="concern-icon">${item.icon}</span>
      <span><b>${item.label}</b><small>${item.detail}</small></span>
      <span class="checkmark">${state.memberConcerns.has(item.key) ? "✓" : "+"}</span>
    </button>
  `).join("");
  const literacy = literacyOptions.map(item => `
    <button type="button" class="literacy-card ${state.memberLiteracy === item.key ? "selected" : ""}" data-literacy="${item.key}" aria-pressed="${state.memberLiteracy === item.key}">
      <span><b>${item.label}</b><small>${item.detail}</small></span>
      <span class="radio-mark">${state.memberLiteracy === item.key ? "●" : "○"}</span>
    </button>
  `).join("");
  const submitted = state.memberSubmitted
    ? `<div class="member-success"><b>${copy(state, "Thank you. Your update has been shared with the care team.", "धन्यवाद। आपकी जानकारी देखभाल टीम के साथ साझा कर दी गई है।")}</b><span>${copy(state, "They will review it during the next check-in. For urgent symptoms, contact your doctor or emergency service.", "टीम अगली जाँच में इसे देखेगी। आपात स्थिति में डॉक्टर या स्थानीय इमरजेंसी सेवा से संपर्क करें।")}</span></div>`
    : "";
  const analysis = state.memberAnalysis
    ? `<div class="nlp-result ${state.memberAnalysis.riskLevel}">
        <div><b>${copy(state, "Voice or text review", "आवाज़ या टेक्स्ट की समीक्षा")}</b><span>${copy(state, state.memberAnalysis.summary, state.memberAnalysis.summary)}</span></div>
        <strong>${state.memberAnalysis.riskLevel.toUpperCase()}</strong>
      </div>`
    : "";
  return `
    <div class="member-dashboard">
      <section class="member-intro">
        <div>
          <p class="eyebrow">${copy(state, "Member dashboard", "सदस्य डैशबॉर्ड")}</p>
          <h1>${copy(state, "Tell us about your health today", "आज अपने स्वास्थ्य के बारे में बताएं")}</h1>
          <p class="sub">${copy(state, "Choose BP, medicine or other health problems that apply today. You can add more details below.", "आज जो ब्लड प्रेशर, दवा या दूसरी स्वास्थ्य समस्या है उसे चुनें। नीचे और जानकारी लिख सकते हैं।")}</p>
        </div>
        <div class="member-status">
          <span>${copy(state, "Today's check-in", "आज का चेक-इन")}</span>
          <b>${state.memberConcerns.size ? copy(state, `${state.memberConcerns.size} problem${state.memberConcerns.size === 1 ? "" : "s"} selected`, `${state.memberConcerns.size} समस्याएँ चुनी गईं`) : copy(state, "Not completed yet", "अभी पूरा नहीं हुआ")}</b>
        </div>
      </section>
      <section class="health-metrics" aria-label="${copy(state, "Today's health summary", "आज का स्वास्थ्य सारांश")}">
        <div class="health-metric bp"><span>${copy(state, "Blood pressure", "ब्लड प्रेशर")}</span><b>158/96</b><small>${copy(state, "Outside personal baseline", "अपनी सामान्य सीमा से बाहर")}</small></div>
        <div class="health-metric sleep"><span>${copy(state, "Sleep last night", "कल रात की नींद")}</span><b>4.5 hrs</b><small>${copy(state, "3 hrs less than usual", "सामान्य से 3 घंटे कम")}</small></div>
        <div class="health-metric heart"><span>${copy(state, "Heart rate", "हार्ट रेट")}</span><b>78 bpm</b><small>${copy(state, "Within usual range", "सामान्य सीमा में")}</small></div>
        <div class="health-metric spo2"><span>SpO2</span><b>96%</b><small>${copy(state, "Checked this morning", "आज सुबह जाँच हुई")}</small></div>
      </section>
      ${submitted}
      <div class="member-grid">
        <section class="panel member-section">
          <div class="section-heading">
            <div><p class="eyebrow">${copy(state, "Step 1", "कदम 1")}</p><h2>${copy(state, "Which health problems do you have?", "आपको कौन-सी स्वास्थ्य समस्याएँ हैं?")}</h2></div>
            <span>${copy(state, "Select all that apply", "लागू सभी चुनें")}</span>
          </div>
          <div class="concern-grid">${concerns}</div>
        </section>
        <section class="panel member-section">
          <div class="section-heading">
            <div><p class="eyebrow">${copy(state, "Step 2", "कदम 2")}</p><h2>${copy(state, "Would you like reading or writing support?", "क्या पढ़ने या लिखने में मदद चाहिए?")}</h2></div>
          </div>
          <div class="literacy-options">${literacy}</div>
          <div class="wellbeing-card">
            <div>
              <span>${copy(state, "Wellbeing snapshot", "स्वास्थ्य स्थिति")}</span>
              <b>${copy(state, "Needs attention", "ध्यान देना ज़रूरी")}</b>
            </div>
            <div class="wellbeing-ring"><span>86</span><small>risk</small></div>
          </div>
        </section>
      </div>
      <section class="panel member-details">
        <div class="section-heading">
          <div><p class="eyebrow">${copy(state, "Step 3", "कदम 3")}</p><h2>${copy(state, "Describe any other problem", "कोई दूसरी परेशानी बताएं")}</h2></div>
        </div>
        <div class="voice-chat-card ${state.voiceChat.active ? "active" : ""}" aria-live="polite">
          <div class="voice-chat-header">
            <div>
              <span class="voice-chat-icon">${state.voiceChat.active ? "●" : "◉"}</span>
              <div>
                <b>${copy(state, "Talk to Samarth", "समर्थ से बात करें")}</b>
                <small>${state.voiceChat.active
                  ? copy(state, "Voice assistant is listening", "आवाज़ सहायक सुन रहा है")
                  : copy(state, "No reading or writing needed", "पढ़ने या लिखने की जरूरत नहीं")}</small>
              </div>
            </div>
            <button type="button" class="${state.voiceChat.active ? "btn stop" : "btn primary"}" data-${state.voiceChat.active ? "stop-voice-chat" : "voice-chat"}="1">
              ${state.voiceChat.active
                ? copy(state, "Stop chat", "चैट रोकें")
                : copy(state, "Start voice chat", "आवाज़ चैट शुरू करें")}
            </button>
          </div>
          ${state.voiceChat.transcript.length ? `<div class="voice-chat-transcript">
            ${state.voiceChat.transcript.map((item, index) => `<div><span>${index + 1}</span><p><b>${copy(state, "You said", "आपने कहा")}:</b> ${item.answer}</p></div>`).join("")}
          </div>` : ""}
          ${state.voiceChat.active ? `<div class="voice-chat-live"><span></span><b>${state.voiceStatus || copy(state, "Listening...", "सुन रहा हूँ...")}</b></div>` : ""}
        </div>
        <label for="memberOther">${copy(state, "Write in a sentence, or ask the care team to write it for you", "एक वाक्य में लिखें, या टीम से लिखवाने के लिए कहें")}</label>
        <textarea id="memberOther" rows="4" placeholder="${copy(state, "Example: My BP was 158/96 and I missed my morning tablet.", "उदाहरण: मेरा बीपी 158/96 था और मैंने सुबह की दवा मिस कर दी।")}">${state.memberOther}</textarea>
        <div class="vitals-entry" aria-label="${copy(state, "Optional vital readings", "वैकल्पिक स्वास्थ्य रीडिंग")}">
          <label><span>BP (systolic)</span><input type="number" min="70" max="260" inputmode="numeric" data-member-vital="systolic" value="${state.memberVitals.systolic}" placeholder="158"></label>
          <label><span>BP (diastolic)</span><input type="number" min="40" max="160" inputmode="numeric" data-member-vital="diastolic" value="${state.memberVitals.diastolic}" placeholder="96"></label>
          <label><span>${copy(state, "Pulse", "धड़कन")}</span><input type="number" min="30" max="220" inputmode="numeric" data-member-vital="pulse" value="${state.memberVitals.pulse}" placeholder="78"></label>
          <label><span>SpO2 (%)</span><input type="number" min="50" max="100" inputmode="numeric" data-member-vital="spo2" value="${state.memberVitals.spo2}" placeholder="96"></label>
          <label><span>${copy(state, "Sugar", "शुगर")}</span><input type="number" min="20" max="600" inputmode="numeric" data-member-vital="glucose" value="${state.memberVitals.glucose}" placeholder="142"></label>
        </div>
        <div class="voice-input-row">
          <button type="button" class="btn voice" data-member-voice="1" aria-pressed="${state.voice}">
            <span class="mic-icon">${state.voice ? "●" : "◉"}</span>
            ${state.voice
              ? copy(state, "Listening...", "सुन रहा हूँ...")
              : copy(state, "Record voice and convert to text", "आवाज़ रिकॉर्ड करें और टेक्स्ट में बदलें")}
          </button>
          <span class="voice-status">${state.voice ? (state.voiceStatus || copy(state, "Start speaking...", "बोलना शुरू करें...")) : copy(state, "Hindi and English voice supported", "हिंदी और अंग्रेज़ी आवाज़ उपलब्ध")}</span>
        </div>
        ${analysis}
        <div class="member-actions">
          <button class="btn primary" data-member-submit="1">${copy(state, "Share this update", "यह जानकारी साझा करें")}</button>
          <span>${copy(state, "Only your care team can see this update.", "यह जानकारी केवल आपकी देखभाल टीम देख सकती है।")}</span>
        </div>
      </section>
    </div>`;
}

function familyView(state) {
  const s = SENIORS.find(x => x.id === state.familySenior);
  const first = s.name.split(" ")[0];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const bars = s.trend.map((v, i) => `<div class="day"><i style="background:${LEVEL_COLOR[levelOf(v)]}"></i>${days[i]}</div>`).join("");
  const opts = SENIORS.map(x => `<option value="${x.id}" ${x.id === s.id ? "selected" : ""}>${x.name}</option>`).join("");
  const calm = s.score < 45;
  return `
    <div class="family">
      <p class="eyebrow">${copy(state, "Family view", "परिवार का दृश्य")}</p>
      <h1>${copy(state, `How ${first} is doing this week`, `${first} इस सप्ताह कैसा है`)}</h1>
      <p class="sub">${copy(state, "A simple weekly update for the family. The care coordinator decides when the family needs to be contacted.", "परिवार के लिए आसान साप्ताहिक अपडेट। परिवार को कब संपर्क करना है, यह देखभाल समन्वयक तय करते हैं।")}</p>
      <div class="picker"><span>${copy(state, "View for", "इनके लिए देखें")}</span><select id="familyPick">${opts}</select></div>
      ${s.score >= 80 ? `<div class="urgent"><b>${copy(state, `Please call ${first} today.`, `आज ${first} को कॉल करें।`)}</b><br>${copy(state, "Recent changes need a quick check.", "हाल के बदलावों की जल्दी जाँच ज़रूरी है।")}</div>` : ""}
      <div class="panel letter">
        <div class="letter-status ${calm ? "calm" : "attention"}"><span></span><b>${calm ? copy(state, "Normal week", "सामान्य सप्ताह") : copy(state, "Recent change", "हाल का बदलाव")}</b></div>
        <h2>${copy(state, `This week with ${first}`, `${first} के साथ इस सप्ताह`)}</h2>
        <p>${calm ? copy(state, `${first} had a calm week close to their usual routine.`, `${first} का सप्ताह सामान्य दिनचर्या जैसा रहा।`) : copy(state, `${first} has shown some changes compared with their personal baseline. The care team is following up.`, `${first} में अपनी सामान्य स्थिति से कुछ बदलाव दिखे हैं। देखभाल टीम फ़ॉलो-अप कर रही है।`)}</p>
        <p>${s.reasons[0]}.</p>
        <p>${calm ? "Nothing is urgent right now. A short call this weekend would still be welcome." : "A call this week would help. The coordinator will share the important update with the family."}</p>
        <div class="week">${bars}</div>
        <p class="hint">Green: normal · Orange: keep an eye · Red: needs attention. This summary is not a medical diagnosis.</p>
      </div>
    </div>`;
}

function operationsView(state) {
  const total = CITY_ALERTS.reduce((n, c) => n + c.alerts, 0);
  const avg = (CITY_ALERTS.reduce((n, c) => n + c.avgResponse, 0) / CITY_ALERTS.length).toFixed(1);
  const maxAlerts = Math.max(...CITY_ALERTS.map(c => c.alerts));
  const rows = CITY_ALERTS
    .map((c, index) => `
      <tr>
        <td><span class="city-rank">${index + 1}</span><b>${c.city}</b></td>
        <td><span class="city-volume"><i style="width:${Math.round((c.alerts / maxAlerts) * 100)}%"></i></span><b>${c.alerts}</b></td>
        <td><span class="response-chip ${c.avgResponse <= 3 ? "fast" : c.avgResponse <= 4 ? "normal" : "slow"}">${c.avgResponse} hrs</span></td>
      </tr>`)
    .join("");
  const outcomeRows = OUTCOMES.map(o => `
    <div class="outcome-row">
      <span>${copy(state, o.label, ({
        "Doctor visit": "डॉक्टर से मुलाकात",
        "Call resolved": "कॉल से समाधान",
        "Medicine review": "दवा की समीक्षा",
        "Family told": "परिवार को जानकारी",
        "No action": "कोई कार्रवाई नहीं"
      })[o.label])}</span>
      <div class="outcome-track"><i style="width:${o.pct}%"></i></div>
      <b>${o.pct}%</b>
    </div>`).join("");
  return `
    <div class="operations-dashboard">
      <section class="operations-header">
        <div>
          <p class="eyebrow">${copy(state, "Operations dashboard", "ऑपरेशन डैशबॉर्ड")}</p>
          <h1>${copy(state, "Care response overview", "देखभाल प्रतिक्रिया सारांश")}</h1>
          <p class="sub">${copy(state, "30-day performance overview. The goal is to reach the right person sooner and reduce unnecessary alerts.", "30 दिन का प्रदर्शन सारांश। लक्ष्य सही व्यक्ति तक जल्दी पहुंचना और अनावश्यक अलर्ट कम करना है।")}</p>
        </div>
        <div class="operations-period"><span>${copy(state, "Reporting period", "रिपोर्ट अवधि")}</span><b>${copy(state, "Last 30 days", "पिछले 30 दिन")}</b></div>
      </section>
      <div class="kpis operations-kpis">
        <div class="panel kpi accent-teal"><span class="kpi-icon">↗</span><b>${total}</b><span>${copy(state, "Priority alerts raised", "प्राथमिकता अलर्ट")}</span><small>${copy(state, "Across 6 active cities", "6 सक्रिय शहरों में")}</small></div>
        <div class="panel kpi accent-blue"><span class="kpi-icon">◷</span><b>${avg} ${copy(state, "hrs", "घंटे")}</b><span>${copy(state, "Average response time", "औसत प्रतिक्रिया समय")}</span><small>${copy(state, "0.6 hrs faster this month", "इस महीने 0.6 घंटे तेज़")}</small></div>
        <div class="panel kpi accent-green"><span class="kpi-icon">✓</span><b>71%</b><span>${copy(state, "Alerts useful to the team", "टीम के लिए उपयोगी अलर्ट")}</span><small>${copy(state, "Up 8% from last month", "पिछले महीने से 8% अधिक")}</small></div>
        <div class="panel kpi accent-purple"><span class="kpi-icon">◎</span><b>12</b><span>${copy(state, "Decoy seniors tested", "टेस्ट किए गए वरिष्ठ")}</span><small>${copy(state, "No false emergency calls", "कोई गलत इमरजेंसी कॉल नहीं")}</small></div>
      </div>
      <section class="guardrails operations-guardrails">
        <div><span class="guardrail-icon">1</span><p><b>${copy(state, "Personal baseline", "व्यक्तिगत आधार रेखा")}</b><small>${copy(state, "Uses each senior's usual pattern", "हर वरिष्ठ की सामान्य स्थिति की तुलना करता है")}</small></p></div>
        <div><span class="guardrail-icon">2</span><p><b>${copy(state, "Multi-signal score", "कई संकेतों का स्कोर")}</b><small>${copy(state, "Combined changes raise alerts", "कई बदलाव एक साथ हों तो अलर्ट होता है")}</small></p></div>
        <div><span class="guardrail-icon">3</span><p><b>${copy(state, "Human decision", "मानवीय निर्णय")}</b><small>${copy(state, "No diagnosis or automatic treatment", "कोई निदान या स्वचालित इलाज नहीं")}</small></p></div>
        <div><span class="guardrail-icon">4</span><p><b>${copy(state, "English and Hindi", "अंग्रेज़ी और हिंदी")}</b><small>${copy(state, "Understands mixed-language call notes", "मिश्रित भाषा के कॉल नोट समझता है")}</small></p></div>
      </section>
      <div class="operations-grid">
        <section class="panel operations-table-card">
          <div class="analytics-heading"><div><p class="eyebrow">${copy(state, "Response coverage", "प्रतिक्रिया कवरेज")}</p><h2>${copy(state, "Alerts by city", "शहर के अनुसार अलर्ट")}</h2></div><span class="live-chip"><i></i>${copy(state, "Live demo", "लाइव डेमो")}</span></div>
          <table class="operations-table">
            <thead><tr><th>${copy(state, "City", "शहर")}</th><th>${copy(state, "Alert volume", "अलर्ट संख्या")}</th><th>${copy(state, "Response", "प्रतिक्रिया")}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
        <section class="panel operations-outcomes-card">
          <div class="analytics-heading"><div><p class="eyebrow">${copy(state, "Follow-up outcome", "फ़ॉलो-अप परिणाम")}</p><h2>${copy(state, "After an alert", "अलर्ट के बाद")}</h2></div></div>
          <div class="outcome-summary"><div class="outcome-ring"><b>72%</b><span>${copy(state, "resolved", "समाधान")}</span></div><div><b>${copy(state, "Positive outcomes", "सकारात्मक परिणाम")}</b><span>${copy(state, "Call or clinical follow-up", "कॉल या क्लिनिकल फ़ॉलो-अप")}</span></div></div>
          <div class="outcome-list">${outcomeRows}</div>
        </section>
      </div>
    </div>`;
}

// script.js - main logic for HabitFlow app
// I decided to keep everything in one file since the app is not that big

// all my data lives here, i save it to localStorage whenever something changes
var appState = {
  embraceHabits: [],
  kickHabits: [],
  reflectionLog: [],
  lastResetDate: null
};

var STORAGE_KEY = "habitflow_v2";

// save to localStorage
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (e) {
    // this would happen if localStorage is full or disabled
    showToast("Could not save your data.", "error");
  }
}

// load from localStorage when page opens
function loadState() {
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      Object.assign(appState, JSON.parse(saved));
    }
  } catch (e) {
    showToast("Could not load saved data.", "error");
    console.log("load error:", e);
  }
}

// generate a simple unique id for each habit
// learned this trick from stackoverflow - combines timestamp + random string
function uid() {
  return Date.now() + "-" + Math.random().toString(36).slice(2, 6);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// returns Mon, Tue, Wed etc for today
function todayDay() {
  var days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return days[new Date().getDay()];
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// this took me a while to figure out - calculating days/hours/mins/secs from a date
function elapsedSince(isoDate) {
  var diff = Date.now() - new Date(isoDate).getTime();
  if (diff < 0) diff = 0;

  var totalSeconds = Math.floor(diff / 1000);
  var days = Math.floor(totalSeconds / 86400);
  var hours = Math.floor((totalSeconds % 86400) / 3600);
  var mins = Math.floor((totalSeconds % 3600) / 60);
  var secs = totalSeconds % 60;

  return { days, hours, minutes: mins, seconds: secs };
}

function clockStr(isoDate) {
  var t = elapsedSince(isoDate);
  return pad2(t.days) + "d " + pad2(t.hours) + "h " + pad2(t.minutes) + "m " + pad2(t.seconds) + "s";
}

// calculate how much money the user saved based on time clean and weekly cost
// using raw milliseconds so it works even within the first day (not just whole days)
function calcSavings(habit) {
  var diff = Date.now() - new Date(habit.lastRelapse).getTime();
  if (diff < 0) diff = 0;
  var weeks = diff / (1000 * 60 * 60 * 24 * 7); // ms to weeks
  return Math.max(0, weeks * habit.weeklyCost);
}

// format numbers as currency using built-in JS Intl API
function fmt(amount, currency) {
  if (!currency) currency = "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
}

// security thing - escape user input before putting it into innerHTML
// otherwise someone could type <script> tags and break stuff
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---- TOAST NOTIFICATIONS ----
// little popup messages at the bottom right

var toastIcons = {
  success: "fa-circle-check",
  error: "fa-circle-xmark",
  info: "fa-circle-info",
  warning: "fa-triangle-exclamation"
};

function showToast(msg, type, duration) {
  if (!type) type = "info";
  if (!duration) duration = 3800;

  var el = document.createElement("div");
  el.className = "toast " + type;
  el.innerHTML = '<i class="fa-solid ' + toastIcons[type] + '"></i> ' + msg;

  document.getElementById("toastContainer").appendChild(el);

  setTimeout(function() {
    el.classList.add("removing");
    el.addEventListener("animationend", function() {
      el.remove();
    });
  }, duration);
}


// ---- USDA FOOD API ----
// This API gives us real nutrition data (calories, protein etc)
// Docs: https://fdc.nal.usda.gov/fdc-app.html
// You need an API key from: https://fdc.nal.usda.gov/api-key-signup.html

async function verifyNutrition(query) {
  if (!query.trim()) {
    showToast("Type a food name first.", "warning");
    return;
  }

  var panel = document.getElementById("nutritionPanel");
  var grid = document.getElementById("nutritionGrid");
  var nameEl = document.getElementById("nutFoodName");

  // show loading state while we wait for API
  panel.classList.add("visible");
  grid.innerHTML = `
    <div class="skeleton" style="height:48px;"></div>
    <div class="skeleton" style="height:48px;"></div>
    <div class="skeleton" style="height:48px;"></div>
  `;
  nameEl.textContent = "";

  // build the URL with query params
  var url = new URL(APP_CONFIG.USDA_BASE_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("api_key", APP_CONFIG.USDA_API_KEY);
  url.searchParams.set("pageSize", "1");

  try {
    var resp = await fetch(url.toString());

    if (!resp.ok) {
      throw new Error("API returned status " + resp.status);
    }

    var data = await resp.json();

    if (!data.foods || data.foods.length === 0) {
      grid.innerHTML = '<p style="font-size:.8rem;color:var(--text-muted);grid-column:1/-1">Nothing found for "' + escHtml(query) + '"</p>';
      return;
    }

    var food = data.foods[0];

    // helper to get a specific nutrient by its USDA ID
    // had to look these IDs up in the docs: 1008=energy(kcal), 1003=protein, 1005=carbs
    function getNutrient(id) {
      var found = food.foodNutrients.find(function(n) { return n.nutrientId === id; });
      return found ? found.value.toFixed(1) : "—";
    }

    grid.innerHTML = `
      <div class="nut-item">
        <div class="nut-val">${getNutrient(1008)}</div>
        <div class="nut-lbl">kcal/100g</div>
      </div>
      <div class="nut-item">
        <div class="nut-val">${getNutrient(1003)}g</div>
        <div class="nut-lbl">Protein</div>
      </div>
      <div class="nut-item">
        <div class="nut-val">${getNutrient(1005)}g</div>
        <div class="nut-lbl">Carbs</div>
      </div>
    `;

    var sourceName = food.description;
    if (food.brandOwner) sourceName += " — " + food.brandOwner;
    nameEl.textContent = sourceName;

    showToast("Got it: " + food.description, "success");

  } catch (err) {
    console.error("USDA API error:", err);
    grid.innerHTML = '<p style="font-size:.8rem;color:var(--red);grid-column:1/-1">⚠️ Data Unavailable — could not reach USDA API</p>';
    showToast("Data Unavailable — check your API key in config.js", "error", 5000);
  }
}


// ---- FRANKFURTER CURRENCY API ----
// Free API for exchange rates, no key needed
// Used to show savings in a different currency
// Docs: https://www.frankfurter.app/docs/

// simple cache so we dont call the API every second
// stores rates like { "USD-EUR": { rate: 0.92, time: 1234567 } }
var rateCache = {};
var CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in ms

async function fetchExchangeRate(from, to) {
  if (from === to) return 1;

  var cacheKey = from + "-" + to;

  // return cached rate if its still fresh
  if (rateCache[cacheKey]) {
    var age = Date.now() - rateCache[cacheKey].time;
    if (age < CACHE_DURATION) {
      return rateCache[cacheKey].rate;
    }
  }

  try {
    var url = APP_CONFIG.FRANKFURTER_BASE_URL + "?from=" + from + "&to=" + to;
    var resp = await fetch(url);

    if (!resp.ok) throw new Error("status " + resp.status);

    var data = await resp.json();

    if (data.rates[to] === undefined) {
      throw new Error("rate not found for " + to);
    }

    // save it in cache
    rateCache[cacheKey] = {
      rate: data.rates[to],
      time: Date.now()
    };

    return data.rates[to];

  } catch (err) {
    // silently fall back to no conversion - habit still gets added
    // showing an error here confused users into thinking the habit wasn't saved
    console.error("Frankfurter API error:", err);
    return null;
  }
}


// ---- FORM TRACKING ----
// need to track selected days and icon outside the form since they use custom buttons

var selectedDays = [];
var selectedIcon = "fa-dumbbell";
var pendingResetId = null; // which kick habit is waiting to be reset
var isAddingKick = false;  // lock to stop double-clicks during async API call


// ---- NAVIGATION ----
// switches between Home, Embrace, and Kick pages

function navigateTo(pageId) {
  document.querySelectorAll(".page").forEach(function(p) {
    p.classList.remove("active");
  });
  document.querySelectorAll(".nav-item").forEach(function(n) {
    n.classList.remove("active");
  });

  var page = document.getElementById("page-" + pageId);
  if (page) page.classList.add("active");

  var navBtn = document.querySelector('.nav-item[data-page="' + pageId + '"]');
  if (navBtn) navBtn.classList.add("active");
}


// ---- EMBRACE (GOOD HABITS) ----

function addEmbraceHabit() {
  var name = document.getElementById("eName").value.trim();
  var category = document.getElementById("eCategory").value;

  if (!name) {
    showToast("Please enter a habit name.", "warning");
    return;
  }

  if (selectedDays.length === 0) {
    showToast("Pick at least one day for this habit.", "warning");
    return;
  }

  var newHabit = {
    id: uid(),
    name: name,
    category: category,
    days: selectedDays.slice(), // copy the array
    icon: selectedIcon,
    todayDone: false,
    streak: 0,
    createdAt: new Date().toISOString()
  };

  appState.embraceHabits.push(newHabit);
  saveState();
  renderEmbraceHabits();
  updateHome();
  updateBadges();

  // clear the form
  document.getElementById("eName").value = "";
  selectedDays = [];
  document.querySelectorAll(".day-btn").forEach(function(b) {
    b.classList.remove("selected");
  });
  document.getElementById("nutritionPanel").classList.remove("visible");
  document.getElementById("eNutritionQuery").value = "";

  showToast('"' + name + '" added! 🌱', "success");
}

// toggle a habit as done or not done for today
function toggleEmbrace(id) {
  var habit = appState.embraceHabits.find(function(h) { return h.id === id; });
  if (!habit) return;

  habit.todayDone = !habit.todayDone;

  if (habit.todayDone) {
    habit.streak = (habit.streak || 0) + 1;
    showToast("🔥 " + habit.name + " — " + habit.streak + " day streak!", "success");
  } else {
    // reduce streak if they uncheck - minimum 0
    habit.streak = Math.max(0, habit.streak - 1);
  }

  saveState();
  renderEmbraceHabits();
  updateHome();
}

function deleteEmbrace(id) {
  appState.embraceHabits = appState.embraceHabits.filter(function(h) {
    return h.id !== id;
  });
  saveState();
  renderEmbraceHabits();
  updateHome();
  updateBadges();
  showToast("Habit removed.", "info");
}

function renderEmbraceHabits() {
  var list = document.getElementById("embraceList");
  var emptyMsg = document.getElementById("embraceEmpty");
  var today = todayDay();

  // remove old habit cards before redrawing
  list.querySelectorAll(".embrace-item").forEach(function(el) {
    el.remove();
  });

  if (appState.embraceHabits.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  appState.embraceHabits.forEach(function(h) {
    var scheduledToday = h.days.includes(today);
    var el = document.createElement("div");
    el.className = "embrace-item cat-" + h.category + (h.todayDone ? " completed" : "");
    el.dataset.id = h.id;

    var todayBadge = scheduledToday
      ? '<span style="font-size:.65rem;color:var(--green);font-weight:600;">● Today</span>'
      : "";

    el.innerHTML = `
      <div class="habit-check ${h.todayDone ? "checked" : ""}"
           onclick="toggleEmbrace('${h.id}')"
           role="checkbox" aria-checked="${h.todayDone}"></div>
      <div class="habit-icon bg-${h.category}">
        <i class="fa-solid ${h.icon}"></i>
      </div>
      <div class="habit-info">
        <div class="habit-name">${escHtml(h.name)}</div>
        <div class="habit-meta-row">
          <span class="cat-tag tag-${h.category}">${h.category}</span>
          <span class="habit-days-txt">${h.days.join(", ")}</span>
          ${todayBadge}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
        <div class="streak-pill">
          <i class="fa-solid fa-fire"></i> ${h.streak}d
        </div>
        <button class="btn-icon-sm" onclick="deleteEmbrace('${h.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    list.appendChild(el);
  });
}


// ---- KICK (BAD HABITS) ----

async function addKickHabit() {
  // prevent double-submission while waiting for the exchange rate API
  if (isAddingKick) return;
  isAddingKick = true;

  var btn = document.getElementById("btnAddKick");
  btn.disabled = true;
  btn.textContent = "Adding…";

  var name = document.getElementById("kName").value.trim();
  var category = document.getElementById("kCategory").value;
  var costInput = document.getElementById("kCost").value;
  var lastRelapse = document.getElementById("kLastRelapse").value;
  var why = document.getElementById("kWhy").value.trim();
  var icon = document.getElementById("kIcon").value;

  // cost is optional - if blank we treat it as 0
  var weeklyCost = costInput !== "" ? parseFloat(costInput) : 0;
  var hasCost = weeklyCost > 0;

  if (!name) {
    showToast("Please enter the habit name.", "warning");
    isAddingKick = false;
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-plus"></i> Track Habit';
    return;
  }
  if (!lastRelapse) {
    showToast("Please set when you last relapsed.", "warning");
    isAddingKick = false;
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-plus"></i> Track Habit';
    return;
  }
  if (costInput !== "" && (isNaN(weeklyCost) || weeklyCost < 0)) {
    showToast("Enter a valid cost amount.", "warning");
    isAddingKick = false;
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-plus"></i> Track Habit';
    return;
  }

  var currFrom = document.getElementById("kCurrencyFrom").value; // always read - user picks their currency
  var currTo = hasCost ? document.getElementById("kCurrencyTo").value : currFrom; // only convert if there's a cost

  // only call the currency API if they actually entered a cost
  var exchangeRate = 1;
  if (hasCost && currFrom !== currTo) {
    var rate = await fetchExchangeRate(currFrom, currTo);
    if (rate !== null) exchangeRate = rate;
  }

  appState.kickHabits.push({
    id: uid(),
    name: name,
    category: category,
    weeklyCost: weeklyCost,
    why: why,
    lastRelapse: new Date(lastRelapse).toISOString(),
    icon: icon,
    currencyFrom: currFrom,
    currencyTo: currTo,
    exchangeRate: exchangeRate
  });

  saveState();
  renderKickHabits();
  updateHome();
  updateBadges();

  // reset form
  document.getElementById("kName").value = "";
  document.getElementById("kCost").value = "";
  document.getElementById("kWhy").value = "";
  document.getElementById("currencyFields").classList.add("hidden");
  setDefaultRelapseTime();

  // release the submit lock and restore button
  isAddingKick = false;
  var btn = document.getElementById("btnAddKick");
  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-plus"></i> Track Habit';

  showToast('"' + name + '" — sobriety clock started! ⏱️', "success");
}

function deleteKick(id) {
  appState.kickHabits = appState.kickHabits.filter(function(h) { return h.id !== id; });
  // also remove any reflections for this habit
  appState.reflectionLog = appState.reflectionLog.filter(function(r) { return r.habitId !== id; });
  saveState();
  renderKickHabits();
  updateHome();
  updateBadges();
  showToast("Habit removed.", "info");
}

// open the reflection modal before allowing a timer reset
// the idea is to make the user think about why they relapsed
function promptReset(id) {
  pendingResetId = id;
  document.getElementById("reflectionText").value = "";
  document.getElementById("reflectionFeeling").value = "";
  document.getElementById("reflectionModal").classList.add("open");
  document.getElementById("reflectionText").focus();
}

function confirmReset() {
  var trigger = document.getElementById("reflectionText").value.trim();
  var feeling = document.getElementById("reflectionFeeling").value.trim();

  if (!trigger) {
    showToast("Please write what triggered the relapse.", "warning");
    return;
  }

  var habit = appState.kickHabits.find(function(h) { return h.id === pendingResetId; });
  if (!habit) return;

  // save the reflection entry
  appState.reflectionLog.push({
    habitId: pendingResetId,
    habitName: habit.name,
    trigger: trigger,
    feeling: feeling,
    timestamp: new Date().toISOString()
  });

  // reset clock to now
  habit.lastRelapse = new Date().toISOString();

  saveState();
  closeModal();
  renderKickHabits();
  updateHome();
  showToast("Clock reset. You can do this! 💪", "info", 5000);
}

function closeModal() {
  document.getElementById("reflectionModal").classList.remove("open");
  pendingResetId = null;
}

function renderKickHabits() {
  var list = document.getElementById("kickList");
  var emptyMsg = document.getElementById("kickEmpty");

  list.querySelectorAll(".kick-item").forEach(function(el) { el.remove(); });

  if (appState.kickHabits.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  appState.kickHabits.forEach(function(h) {
    var hasCost = h.weeklyCost > 0;
    var savings = hasCost ? calcSavings(h) : 0;
    var converted = hasCost ? savings * (h.exchangeRate || 1) : 0;

    var el = document.createElement("div");
    el.className = "kick-item";
    el.dataset.id = h.id;

    // only show the savings section if habit has a cost
    var savingsSection = "";
    if (hasCost) {
      var convertedHTML = "";
      if (h.currencyFrom !== h.currencyTo) {
        convertedHTML = '<span class="savings-converted" id="converted-' + h.id + '">≈ ' + fmt(converted, h.currencyTo) + " " + h.currencyTo + "</span>";
      }
      savingsSection = `
        <div class="savings-row">
          <span class="savings-val" id="savings-${h.id}">${fmt(savings, h.currencyFrom)}</span>
          <span class="savings-lbl">saved</span>
          ${convertedHTML}
        </div>
      `;
    }

    var costInfo = hasCost ? "$" + h.weeklyCost + "/week &nbsp;|&nbsp; " : "";

    el.innerHTML = `
      <div class="kick-item-header">
        <div class="habit-icon bg-${h.category}">
          <i class="fa-solid ${h.icon}"></i>
        </div>
        <div class="kick-info">
          <div class="kick-name">${escHtml(h.name)}</div>
          ${h.why ? '<div class="kick-why">"' + escHtml(h.why) + '"</div>' : ""}
        </div>
        <span class="cat-tag tag-${h.category}">${h.category}</span>
        <button class="btn-icon-sm" onclick="deleteKick('${h.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>

      <div class="clock-row">
        <div>
          <div class="clock-lbl"><span class="live-dot"></span> Sober for</div>
          <div class="clock-val" id="clock-${h.id}">${clockStr(h.lastRelapse)}</div>
        </div>
        <button class="btn-reset" onclick="promptReset('${h.id}')">
          <i class="fa-solid fa-rotate-right"></i> Reset
        </button>
      </div>

      ${savingsSection}

      <div class="kick-footer-row">
        <span class="kick-meta-txt">${costInfo}Since ${new Date(h.lastRelapse).toLocaleDateString()}</span>
      </div>
    `;

    list.appendChild(el);
  });
}


// ---- LIVE CLOCK (updates every second) ----
// this runs all the time and updates the sobriety timers
// TODO: might be worth pausing this when the page is hidden to save resources

setInterval(function() {
  appState.kickHabits.forEach(function(h) {
    var clockEl = document.getElementById("clock-" + h.id);
    if (!clockEl) return;

    clockEl.textContent = clockStr(h.lastRelapse);

    if (h.weeklyCost > 0) {
      var savings = calcSavings(h);
      var savingsEl = document.getElementById("savings-" + h.id);
      var convEl = document.getElementById("converted-" + h.id);

      if (savingsEl) savingsEl.textContent = fmt(savings, h.currencyFrom);
      if (convEl) convEl.textContent = "≈ " + fmt(savings * (h.exchangeRate || 1), h.currencyTo) + " " + h.currencyTo;
    }
  });

  updateSobrietyOverview();
  updateHomeSavings();

}, 1000);


// ---- HOME PAGE ----

function updateHome() {
  updateBalanceScore();
  updateHomeSavings();
  updateHomeStreaks();
  updateHomeCounts();
  updateSobrietyOverview();
}

function updateBalanceScore() {
  var today = todayDay();

  // only count habits that are scheduled for today
  var scheduled = appState.embraceHabits.filter(function(h) {
    return h.days.includes(today);
  });

  var done = scheduled.filter(function(h) { return h.todayDone; }).length;
  var total = scheduled.length;
  var pct = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById("balancePct").textContent = pct + "%";
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("bCompleted").textContent = done;
  document.getElementById("bRemaining").textContent = total - done;
  document.getElementById("bTotal").textContent = appState.embraceHabits.length;
}

function updateHomeSavings() {
  var total = 0;
  appState.kickHabits.forEach(function(h) {
    total += calcSavings(h);
  });
  document.getElementById("statMoneySaved").textContent = fmt(total, "USD");
}

function updateHomeStreaks() {
  var best = 0;
  appState.embraceHabits.forEach(function(h) {
    if ((h.streak || 0) > best) best = h.streak;
  });
  document.getElementById("statBestStreak").textContent = best + (best === 1 ? " day" : " days");
}

function updateHomeCounts() {
  document.getElementById("countGood").textContent = appState.embraceHabits.length;
  document.getElementById("countBad").textContent = appState.kickHabits.length;
}

function updateSobrietyOverview() {
  var container = document.getElementById("sobrietyOverview");

  if (appState.kickHabits.length === 0) {
    container.innerHTML = `
      <p class="sobriety-empty">
        No bad habits tracked yet. Add one in the
        <button class="text-link" data-page="kick">Kick</button> tab.
      </p>
    `;
    container.querySelectorAll(".text-link[data-page]").forEach(function(btn) {
      btn.addEventListener("click", function() { navigateTo(btn.dataset.page); });
    });
    return;
  }

  var rows = appState.kickHabits.map(function(h) {
    return `
      <div class="sobriety-mini-row">
        <div>
          <div class="sob-name">${escHtml(h.name)}</div>
          <div style="font-size:.72rem;color:var(--text-muted);">${escHtml(h.category)}</div>
        </div>
        <div class="sob-clock" id="home-clock-${h.id}">${clockStr(h.lastRelapse)}</div>
      </div>
    `;
  });

  container.innerHTML = rows.join("");
}

function updateBadges() {
  document.getElementById("badgeEmbrace").textContent = appState.embraceHabits.length;
  document.getElementById("badgeKick").textContent = appState.kickHabits.length;
}

// reset all todayDone flags if its a new day
// without this, checked habits would stay checked forever
function handleDailyReset() {
  var today = todayStr();
  if (appState.lastResetDate !== today) {
    appState.embraceHabits.forEach(function(h) {
      h.todayDone = false;
    });
    appState.lastResetDate = today;
    saveState();
  }
}

function setDateDisplay() {
  var now = new Date();
  var hour = now.getHours();

  var greeting = "GOOD MORNING";
  var icon = "fa-sun";

  if (hour >= 12 && hour < 17) {
    greeting = "GOOD AFTERNOON";
    icon = "fa-cloud-sun";
  } else if (hour >= 17) {
    greeting = "GOOD EVENING";
    icon = "fa-moon";
  }

  var chip = document.getElementById("greetingChip");
  if (chip) chip.innerHTML = '<i class="fa-solid ' + icon + '"></i> ' + greeting;

  var dateEl = document.getElementById("currentDate");
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric"
    });
  }
}

// sets the last relapse input to the current time as a default
// the user can change it if they need to
function setDefaultRelapseTime() {
  var el = document.getElementById("kLastRelapse");
  var now = new Date();
  // have to adjust for timezone offset otherwise it shows wrong time
  // Date.getTimezoneOffset() returns minutes, not seconds - took me a while to remember that
  var local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  el.value = local.toISOString().slice(0, 16);
}


// ---- EVENT LISTENERS ----

// sidebar navigation clicks
document.querySelectorAll(".nav-item[data-page]").forEach(function(btn) {
  btn.addEventListener("click", function() {
    navigateTo(btn.dataset.page);
  });
});

// text links inside page content (like "go to Kick tab")
document.querySelectorAll(".text-link[data-page]").forEach(function(btn) {
  btn.addEventListener("click", function() {
    navigateTo(btn.dataset.page);
  });
});

// day picker buttons
document.querySelectorAll(".day-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    var day = btn.dataset.day;
    if (selectedDays.includes(day)) {
      selectedDays = selectedDays.filter(function(d) { return d !== day; });
      btn.classList.remove("selected");
    } else {
      selectedDays.push(day);
      btn.classList.add("selected");
    }
  });
});

// icon picker buttons
document.querySelectorAll(".icon-opt").forEach(function(btn) {
  btn.addEventListener("click", function() {
    document.querySelectorAll(".icon-opt").forEach(function(b) {
      b.classList.remove("selected");
    });
    btn.classList.add("selected");
    selectedIcon = btn.dataset.icon;
  });
});

document.getElementById("btnAddEmbrace").addEventListener("click", addEmbraceHabit);

document.getElementById("btnClearEmbrace").addEventListener("click", function() {
  document.getElementById("eName").value = "";
  document.getElementById("eNutritionQuery").value = "";
  selectedDays = [];
  document.querySelectorAll(".day-btn").forEach(function(b) {
    b.classList.remove("selected");
  });
  document.getElementById("nutritionPanel").classList.remove("visible");
});

document.getElementById("btnVerifyNutrition").addEventListener("click", function() {
  verifyNutrition(document.getElementById("eNutritionQuery").value);
});

// also let user press enter in the food input
document.getElementById("eNutritionQuery").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    verifyNutrition(document.getElementById("eNutritionQuery").value);
  }
});

document.getElementById("btnAddKick").addEventListener("click", addKickHabit);

document.getElementById("btnClearKick").addEventListener("click", function() {
  document.getElementById("kName").value = "";
  document.getElementById("kCost").value = "";
  document.getElementById("kWhy").value = "";
  document.getElementById("currencyFields").classList.add("hidden"); // hide "show equivalent in"
  setDefaultRelapseTime();
});

// show "Show Equivalent In" only when a cost is entered
// the Cost Currency field is always visible now
document.getElementById("kCost").addEventListener("input", function(e) {
  var val = parseFloat(e.target.value);
  var fields = document.getElementById("currencyFields");
  if (!isNaN(val) && val > 0) {
    fields.classList.remove("hidden");
  } else {
    fields.classList.add("hidden");
  }
});

document.getElementById("btnCancelReset").addEventListener("click", closeModal);
document.getElementById("btnConfirmReset").addEventListener("click", confirmReset);

// close modal when clicking outside of it
document.getElementById("reflectionModal").addEventListener("click", function(e) {
  if (e.target === document.getElementById("reflectionModal")) {
    closeModal();
  }
});


// ---- STARTUP ----

function init() {
  loadState();
  handleDailyReset();
  setDateDisplay();
  setDefaultRelapseTime();

  renderEmbraceHabits();
  renderKickHabits();
  updateHome();
  updateBadges();

  // refresh exchange rates for any saved kick habits in the background
  appState.kickHabits.forEach(async function(h) {
    if (h.currencyFrom !== h.currencyTo) {
      var rate = await fetchExchangeRate(h.currencyFrom, h.currencyTo);
      if (rate !== null) {
        h.exchangeRate = rate;
        saveState();
      }
    }
  });

  console.log("HabitFlow loaded", appState.embraceHabits.length, "good habits,", appState.kickHabits.length, "bad habits");
}

document.addEventListener("DOMContentLoaded", init);

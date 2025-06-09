// 💍 Cleaned + Working script.js with Swap Functionality & Google Sheets

const people = ["DC", "2IC", "DSM", "HD DCS"];
let assignments = {};
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let swapRequest = {};
let swapHistory = [];
const webhookURL = "https://script.google.com/macros/s/AKfycbxLMqhuThlhutCQuLvHe739LTOGUt7IlOdAqr3ZvSaHg3eFya9OU3lx8MOsyzG4oJ1I/exec";

function getLocalDateString(date) {
  return new Date(date).toLocaleDateString('en-CA');
}

async function loadAssignments() {
  try {
    const res = await fetch(webhookURL);
    const data = await res.json();
    assignments = data;
    console.log("Loaded from Google Sheet:", assignments);
  } catch (err) {
    console.error("Failed to load from Google Sheets", err);
    preloadAssignments(currentYear, currentMonth); // fallback
  }
}

function preloadAssignments(year, month) {
  const date = new Date(year, month, 1);
  let personIndex = 0;
  assignments = {};
  while (date.getMonth() === month) {
    const day = date.getDay();
    const dateStr = getLocalDateString(date);
    if (day !== 0 && day !== 6) {
      assignments[dateStr] = people[personIndex % people.length];
      personIndex++;
    }
    date.setDate(date.getDate() + 1);
  }
}

function renderCalendar(month, year) {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";
  const monthTitle = document.getElementById("monthTitle");
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  monthTitle.textContent = `Month: ${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    calendar.appendChild(emptyCell);
  }

  for (let date = 1; date <= daysInMonth; date++) {
    const dayDiv = document.createElement("div");
    const thisDate = new Date(year, month, date);
    const dateStr = getLocalDateString(thisDate);
    dayDiv.classList.add("day");
    if (thisDate.getDay() === 0 || thisDate.getDay() === 6) {
      dayDiv.classList.add("weekend");
    }
    const dateLabel = document.createElement("h4");
    dateLabel.textContent = `${thisDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}`;
    dayDiv.appendChild(dateLabel);
    if (assignments[dateStr]) {
      const assigned = document.createElement("div");
      assigned.classList.add("assigned");
      assigned.textContent = assignments[dateStr];
      dayDiv.appendChild(assigned);
    }
    calendar.appendChild(dayDiv);
  }
}

function changeMonth(offset) {
  currentMonth += offset;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar(currentMonth, currentYear);
  populatePersonSelect();
}

function populatePersonSelect() {
  const select = document.getElementById("personSelect");
  select.innerHTML = "";
  people.forEach(person => {
    const option = document.createElement("option");
    option.value = person;
    option.textContent = person;
    select.appendChild(option);
  });
}

function confirmSwap() {
  const fromDate = document.getElementById('fromDate').value;
  const toDate = document.getElementById('toDate').value;
  const acknowledged = document.getElementById('acknowledgeBox').checked;
  const person = document.getElementById('personSelect').value;

  const fromStr = getLocalDateString(fromDate);
  const toStr = getLocalDateString(toDate);

  if (!acknowledged) {
    alert('Please confirm you have informed the person you are swapping with.');
    return;
  }
  if (!fromStr || !toStr) {
    alert('Please select both dates.');
    return;
  }
  if (assignments[fromStr] !== person) {
    alert(`You are not assigned on ${fromStr}. Assigned person is ${assignments[fromStr] || 'none'}`);
    return;
  }

  swapRequest = { from: fromStr, to: toStr, person };
  document.getElementById('popup').style.display = 'flex';
}

function applySwap() {
  console.log("✅ YES button clicked. swapRequest =", swapRequest);

  if (!swapRequest?.from || !swapRequest?.to || !swapRequest?.person) {
    alert("Something went wrong — please try the swap again.");
    return;
  }

  const { from, to, person } = swapRequest;
  const swappedWith = assignments[to];

  swapHistory.push(`"${new Date().toLocaleString()}","${person}","${from}","${to}","${swappedWith}"`);

  fetch(webhookURL, {
    method: "POST",
    body: JSON.stringify({ person, from, to, swappedWith }),
    headers: { "Content-Type": "application/json" }
  }).then(res => res.text()).then(response => {
    console.log("Posted to Google Sheets:", response);
    const temp = assignments[to];
    assignments[to] = assignments[from];
    assignments[from] = temp;
    renderCalendar(currentMonth, currentYear);
    document.getElementById('popup').style.display = 'none';
  }).catch(console.error);
}

function closePopup() {
  document.getElementById('popup').style.display = 'none';
}

function downloadLog() {
  let csv = "timestamp,person,from_date,to_date,swapped_with\n" + swapHistory.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "swap_log.csv";
  a.click();
  URL.revokeObjectURL(url);
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadAssignments();
  renderCalendar(currentMonth, currentYear);
  populatePersonSelect();

  document.getElementById("prevBtn")?.addEventListener("click", () => changeMonth(-1));
  document.getElementById("nextBtn")?.addEventListener("click", () => changeMonth(1));
  document.getElementById("inputSwapBtn")?.addEventListener("click", confirmSwap);
  document.getElementById("yesBtn")?.addEventListener("click", applySwap);
  document.getElementById("noBtn")?.addEventListener("click", closePopup);
  document.getElementById("downloadLogBtn")?.addEventListener("click", downloadLog);
});

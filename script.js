// Monthly UAF WTG Comd Calendar - script.js

const people = ["DC", "2IC", "DSM", "HD DCS"];
let assignments = {};
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let swapRequest = {};
let swapHistory = [];

const swapFormURL = "https://docs.google.com/forms/d/e/1FAIpQLSd_UR-lWyEWURdEZ5GOje9j6ePhNSKY6iQNsvcG1yQnFp1BIw/formResponse";
const sheetDataURL = "https://opensheet.elk.sh/1AYzYv4YGCulxHE8aKHZYqKchpLQ0rLdd9nS_VZlP7_w/Sheet1";

function getLocalDateString(date) {
  return new Date(date).toISOString().split('T')[0];
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
  if (!calendar) return;
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
    const thisDate = new Date(year, month, date);
    const dateStr = getLocalDateString(thisDate);
    const dayDiv = document.createElement("div");
    dayDiv.classList.add("day");
    if (thisDate.getDay() === 0 || thisDate.getDay() === 6) {
      dayDiv.classList.add("weekend");
    }

    const dateLabel = document.createElement("h4");
    dateLabel.textContent = thisDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
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
  preloadAssignments(currentYear, currentMonth);
  loadSwapsFromSheet(() => {
    renderCalendar(currentMonth, currentYear);
  });
}

function populatePersonSelect() {
  const select = document.getElementById("personSelect");
  if (!select) return;
  select.innerHTML = "";
  people.forEach(person => {
    const option = document.createElement("option");
    option.value = person;
    option.textContent = person;
    select.appendChild(option);
  });
}

function confirmSwap() {
  const fromDate = document.getElementById('fromDate')?.value;
  const toDate = document.getElementById('toDate')?.value;
  const acknowledged = document.getElementById('acknowledgeBox')?.checked;
  const person = document.getElementById('personSelect')?.value;

  if (!acknowledged || !fromDate || !toDate || !person) {
    alert('Please fill in all fields and acknowledge the swap.');
    return;
  }

  const fromStr = getLocalDateString(fromDate);
  if (assignments[fromStr] !== person) {
    alert(`You are not assigned on ${fromStr}. Assigned person is ${assignments[fromStr] || 'none'}`);
    return;
  }

  swapRequest = {
    from: fromStr,
    to: getLocalDateString(toDate),
    person,
    swappedWith: assignments[getLocalDateString(toDate)]
  };
  document.getElementById('popup').style.display = 'flex';
}

function applySwap() {
  const { from, to, person, swappedWith } = swapRequest;

  assignments[to] = person;
  assignments[from] = swappedWith;

  const formData = new URLSearchParams();
  formData.append("entry.869958100", person);
  formData.append("entry.670565463", from);
  formData.append("entry.100956069", to);
  formData.append("entry.261956296", swappedWith);

  fetch(swapFormURL, {
    method: "POST",
    body: formData,
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  renderCalendar(currentMonth, currentYear);
  document.getElementById('popup').style.display = 'none';
}

function closePopup() {
  document.getElementById('popup').style.display = 'none';
}

function loadSwapsFromSheet(callback) {
  fetch(sheetDataURL)
    .then(res => res.json())
    .then(rows => {
      rows.forEach(row => {
        if (row.from && row.to && row.person && row.swappedWith) {
          assignments[row.to] = row.person;
          assignments[row.from] = row.swappedWith;
        }
      });
      callback();
    })
    .catch(err => {
      console.error("Failed to load swap data:", err);
      callback();
    });
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

document.addEventListener("DOMContentLoaded", () => {
  preloadAssignments(currentYear, currentMonth);
  loadSwapsFromSheet(() => {
    renderCalendar(currentMonth, currentYear);
  });
  populatePersonSelect();

  document.getElementById("prevBtn")?.addEventListener("click", () => changeMonth(-1));
  document.getElementById("nextBtn")?.addEventListener("click", () => changeMonth(1));
  document.getElementById("inputSwapBtn")?.addEventListener("click", confirmSwap);
  document.getElementById("yesBtn")?.addEventListener("click", applySwap);
  document.getElementById("noBtn")?.addEventListener("click", closePopup);
  document.getElementById("downloadLogBtn")?.addEventListener("click", downloadLog);
});

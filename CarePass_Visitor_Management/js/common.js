/* Shared utilities, storage, validation rules, and helpers across all portals */

/* 1. Settings and configuration constants */
const STORAGE_KEY = 'carepass_data_v4';

/* Visit lifecycle status definitions */
const STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  EXITED: 'EXITED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

const VISIT_SLOTS = ['10:00 - 11:00', '14:00 - 15:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00'];

const ICU_LIMIT = 1;
const NORMAL_LIMIT = 2;
const OVERDUE_MINUTES = 60;
/* False for demonstration: staff can start a visit as soon as the request is approved and the pass ID is verified. In real deployment, set to true (entry allowed only from 15 minutes before the slot until it ends). */
const ENFORCE_SLOT_TIME = false;
const EARLY_ENTRY_MINUTES = 15;
const LOG_PREVIEW_COUNT = 6;
const RECORD_PREVIEW_COUNT = 3;
const REFRESH_EVERY_MS = 30000;

/* Initial seed data for demo patients and staff */
const SEED_PATIENTS = [
  { id: 'P1', name: 'Raj Kumar',   ward: 'General Ward', room: '204-A' },
  { id: 'P2', name: 'Neha Singh',  ward: 'ICU',          room: 'ICU-03' },
  { id: 'P3', name: 'Amit Patel',  ward: 'Cardiology',   room: '105-B' },
  { id: 'P4', name: 'Priya Verma', ward: 'Maternity',    room: '302-C' }
];

const SEED_STAFF = [
  { username: 'staff', password: 'staff123', name: 'Rajesh Kumar (Security Desk)' }
];

/* 2. Storage and persistence */

/* Generate initial clean database state */
function makeStartingData() {
  return {
    patients: JSON.parse(JSON.stringify(SEED_PATIENTS)),
    staff: JSON.parse(JSON.stringify(SEED_STAFF)),
    visits: [],
    logs: []
  };
}

/* Load data object from localStorage with fallback to starting seed */
function loadData() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text) {
      const saved = JSON.parse(text);
      if (saved && Array.isArray(saved.patients) && Array.isArray(saved.staff) &&
          Array.isArray(saved.visits) && Array.isArray(saved.logs)) {
        return saved;
      }
    }
  } catch (error) {
    /* Fallback on storage read error */
  }
  return makeStartingData();
}

/* Save data object to browser localStorage */
function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    return false;
  }
}

/* Reset database back to seed patients and staff */
function resetData() {
  const fresh = makeStartingData();
  if (saveData(fresh)) {
    return fresh;
  }
  return null;
}

/* Safely read parsed JSON from sessionStorage */
function readSession(key) {
  try {
    const text = sessionStorage.getItem(key);
    if (text) {
      return JSON.parse(text);
    }
  } catch (error) {
    /* Ignore parse error */
  }
  return null;
}

/* Find patient record by ID */
function findPatient(data, patientId) {
  for (let i = 0; i < data.patients.length; i++) {
    if (data.patients[i].id === patientId) {
      return data.patients[i];
    }
  }
  return { id: '', name: 'Unknown', ward: '', room: '' };
}

/* Generate next sequential visit ID (VST-1001, VST-1002, ...) */
function nextVisitId(data) {
  let highest = 1000;
  for (let i = 0; i < data.visits.length; i++) {
    const number = parseInt(data.visits[i].id.replace('VST-', ''), 10);
    if (number > highest) {
      highest = number;
    }
  }
  return 'VST-' + (highest + 1);
}

/* 3. General utility functions */

/* Shorthand for document.getElementById */
function $(id) {
  return document.getElementById(id);
}

/* Format Date object to YYYY-MM-DD local string */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

/* Return today date in YYYY-MM-DD format */
function today() {
  return formatDate(new Date());
}

/* Return tomorrow date in YYYY-MM-DD format */
function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatDate(date);
}

/* Format ISO timestamp to localized 12-hour time string */
function formatTime(isoTime) {
  if (!isoTime) {
    return '-';
  }
  return new Date(isoTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* Calculate minutes elapsed since given ISO timestamp */
function minutesSince(isoTime) {
  return Math.floor((Date.now() - new Date(isoTime)) / 60000);
}

/* Mask 10-digit mobile number showing only last 4 digits */
function maskMobile(mobile) {
  if (!mobile) {
    return '';
  }
  return '******' + String(mobile).slice(-4);
}

/* Sanitize HTML characters to prevent XSS injection */
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, function (character) {
    return '&#' + character.charCodeAt(0) + ';';
  });
}

/* Check if time slot has ended for the given date */
function slotHasEnded(date, slot) {
  if (date !== today()) {
    return false;
  }
  const endTime = String(slot).split(' - ')[1];
  if (!endTime) {
    return false;
  }
  const parts = endTime.split(':');
  const endMinutes = Number(parts[0]) * 60 + Number(parts[1]);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= endMinutes;
}

/* Convert HH:MM time string to minutes past midnight */
function timeToMinutes(text) {
  const parts = String(text).split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

/* Parse slot string into start and end minute boundaries */
function slotRange(slot) {
  const parts = String(slot).split(' - ');
  if (parts.length !== 2) {
    return null;
  }
  return { start: timeToMinutes(parts[0]), end: timeToMinutes(parts[1]) };
}

/* Validate whether visitor is arriving within allowed slot time window */
function checkSlotTime(visit) {
  if (!ENFORCE_SLOT_TIME) {
    return '';
  }
  const range = slotRange(visit.slot);
  if (!range) {
    return '';
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const opensAt = range.start - EARLY_ENTRY_MINUTES;

  if (nowMinutes < opensAt) {
    return 'Too early. The ' + visit.slot + ' slot opens for entry at ' + minutesToClock(opensAt) + '.';
  }
  if (nowMinutes >= range.end) {
    return 'The ' + visit.slot + ' slot has already ended.';
  }
  return '';
}

/* Format minute integer back into HH:MM clock string */
function minutesToClock(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return hours + ':' + minutes;
}

/* Check if visit status represents an active or pending open state */
function isOpen(status) {
  return status === STATUS.PENDING || status === STATUS.APPROVED || status === STATUS.ACTIVE;
}

/* Validate allowed visit status lifecycle transitions */
function canChange(fromStatus, toStatus) {
  if (fromStatus === STATUS.PENDING) {
    return toStatus === STATUS.APPROVED || toStatus === STATUS.REJECTED || toStatus === STATUS.CANCELLED;
  }
  if (fromStatus === STATUS.APPROVED) {
    return toStatus === STATUS.ACTIVE || toStatus === STATUS.CANCELLED;
  }
  if (fromStatus === STATUS.ACTIVE) {
    return toStatus === STATUS.EXITED;
  }
  return false;
}

/* Check if status warrants displaying a digital pass */
function hasPass(status) {
  return status === STATUS.APPROVED || status === STATUS.ACTIVE;
}

/* 4. Booking and entry validation rules */

/* Validate new visit request against schedule and duplicate rules */
function checkNewRequest(data, request) {
  if (!request.date || request.date < today()) {
    return 'The visit date cannot be in the past.';
  }

  if (slotHasEnded(request.date, request.slot)) {
    return 'The ' + request.slot + ' slot has already ended today. Please choose a later slot.';
  }

  /* Prevent duplicate booking for same visitor, date, and slot */
  for (let i = 0; i < data.visits.length; i++) {
    const visit = data.visits[i];
    if (visit.mobile === request.mobile && visit.date === request.date &&
        visit.slot === request.slot && isOpen(visit.status)) {
      const patient = findPatient(data, visit.patientId);
      return 'You already have a ' + visit.status.toLowerCase() + ' visit (' + visit.id + ') with ' +
             patient.name + ' for ' + request.slot + ' on ' + request.date + '. Please choose a different time.';
    }
  }

  /* Prevent booking if visitor is currently active inside the facility */
  if (request.date === today()) {
    for (let i = 0; i < data.visits.length; i++) {
      const visit = data.visits[i];
      if (visit.mobile === request.mobile && visit.status === STATUS.ACTIVE) {
        return 'You are currently inside the hospital on pass ' + visit.id +
               '. Please check out before booking another visit.';
      }
    }
  }

  /* Enforce single open visit per patient per day per visitor */
  for (let i = 0; i < data.visits.length; i++) {
    const visit = data.visits[i];
    if (visit.mobile === request.mobile && visit.patientId === request.patientId &&
        visit.date === request.date && isOpen(visit.status)) {
      return 'You already have an open visit request for this patient on that day.';
    }
  }

  return '';
}

/* Validate entry check-in for date, slot time, and ward capacity */
function checkEntry(data, visit) {
  if (visit.date !== today()) {
    return 'This pass is for ' + visit.date + ', not today.';
  }

  const slotProblem = checkSlotTime(visit);
  if (slotProblem) {
    return slotProblem;
  }

  /* Count concurrent active visitors in patient ward */
  const patient = findPatient(data, visit.patientId);
  let insideCount = 0;

  for (let i = 0; i < data.visits.length; i++) {
    const other = data.visits[i];
    if (other.id === visit.id || other.status !== STATUS.ACTIVE) {
      continue;
    }

    if (other.mobile === visit.mobile) {
      return visit.visitorName + ' (' + maskMobile(visit.mobile) + ') is already inside on pass ' +
             other.id + '. They need to check out before entering again.';
    }
    if (other.patientId === visit.patientId) {
      insideCount = insideCount + 1;
    }
  }

  let limit = NORMAL_LIMIT;
  if (patient.ward === 'ICU') {
    limit = ICU_LIMIT;
  }
  if (insideCount >= limit) {
    return patient.name + ' already has ' + insideCount + ' inside. The limit for this ward is ' +
           limit + ' at a time.';
  }

  return '';
}

/* Record an audit log entry */
function addLogEntry(data, who, action, visitId) {
  data.logs.unshift({ time: new Date().toISOString(), who: who, action: action, visitId: visitId });
}

/* Save data and return standard result status object */
function saveResult(data) {
  if (saveData(data)) {
    return { ok: true, message: '' };
  }
  return { ok: false, message: 'Could not save: browser storage is unavailable or full.' };
}

/* Add a new pending visit request to storage */
function addVisit(request) {
  const data = loadData();

  const problem = checkNewRequest(data, request);
  if (problem) {
    return { ok: false, message: problem };
  }

  const visitId = nextVisitId(data);
  data.visits.push({
    id: visitId,
    visitorName: request.visitorName,
    mobile: request.mobile,
    patientId: request.patientId,
    date: request.date,
    slot: request.slot,
    status: STATUS.PENDING,
    reason: '',
    entryTime: null,
    exitTime: null
  });
  addLogEntry(data, request.visitorName, STATUS.PENDING, visitId);

  return saveResult(data);
}

/* Change visit status through controlled transition checks */
function setStatus(visitId, newStatus, who, reason) {
  const data = loadData();
  let visit = null;

  for (let i = 0; i < data.visits.length; i++) {
    if (data.visits[i].id === visitId) {
      visit = data.visits[i];
    }
  }

  if (!visit) {
    return { ok: false, message: 'No visit found with ID ' + visitId + '.' };
  }

  if (!canChange(visit.status, newStatus)) {
    return { ok: false, message: 'Not allowed: this visit is ' + visit.status.toLowerCase() +
             ' and cannot become ' + newStatus.toLowerCase() + '.' };
  }

  if (newStatus === STATUS.ACTIVE) {
    const problem = checkEntry(data, visit);
    if (problem) {
      return { ok: false, message: problem };
    }
    visit.entryTime = new Date().toISOString();
  }

  if (newStatus === STATUS.EXITED) {
    visit.exitTime = new Date().toISOString();
  }

  visit.status = newStatus;
  if (reason) {
    visit.reason = reason;
  }
  addLogEntry(data, who || 'Visitor', newStatus, visitId);

  return saveResult(data);
}

/* Automatically mark unfulfilled past visits as expired */
function expireStaleVisits() {
  const data = loadData();
  let changed = false;

  for (let i = 0; i < data.visits.length; i++) {
    const visit = data.visits[i];
    const waiting = visit.status === STATUS.PENDING || visit.status === STATUS.APPROVED;
    const finished = visit.date < today() || slotHasEnded(visit.date, visit.slot);

    if (waiting && finished) {
      visit.status = STATUS.EXPIRED;
      addLogEntry(data, 'System', STATUS.EXPIRED, visit.id);
      changed = true;
    }
  }

  if (changed) {
    saveData(data);
  }
}

/* 5. UI and display helpers */

/* Render status chip badge HTML */
function statusChip(status) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return '<span class="chip" data-status="' + status + '">' + label + '</span>';
}

/* Render linear progress step track for visit lifecycle */
function progressTrack(status) {
  const labels = ['Requested', 'Approved', 'Inside', 'Done'];
  const order = [STATUS.PENDING, STATUS.APPROVED, STATUS.ACTIVE, STATUS.EXITED];
  const current = order.indexOf(status);

  if (current === -1) {
    return '';
  }

  let items = '';
  for (let i = 0; i < labels.length; i++) {
    let cssClass = '';
    if (i < current) {
      cssClass = 'done';
    }
    if (i === current) {
      cssClass = 'now';
    }
    items += '<li class="' + cssClass + '">' + labels[i] + '</li>';
  }
  return '<ol class="track" aria-label="Progress">' + items + '</ol>';
}

/* Render empty state placeholder row for tables */
function emptyRow(columnCount, message) {
  return '<tr><td class="empty" colspan="' + columnCount + '">' + message + '</td></tr>';
}

let toastTimer = null;

/* Display toast message banner at bottom of screen */
function showToast(message, isError) {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = isError ? 'show error' : 'show';

  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.className = '';
  }, 3200);
}

/* Display toast from standard operation result object */
function showResult(result, successMessage) {
  if (result.ok) {
    showToast(successMessage, false);
  } else {
    showToast(result.message, true);
  }
}

/* Update badge count element and visibility */
function setBadge(id, count) {
  const badge = $(id);
  if (!badge) {
    return;
  }
  badge.hidden = count === 0;
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.setAttribute('aria-label', count + ' pending request' + (count === 1 ? '' : 's'));
}

/* Trigger pulse animation on badge element */
function pulseBadge(id) {
  const badge = $(id);
  if (!badge || badge.hidden) {
    return;
  }
  badge.classList.remove('pulse');
  void badge.offsetWidth;
  badge.classList.add('pulse');
  setTimeout(function () {
    badge.classList.remove('pulse');
  }, 1900);
}


/* ==========================================================================
   staff.js - Staff / security desk portal

   FILE ORDER (look here first when debugging):
     1. Constants & state
     2. DOM references
     3. Small helpers
     4. Notification badge   <- red badge + white number for new requests
     5. Rendering            <- everything that draws tables / stats
     6. Actions              <- everything that changes data
     7. Login / logout
     8. Event listeners
     9. Start-up
   ========================================================================== */


/* ==========================================================================
   1. CONSTANTS & STATE
   ========================================================================== */

/* Limits such as OVERDUE_MINUTES and LOG_PREVIEW_COUNT live in config.js. */
const BADGE_IDS = ['nav-badge', 'link-badge', 'pending-badge'];
const BASE_TITLE = document.title;

let staffMember = readSessionJson('carepass_staff');
let showAllLogs = false;           // audit log: preview vs everything
let knownPendingIds = null;        // pending IDs already seen (null = not loaded yet)


/* ==========================================================================
   2. DOM REFERENCES
   ========================================================================== */

const loginForm      = $('login-form');
const signedInBox    = $('staff-signed-in-box');
const desk           = $('desk');
const rejectDialog   = $('reject-dialog');
const rejectReason   = $('reject-reason');


/* ==========================================================================
   3. SMALL HELPERS
   ========================================================================== */

function minutesInside(visit) {
  return minutesSince(visit.entryTime);
}

function isOverdue(visit) {
  return minutesInside(visit) > OVERDUE_MINUTES;
}

/* Searches by visit ID, visitor name, mobile, patient name or patient ID. */
function matchesSearch(visit, data, query, status) {
  if (status && visit.status !== status) return false;
  if (!query) return true;

  const patient = findPatient(data, visit.patientId);
  const searchable = [visit.id, visit.visitorName, visit.mobile, patient.name, patient.id]
    .join(' ').toLowerCase();

  return searchable.includes(query);
}


/* ==========================================================================
   4. NOTIFICATION BADGE
   A visitor submits a slot -> a new PENDING visit is saved -> the "storage"
   event (section 8) calls renderAll() -> updateNotification() below runs.
   ========================================================================== */

function updateNotification(pendingVisits) {
  const count = pendingVisits.length;

  // 1. Red badge with the white number (hidden automatically at 0)
  BADGE_IDS.forEach((id) => setBadge(id, count));

  // 2. Number in the browser tab, e.g. "(2) Staff Portal ..."
  document.title = (count > 0 ? '(' + count + ') ' : '') + BASE_TITLE;

  // 3. Find requests we have not seen before
  const currentIds = pendingVisits.map((visit) => visit.id);
  const newVisits = knownPendingIds === null
    ? []                                              // first load: nothing is "new"
    : pendingVisits.filter((visit) => !knownPendingIds.includes(visit.id));
  knownPendingIds = currentIds;

  // 4. Tell the staff member about each new request
  if (newVisits.length > 0) {
    const latest = newVisits[newVisits.length - 1];
    showToast(newVisits.length === 1
      ? 'New visit request ' + latest.id + ' from ' + latest.visitorName
      : newVisits.length + ' new visit requests received');
    BADGE_IDS.forEach(pulseBadge);
  }
}

function clearNotification() {
  BADGE_IDS.forEach((id) => setBadge(id, 0));
  document.title = BASE_TITLE;
  knownPendingIds = null;
}


/* ==========================================================================
   5. RENDERING
   ========================================================================== */

function actionButton(visitId, nextStatus, label, extraClass = '') {
  return '<button class="btn small ' + extraClass + '" data-id="' + visitId +
         '" data-to="' + nextStatus + '">' + label + '</button>';
}

function patientLabel(data, visit) {
  return escapeHtml(findPatient(data, visit.patientId).name) + ' (' + escapeHtml(visit.patientId) + ')';
}

/* ----- Table rows ----- */

function pendingRow(visit, data) {
  return '<tr>' +
    '<td><strong>' + escapeHtml(visit.id) + '</strong></td>' +
    '<td>' + escapeHtml(visit.visitorName) + '</td>' +
    '<td>' + maskMobile(visit.mobile) + '</td>' +
    '<td>' + patientLabel(data, visit) + '</td>' +
    '<td><time datetime="' + visit.date + '">' + visit.date + '</time></td>' +
    '<td>' + escapeHtml(visit.slot) + '</td>' +
    '<td>' + actionButton(visit.id, STATUS.APPROVED, 'Approve') + ' ' +
             actionButton(visit.id, STATUS.REJECTED, 'Reject', 'danger') + '</td>' +
  '</tr>';
}

function insideRow(visit, data) {
  const overdue = isOverdue(visit);

  return '<tr class="' + (overdue ? 'late' : '') + '">' +
    '<td><strong>' + escapeHtml(visit.id) + '</strong></td>' +
    '<td>' + escapeHtml(visit.visitorName) + '</td>' +
    '<td>' + patientLabel(data, visit) + '</td>' +
    '<td>' + formatTime(visit.entryTime) + '</td>' +
    '<td>' + minutesInside(visit) + ' min</td>' +
    '<td>' + statusChip(overdue ? CHIP_OVERDUE : STATUS.ACTIVE) + '</td>' +
    '<td>' + actionButton(visit.id, STATUS.EXITED, 'Record exit', 'danger') + '</td>' +
  '</tr>';
}

function recordRow(visit, data) {
  return '<tr>' +
    '<td><strong>' + escapeHtml(visit.id) + '</strong></td>' +
    '<td>' + escapeHtml(visit.visitorName) + '</td>' +
    '<td>' + maskMobile(visit.mobile) + '</td>' +
    '<td>' + patientLabel(data, visit) + '</td>' +
    '<td>' + visit.date + '</td>' +
    '<td>' + formatTime(visit.entryTime) + '</td>' +
    '<td>' + formatTime(visit.exitTime) + '</td>' +
    '<td>' + statusChip(visit.status) + '</td>' +
  '</tr>';
}

function logRow(log) {
  const time = new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return '<tr>' +
    '<td><time datetime="' + log.time + '">' + time + '</time></td>' +
    '<td><strong>' + escapeHtml(log.who) + '</strong></td>' +
    '<td>' + statusChip(log.action) + '</td>' +
    '<td>' + escapeHtml(log.visitId) + '</td>' +
  '</tr>';
}

/* ----- Sections ----- */

function renderStats(visits, pending, inside) {
  const visitsToday = visits.filter((visit) =>
    visit.date === today() && STATUS_GROUPS.attended.includes(visit.status));

  $('stat-pending').textContent = pending.length;
  $('stat-inside').textContent  = inside.length;
  $('stat-overdue').textContent = inside.filter(isOverdue).length;
  $('stat-today').textContent   = visitsToday.length;
}

function renderAuditLog(logs) {
  const toggleBtn  = $('btn-toggle-logs');
  const hasMore    = logs.length > LOG_PREVIEW_COUNT;
  const shown      = (hasMore && !showAllLogs) ? logs.slice(0, LOG_PREVIEW_COUNT) : logs;

  $('log-rows').innerHTML = tableRowsOrEmpty(shown, logRow, 4, 'No actions recorded yet.');
  $('log-count-text').textContent = 'Showing ' + shown.length + ' of ' + logs.length + ' logs';

  toggleBtn.hidden = !hasMore;
  if (hasMore) {
    $('toggle-log-text').textContent = showAllLogs
      ? 'Show less'
      : 'Show more (' + (logs.length - LOG_PREVIEW_COUNT) + ' hidden)';
    $('toggle-log-icon').className = showAllLogs
      ? 'fa-solid fa-chevron-up'
      : 'fa-solid fa-chevron-down';
  }
}

/* Draws the whole desk. The ONLY function that should repaint the page. */
function renderAll() {
  const data    = loadData();
  const pending = data.visits.filter((visit) => visit.status === STATUS.PENDING);
  const inside  = data.visits.filter((visit) => visit.status === STATUS.ACTIVE);

  const query   = $('search-text').value.toLowerCase().trim();
  const status  = $('search-status').value;
  const records = data.visits
    .filter((visit) => matchesSearch(visit, data, query, status))
    .reverse();

  updateNotification(pending);
  renderStats(data.visits, pending, inside);

  $('pending-rows').innerHTML = tableRowsOrEmpty(pending, (v) => pendingRow(v, data), 7,
    'All caught up. No pending requests waiting.');
  $('inside-rows').innerHTML = tableRowsOrEmpty(inside, (v) => insideRow(v, data), 7,
    'Nobody is inside right now.');
  $('record-rows').innerHTML = tableRowsOrEmpty(records, (v) => recordRow(v, data), 8,
    'No visit records yet. Visitor requests will appear here once submitted.');

  renderAuditLog(data.logs || []);
}

/* Fills the status filter from STATUS, so new statuses appear automatically. */
function fillStatusFilter() {
  $('search-status').innerHTML = '<option value="">All</option>' +
    Object.values(STATUS).map((status) => '<option>' + status + '</option>').join('');
}

function showCorrectScreen() {
  const signedIn = Boolean(staffMember);

  loginForm.hidden   = signedIn;
  signedInBox.hidden = !signedIn;
  desk.hidden        = !signedIn;

  if (signedIn) {
    $('staff-container-name').textContent = staffMember.name;
    renderAll();
  } else {
    clearNotification();
  }
}


/* ==========================================================================
   6. ACTIONS (change data, then redraw)
   ========================================================================== */

function changeStatus(visitId, nextStatus, reason) {
  if (!staffMember) return;
  const result = setStatus(visitId, nextStatus, staffMember.name, reason);

  showResult(result, visitId + ' is now ' + nextStatus.toLowerCase() + '.');
  renderAll();
}

function openRejectDialog(visitId) {
  $('reject-visit-id').value = visitId;
  rejectReason.value = '';
  rejectDialog.showModal();
}

function confirmReject(event) {
  const reason = rejectReason.value.trim();

  // "required" accepts spaces only, so check the trimmed text ourselves
  if (!reason) {
    event.preventDefault();                 // keep the dialog open
    rejectReason.setCustomValidity('Please enter a reason for the visitor.');
    rejectReason.reportValidity();
    return;
  }
  rejectReason.setCustomValidity('');
  changeStatus($('reject-visit-id').value, STATUS.REJECTED, reason);
}

function checkPass(event) {
  event.preventDefault();
  if (!staffMember) return;

  const passId  = $('pass-id').value.trim().toUpperCase();
  const result  = setStatus(passId, STATUS.ACTIVE, staffMember.name);
  const message = $('entry-message');

  message.dataset.ok = String(result.ok);
  message.textContent = result.ok ? 'Entry recorded for ' + passId : result.message;
  if (result.ok) $('pass-id').value = '';
  renderAll();
}

function resetEverything() {
  if (!confirm('Reset all visit records and audit logs back to a clean state?')) return;
  const freshData = resetData();
  if (!freshData) {
    showToast('Could not reset records. Browser storage is unavailable or full.', true);
    return;
  }
  showAllLogs = false;
  knownPendingIds = null;
  renderAll();
  showToast('All logs and visit records have been reset.');
}

function togglePasswordVisibility() {
  const input   = $('staff-password-input');
  const icon    = $('eye-icon');
  const button  = $('btn-toggle-password');
  const hidden  = input.type === 'password';

  input.type = hidden ? 'text' : 'password';
  icon.className = hidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  button.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
}


/* ==========================================================================
   7. LOGIN / LOGOUT
   ========================================================================== */

function login(event) {
  event.preventDefault();
  const form = event.target;
  const username = form.elements.username.value.trim();
  const password = form.elements.password.value;

  const match = loadData().staff.find((s) => s.username === username && s.password === password);
  if (!match) {
    showToast('Wrong username or password.', true);
    return;
  }

  // Keep only what the page needs. Never store the password in the session.
  staffMember = { username: match.username, name: match.name };
  sessionStorage.setItem('carepass_staff', JSON.stringify(staffMember));
  showCorrectScreen();
  showToast('Welcome, ' + match.name);
}

function logout() {
  staffMember = null;
  sessionStorage.removeItem('carepass_staff');
  showCorrectScreen();
}


/* ==========================================================================
   8. EVENT LISTENERS
   ========================================================================== */

/* Login / logout */
loginForm.addEventListener('submit', login);
$('staff-container-logout').addEventListener('click', logout);
$('btn-toggle-password').addEventListener('click', togglePasswordVisibility);

/* Entry check */
$('entry-form').addEventListener('submit', checkPass);

/* Records search */
$('records-filter').addEventListener('submit', (event) => event.preventDefault());
$('search-text').addEventListener('input', renderAll);
$('search-status').addEventListener('change', renderAll);

/* Reject dialog */
$('reject-form').addEventListener('submit', confirmReject);
rejectReason.addEventListener('input', (event) => event.target.setCustomValidity(''));
$('reject-cancel').addEventListener('click', () => rejectDialog.close());

/* Audit log footer */
$('btn-toggle-logs').addEventListener('click', () => {
  showAllLogs = !showAllLogs;
  renderAll();
});
$('btn-reset-all-records').addEventListener('click', resetEverything);

/* One listener handles every Approve / Reject / Record-exit button. */
document.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;

  if (button.dataset.to === STATUS.REJECTED) {
    openRejectDialog(button.dataset.id);
  } else {
    changeStatus(button.dataset.id, button.dataset.to);
  }
});

/* LIVE UPDATE: a visitor in another tab submitted or cancelled a request. */
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY && staffMember) renderAll();
});

/* Keeps "time inside" and overdue alerts fresh. */
setInterval(() => {
  if (staffMember && !rejectDialog.open) renderAll();
}, REFRESH_EVERY_MS);


/* ==========================================================================
   9. START-UP
   ========================================================================== */

fillStatusFilter();
showCorrectScreen();

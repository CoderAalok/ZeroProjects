/* Staff portal - security desk review, pass verification, inside tracker, and audit log */

/* Variables */
const BADGE_IDS = ['nav-badge', 'link-badge', 'pending-badge'];
const BASE_TITLE = document.title;

let staffMember = readSession('carepass_staff');
let showAllLogs = false;
let knownPendingIds = null;

const loginForm = $('login-form');
const signedInBox = $('staff-signed-in-box');
const desk = $('desk');
const rejectDialog = $('reject-dialog');
const rejectReason = $('reject-reason');

/* Calculate minutes elapsed since entry */
function minutesInside(visit) {
  return minutesSince(visit.entryTime);
}

/* Check if active visit exceeds overdue threshold */
function isOverdue(visit) {
  return minutesInside(visit) > OVERDUE_MINUTES;
}

/* Check if visit matches search query and status filter */
function matchesSearch(visit, data, query, status) {
  if (status && visit.status !== status) {
    return false;
  }
  if (!query) {
    return true;
  }

  const patient = findPatient(data, visit.patientId);
  const text = (visit.id + ' ' + visit.visitorName + ' ' + visit.mobile + ' ' +
                patient.name + ' ' + patient.id).toLowerCase();
  return text.includes(query);
}

/* Format patient name and ID label */
function patientLabel(data, visit) {
  return escapeHtml(findPatient(data, visit.patientId).name) + ' (' + escapeHtml(visit.patientId) + ')';
}

/* Render small action button with target status and visit ID */
function actionButton(visitId, newStatus, label, extraClass) {
  return '<button class="btn small ' + extraClass + '" data-id="' + visitId +
         '" data-to="' + newStatus + '">' + label + '</button>';
}

/* Update pending badges, browser title, and toast notifications */
function updateNotification(pendingVisits) {
  const count = pendingVisits.length;

  /* Update all badge elements with current pending count */
  for (let i = 0; i < BADGE_IDS.length; i++) {
    setBadge(BADGE_IDS[i], count);
  }

  /* Reflect pending count in browser tab title */
  if (count > 0) {
    document.title = '(' + count + ') ' + BASE_TITLE;
  } else {
    document.title = BASE_TITLE;
  }

  /* Identify newly arrived pending requests */
  const newVisits = [];
  if (knownPendingIds !== null) {
    for (let i = 0; i < pendingVisits.length; i++) {
      if (!knownPendingIds.includes(pendingVisits[i].id)) {
        newVisits.push(pendingVisits[i]);
      }
    }
  }

  knownPendingIds = [];
  for (let i = 0; i < pendingVisits.length; i++) {
    knownPendingIds.push(pendingVisits[i].id);
  }

  /* Notify staff of new incoming requests */
  if (newVisits.length === 1) {
    showToast('New visit request ' + newVisits[0].id + ' from ' + newVisits[0].visitorName, false);
  } else if (newVisits.length > 1) {
    showToast(newVisits.length + ' new visit requests received', false);
  }

  if (newVisits.length > 0) {
    for (let i = 0; i < BADGE_IDS.length; i++) {
      pulseBadge(BADGE_IDS[i]);
    }
  }
}

/* Clear all notification badges and reset title */
function clearNotification() {
  for (let i = 0; i < BADGE_IDS.length; i++) {
    setBadge(BADGE_IDS[i], 0);
  }
  document.title = BASE_TITLE;
  knownPendingIds = null;
}

/* Render table row for pending request review */
function pendingRow(visit, data) {
  return '<tr>' +
    '<td><strong>' + escapeHtml(visit.id) + '</strong></td>' +
    '<td>' + escapeHtml(visit.visitorName) + '</td>' +
    '<td>' + maskMobile(visit.mobile) + '</td>' +
    '<td>' + patientLabel(data, visit) + '</td>' +
    '<td><time datetime="' + visit.date + '">' + visit.date + '</time></td>' +
    '<td>' + escapeHtml(visit.slot) + '</td>' +
    '<td>' + actionButton(visit.id, STATUS.APPROVED, 'Approve', '') + ' ' +
             actionButton(visit.id, STATUS.REJECTED, 'Reject', 'danger') + '</td>' +
  '</tr>';
}

/* Render table row for visitors currently inside the facility */
function insideRow(visit, data) {
  const overdue = isOverdue(visit);

  let rowClass = '';
  let chip = statusChip(STATUS.ACTIVE);
  if (overdue) {
    rowClass = 'late';
    chip = statusChip('OVERDUE');
  }

  return '<tr class="' + rowClass + '">' +
    '<td><strong>' + escapeHtml(visit.id) + '</strong></td>' +
    '<td>' + escapeHtml(visit.visitorName) + '</td>' +
    '<td>' + patientLabel(data, visit) + '</td>' +
    '<td>' + formatTime(visit.entryTime) + '</td>' +
    '<td>' + minutesInside(visit) + ' min</td>' +
    '<td>' + chip + '</td>' +
    '<td>' + actionButton(visit.id, STATUS.EXITED, 'Record exit', 'danger') + '</td>' +
  '</tr>';
}

/* Render table row for searchable records list */
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

/* Render single audit log entry row */
function logRow(log) {
  const time = new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return '<tr>' +
    '<td><time datetime="' + log.time + '">' + time + '</time></td>' +
    '<td><strong>' + escapeHtml(log.who) + '</strong></td>' +
    '<td>' + statusChip(log.action) + '</td>' +
    '<td>' + escapeHtml(log.visitId) + '</td>' +
  '</tr>';
}

/* Draw audit log table with preview limits and toggle */
function drawAuditLog(logs) {
  const hasMore = logs.length > LOG_PREVIEW_COUNT;

  let howMany = logs.length;
  if (hasMore && !showAllLogs) {
    howMany = LOG_PREVIEW_COUNT;
  }

  let rows = '';
  for (let i = 0; i < howMany; i++) {
    rows += logRow(logs[i]);
  }
  if (rows === '') {
    rows = emptyRow(4, 'No actions recorded yet.');
  }

  $('log-rows').innerHTML = rows;
  $('log-count-text').textContent = 'Showing ' + howMany + ' of ' + logs.length + ' logs';
  $('btn-toggle-logs').hidden = !hasMore;

  if (hasMore) {
    if (showAllLogs) {
      $('toggle-log-text').textContent = 'Show less';
      $('toggle-log-icon').textContent = '▲';
    } else {
      $('toggle-log-text').textContent = 'Show more (' + (logs.length - LOG_PREVIEW_COUNT) + ' hidden)';
      $('toggle-log-icon').textContent = '▼';
    }
  }
}

/* Draw the entire control desk - call after any data modification */
function drawPage() {
  expireStaleVisits();
  const data = loadData();
  const query = $('search-text').value.toLowerCase().trim();
  const status = $('search-status').value;

  const pending = [];
  const inside = [];
  const records = [];
  let overdueCount = 0;
  let visitsToday = 0;

  /* Filter and group visits into pending, inside, and filtered records */
  for (let i = 0; i < data.visits.length; i++) {
    const visit = data.visits[i];

    if (visit.status === STATUS.PENDING) {
      pending.push(visit);
    }
    if (visit.status === STATUS.ACTIVE) {
      inside.push(visit);
      if (isOverdue(visit)) {
        overdueCount = overdueCount + 1;
      }
    }
    if (visit.date === today() && (visit.status === STATUS.ACTIVE || visit.status === STATUS.EXITED)) {
      visitsToday = visitsToday + 1;
    }
    if (matchesSearch(visit, data, query, status)) {
      records.unshift(visit);
    }
  }

  updateNotification(pending);

  /* Update dashboard metric counters */
  $('stat-pending').textContent = pending.length;
  $('stat-inside').textContent = inside.length;
  $('stat-overdue').textContent = overdueCount;
  $('stat-today').textContent = visitsToday;

  /* Render pending requests table */
  let html = '';
  for (let i = 0; i < pending.length; i++) {
    html += pendingRow(pending[i], data);
  }
  if (html === '') {
    html = emptyRow(7, 'All caught up. No pending requests waiting.');
  }
  $('pending-rows').innerHTML = html;

  /* Render visitors inside now table */
  html = '';
  for (let i = 0; i < inside.length; i++) {
    html += insideRow(inside[i], data);
  }
  if (html === '') {
    html = emptyRow(7, 'Nobody is inside right now.');
  }
  $('inside-rows').innerHTML = html;

  /* Render searchable records table */
  html = '';
  for (let i = 0; i < records.length; i++) {
    html += recordRow(records[i], data);
  }
  if (html === '') {
    html = emptyRow(8, 'No visit records yet. Visitor requests will appear here once submitted.');
  }
  $('record-rows').innerHTML = html;

  drawAuditLog(data.logs);
}

/* Fill the status filter dropdown from STATUS definitions */
function fillStatusFilter() {
  let html = '<option value="">All</option>';
  for (const name in STATUS) {
    html += '<option>' + STATUS[name] + '</option>';
  }
  $('search-status').innerHTML = html;
}

/* Toggle visibility between login form and authenticated control desk */
function showCorrectScreen() {
  const signedIn = staffMember !== null;

  loginForm.hidden = signedIn;
  signedInBox.hidden = !signedIn;
  desk.hidden = !signedIn;

  if (signedIn) {
    $('staff-container-name').textContent = staffMember.name;
    drawPage();
  } else {
    clearNotification();
  }
}

/* Update visit status and refresh dashboard */
function changeStatus(visitId, newStatus, reason) {
  if (!staffMember) {
    return;
  }
  const result = setStatus(visitId, newStatus, staffMember.name, reason);

  showResult(result, visitId + ' is now ' + newStatus.toLowerCase() + '.');
  drawPage();
}

/* Open rejection modal dialog for a pending visit */
function openRejectDialog(visitId) {
  $('reject-visit-id').value = visitId;
  rejectReason.value = '';
  rejectDialog.showModal();
}

/* Confirm visit rejection with required feedback reason */
function confirmReject(event) {
  const reason = rejectReason.value.trim();

  if (reason === '') {
    event.preventDefault();
    rejectReason.setCustomValidity('Please enter a reason for the visitor.');
    rejectReason.reportValidity();
    return;
  }
  rejectReason.setCustomValidity('');
  changeStatus($('reject-visit-id').value, STATUS.REJECTED, reason);
}

/* Security desk check-in: verify pass ID and record active entry */
function checkPass(event) {
  event.preventDefault();
  if (!staffMember) {
    return;
  }

  const passId = $('pass-id').value.trim().toUpperCase();
  const result = setStatus(passId, STATUS.ACTIVE, staffMember.name, '');
  const message = $('entry-message');

  message.dataset.ok = String(result.ok);
  if (result.ok) {
    message.textContent = 'Entry recorded for ' + passId;
    $('pass-id').value = '';
  } else {
    message.textContent = result.message;
  }
  drawPage();
}

/* Reset all records and logs back to initial clean state */
function resetEverything() {
  if (!confirm('Reset all visit records and audit logs back to a clean state?')) {
    return;
  }

  const freshData = resetData();
  if (freshData === null) {
    showToast('Could not reset records. Browser storage is unavailable or full.', true);
    return;
  }

  showAllLogs = false;
  knownPendingIds = null;
  drawPage();
  showToast('All logs and visit records have been reset.', false);
}

const EYE_OPEN_SVG = '<svg class="icon" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>';
const EYE_SLASH_SVG = '<svg class="icon" viewBox="0 0 16 16"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829"/><path d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z"/></svg>';

/* Toggle password field visibility and switch vector eye icon */
function togglePasswordVisibility() {
  const input = $('staff-password-input');

  if (input.type === 'password') {
    input.type = 'text';
    $('eye-icon').innerHTML = EYE_SLASH_SVG;
    $('btn-toggle-password').setAttribute('aria-label', 'Hide password');
  } else {
    input.type = 'password';
    $('eye-icon').innerHTML = EYE_OPEN_SVG;
    $('btn-toggle-password').setAttribute('aria-label', 'Show password');
  }
}

/* Authenticate staff credentials */
function login(event) {
  event.preventDefault();
  const username = loginForm.elements.username.value.trim();
  const password = loginForm.elements.password.value;

  const data = loadData();
  let match = null;
  for (let i = 0; i < data.staff.length; i++) {
    if (data.staff[i].username === username && data.staff[i].password === password) {
      match = data.staff[i];
    }
  }

  if (!match) {
    showToast('Wrong username or password.', true);
    return;
  }

  staffMember = { username: match.username, name: match.name };
  sessionStorage.setItem('carepass_staff', JSON.stringify(staffMember));
  showCorrectScreen();
  showToast('Welcome, ' + match.name, false);
}

/* End staff session and show login screen */
function logout() {
  staffMember = null;
  sessionStorage.removeItem('carepass_staff');
  showCorrectScreen();
}

/* Event listeners */
loginForm.addEventListener('submit', login);
$('staff-container-logout').addEventListener('click', logout);
$('btn-toggle-password').addEventListener('click', togglePasswordVisibility);

$('entry-form').addEventListener('submit', checkPass);

$('records-filter').addEventListener('submit', function (event) { event.preventDefault(); });
$('search-text').addEventListener('input', drawPage);
$('search-status').addEventListener('change', drawPage);

$('reject-form').addEventListener('submit', confirmReject);
rejectReason.addEventListener('input', function () { rejectReason.setCustomValidity(''); });
$('reject-cancel').addEventListener('click', function () { rejectDialog.close(); });

$('btn-toggle-logs').addEventListener('click', function () {
  showAllLogs = !showAllLogs;
  drawPage();
});
$('btn-reset-all-records').addEventListener('click', resetEverything);

/* Handle delegation for table action buttons */
document.addEventListener('click', function (event) {
  const button = event.target.closest('button[data-id]');
  if (!button) {
    return;
  }

  if (button.dataset.to === STATUS.REJECTED) {
    openRejectDialog(button.dataset.id);
  } else {
    changeStatus(button.dataset.id, button.dataset.to, '');
  }
});

/* Live update when visitor submits or cancels a request in another tab */
window.addEventListener('storage', function (event) {
  if (event.key === STORAGE_KEY && staffMember) {
    drawPage();
  }
});

/* Periodic background refresh for overdue visit calculation */
setInterval(function () {
  if (staffMember && !rejectDialog.open) {
    drawPage();
  }
}, REFRESH_EVERY_MS);

/* Initialize staff portal */
fillStatusFilter();
showCorrectScreen();


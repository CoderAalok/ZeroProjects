/* ==========================================================================
   patient.js - Patient portal (visitor phone numbers are never shown)

   FILE ORDER: 1. DOM references  2. Helpers  3. Rendering
               4. Event listeners  5. Start-up
   ========================================================================== */


/* 1. DOM REFERENCES */
const patientPicker = $('patient-picker');


/* 2. HELPERS */
function countByStatus(visits, statuses) {
  return visits.filter((visit) => statuses.includes(visit.status)).length;
}


/* 3. RENDERING */
function fillPatientPicker() {
  patientPicker.innerHTML = loadData().patients
    .map((patient) => '<option value="' + patient.id + '">' + escapeHtml(patient.name) + ' (' + escapeHtml(patient.id) + ')</option>')
    .join('');
}

function visitorRow(visit) {
  return '<tr>' +
    '<td><strong>' + escapeHtml(visit.visitorName) + '</strong></td>' +
    '<td><time datetime="' + visit.date + '">' + visit.date + '</time></td>' +
    '<td>' + escapeHtml(visit.slot) + '</td>' +
    '<td>' + statusChip(visit.status) + '</td>' +
    '<td>' + formatTime(visit.entryTime) + '</td>' +
    '<td>' + formatTime(visit.exitTime) + '</td>' +
  '</tr>';
}

function render() {
  const data = loadData();
  const patient = findPatient(data, patientPicker.value);
  const visits = data.visits.filter((visit) => visit.patientId === patientPicker.value).reverse();

  // Patient details card
  $('patient-view-id').textContent   = patient.id || '-';
  $('patient-view-name').textContent = patient.name || '-';
  $('patient-view-ward').textContent = patient.ward || '-';
  $('patient-view-room').textContent = patient.room || '-';

  // Stats
  $('count-inside').textContent   = countByStatus(visits, [STATUS.ACTIVE]);
  $('count-upcoming').textContent = countByStatus(visits, STATUS_GROUPS.upcoming);
  $('count-past').textContent     = countByStatus(visits, STATUS_GROUPS.past);

  // Visitors table
  $('visitor-rows').innerHTML =
    tableRowsOrEmpty(visits, visitorRow, 6, 'No visitor records found for this patient.');
}


/* 4. EVENT LISTENERS */
patientPicker.addEventListener('change', render);

/* LIVE UPDATE: staff changed a visit in another tab. */
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) render();
});


/* 5. START-UP */
fillPatientPicker();
render();

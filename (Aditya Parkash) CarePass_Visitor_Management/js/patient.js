/* Patient portal - displays patient details and visit records */

const patientPicker = $('patient-picker');

/* Fill the "Select Patient Profile" dropdown */
function fillPatientPicker() {
  const data = loadData();
  let html = '';

  for (let i = 0; i < data.patients.length; i++) {
    const patient = data.patients[i];
    html += '<option value="' + patient.id + '">' + escapeHtml(patient.name) +
            ' (' + escapeHtml(patient.id) + ')</option>';
  }
  patientPicker.innerHTML = html;
}

/* Render one table row for a visit */
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

/* Draw the whole page for the selected patient */
function render() {
  expireStaleVisits();
  const data = loadData();
  const patientId = patientPicker.value;
  const patient = findPatient(data, patientId);

  /* Collect visits for this patient (newest first) and count statistics */
  let rows = '';
  let inside = 0;
  let upcoming = 0;
  let past = 0;

  for (let i = data.visits.length - 1; i >= 0; i--) {
    const visit = data.visits[i];
    if (visit.patientId !== patientId) {
      continue;
    }

    rows += visitorRow(visit);

    if (visit.status === STATUS.ACTIVE) {
      inside = inside + 1;
    } else if (visit.status === STATUS.PENDING || visit.status === STATUS.APPROVED) {
      upcoming = upcoming + 1;
    } else {
      past = past + 1;
    }
  }

  if (rows === '') {
    rows = emptyRow(6, 'No visitor records found for this patient.');
  }

  /* Display patient details */
  $('patient-view-id').textContent = patient.id || '-';
  $('patient-view-name').textContent = patient.name || '-';
  $('patient-view-ward').textContent = patient.ward || '-';
  $('patient-view-room').textContent = patient.room || '-';

  /* Display count summary and visitor rows */
  $('count-inside').textContent = inside;
  $('count-upcoming').textContent = upcoming;
  $('count-past').textContent = past;
  $('visitor-rows').innerHTML = rows;
}

/* Event listeners */
patientPicker.addEventListener('change', render);

/* Live update when data changes in another browser tab */
window.addEventListener('storage', function (event) {
  if (event.key === STORAGE_KEY) {
    render();
  }
});

/* Initialize patient portal */
fillPatientPicker();
render();


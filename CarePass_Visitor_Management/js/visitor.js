/* 
   visitor.js - Visitor portal (multi-step flow)
   Step 1: Contact -> Step 2: OTP -> Step 3: Patient & Slot -> Step 4: Done

   FILE ORDER (look here first when debugging):
     1. Constants & state
     2. DOM references
     3. Step navigation
     4. Form setup (patients, date, slots)
     5. Rendering of "my requests"
     6. Actions (one per step)
     7. Event listeners
     8. Start-up

   When the booking form is submitted (section 6, submitBooking) addVisit()
   saves a PENDING visit. The staff portal sees that change and shows its red
   notification badge.
   */


/* 1. CONSTANTS & STATE */

/* Limits such as RECORD_PREVIEW_COUNT live in config.js. */

let currentOtp = null;
let visitor = readSessionJson('carepass_visitor'); // { name, mobile }
let stepRendered = false;          // skip focus moves on the very first render
let showAllRecords = false;        // request list: preview vs everything


/* 2. DOM REFERENCES */

const stepPanels = [$('step-contact'), $('step-otp'), $('step-booking'), $('step-done')];
const stepDots   = [$('dot-1'), $('dot-2'), $('dot-3'), $('dot-4')];
const stepLinks  = [$('conn-1'), $('conn-2'), $('conn-3')];

const contactForm = $('contact-form');
const otpForm     = $('otp-form');
const bookingForm = $('booking-form');


/* 3. STEP NAVIGATION */

/* Show one step (1-4) and update the progress dots. */
function setStep(step) {
  const index = step - 1;
  const isLast = index === stepPanels.length - 1;

  stepPanels.forEach((panel, i) => { panel.hidden = i !== index; });

  stepDots.forEach((dot, i) => {
    dot.classList.toggle('done', i < index || (isLast && i === index));
    dot.classList.toggle('active', i === index);
    if (i === index) dot.setAttribute('aria-current', 'step');
    else dot.removeAttribute('aria-current');
  });
  stepLinks.forEach((link, i) => link.classList.toggle('active', i < index));

  if (step === 3) {
    if (visitor) $('verified-user-label').textContent = visitor.name + ' (' + maskMobile(visitor.mobile) + ')';
    updateSlotOptions();
  }

  // Move focus to the new step's heading for screen-reader users
  if (stepRendered) {
    const heading = stepPanels[index].querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }
  stepRendered = true;

  renderRequests();
}


/* 4. FORM SETUP (patients, date, slots) */

function fillPatientList() {
  const options = loadData().patients.map((patient) =>
    '<option value="' + patient.id + '">' + escapeHtml(patient.name) + ' (' + escapeHtml(patient.ward) +
    ' - Rm ' + escapeHtml(patient.room) + ')</option>');

  $('booking-patient').innerHTML = '<option value="">Choose a patient</option>' + options.join('');
}

/* Slots this visitor already booked on the chosen date. */
function bookedSlots(date) {
  if (!visitor || !date) return [];
  return loadData().visits
    .filter((v) => v.mobile === visitor.mobile && v.date === date && isOpenStatus(v.status))
    .map((v) => v.slot);
}

function slotOption(slot, date, booked) {
  const isBooked = booked.includes(slot);
  const isPast   = slotHasEnded(date, slot);
  const note     = isBooked ? ' (Already Booked)' : (isPast ? ' (Time passed)' : '');

  return '<option value="' + slot + '"' + (isBooked || isPast ? ' disabled' : '') + '>' +
         slot + note + '</option>';
}

function updateSlotOptions() {
  const date   = $('booking-date').value;
  const select = $('booking-slot');
  const booked = bookedSlots(date);
  const previous = select.value;

  select.innerHTML = '<option value="">Choose a slot</option>' +
    VISIT_SLOTS.map((slot) => slotOption(slot, date, booked)).join('');

  // Keep the earlier choice if it is still available
  if (VISIT_SLOTS.includes(previous) && !booked.includes(previous) && !slotHasEnded(date, previous)) {
    select.value = previous;
  }
}

function setupDateField() {
  const dateField = $('booking-date');
  dateField.min = today();

  // After the last slot of the day, start on tomorrow instead of an empty list
  const allEnded = VISIT_SLOTS.every((slot) => slotHasEnded(today(), slot));
  dateField.value = allEnded
    ? tomorrow()
    : today();
  updateSlotOptions();
}


/* 5. RENDERING OF "MY REQUESTS" */

function passCard(visit, patient) {
  return '' +
    '<article class="pass" aria-label="Visitor pass">' +
      '<h4>Visitor pass</h4>' +
      '<p class="pass-id">' + escapeHtml(visit.id) + '</p>' +
      '<dl>' +
        '<dt>Visitor</dt><dd>' + escapeHtml(visit.visitorName) + '</dd>' +
        '<dt>Patient</dt><dd>' + escapeHtml(patient.name) + ', Rm ' + escapeHtml(patient.room) + '</dd>' +
        '<dt>Slot</dt><dd>' + escapeHtml(visit.slot) + '</dd>' +
      '</dl>' +
      '<div class="barcode" aria-hidden="true"></div>' +
      '<small>Show this ID at the security desk</small>' +
    '</article>';
}

function requestCard(visit, data) {
  const patient   = findPatient(data, visit.patientId);
  const hasPass   = STATUS_GROUPS.hasPass.includes(visit.status);
  const canCancel = canTransition(visit.status, STATUS.CANCELLED);

  const reasonHtml = visit.reason
    ? '<p><strong>Reason:</strong> ' + escapeHtml(visit.reason) + '</p>'
    : '';
  const cancelHtml = canCancel
    ? '<button class="btn danger small" data-cancel="' + visit.id + '">Cancel request</button>'
    : '';

  return '' +
    '<article class="card visit">' +
      '<div>' +
        '<header>' +
          '<h3>' + escapeHtml(patient.name) + '</h3>' + statusChip(visit.status) +
        '</header>' +
        '<p class="meta">' + escapeHtml(patient.ward) + ', Room ' + escapeHtml(patient.room) +
          ' &middot; <time datetime="' + visit.date + '">' + visit.date + '</time>' +
          ' &middot; ' + escapeHtml(visit.slot) + '</p>' +
        progressTrack(visit.status) +
        reasonHtml +
        cancelHtml +
      '</div>' +
      (hasPass ? passCard(visit, patient) : '') +
    '</article>';
}

/* Visit cards as a real list, so screen readers announce "list, N items". */
function requestList(visits, data) {
  return '<ul class="request-items">' +
    visits.map((visit) => '<li>' + requestCard(visit, data) + '</li>').join('') +
  '</ul>';
}

function renderRecordsFooter(total) {
  const footer  = $('visitor-records-footer');
  const hasMore = total > RECORD_PREVIEW_COUNT;
  if (!footer) return;

  footer.hidden = !hasMore;
  if (!hasMore) return;

  $('visitor-records-count-text').textContent = showAllRecords
    ? 'Showing all ' + total + ' requests'
    : 'Showing ' + RECORD_PREVIEW_COUNT + ' of ' + total + ' requests';
  $('toggle-record-text').textContent = showAllRecords
    ? 'Show less'
    : 'Show more (' + (total - RECORD_PREVIEW_COUNT) + ' hidden)';
  $('toggle-record-icon').className = showAllRecords
    ? 'fa-solid fa-chevron-up'
    : 'fa-solid fa-chevron-down';
}

function renderRequests() {
  const container = $('request-list');
  const data = loadData();

  if (!visitor) {
    renderRecordsFooter(0);
    container.innerHTML = '<p class="hint empty-state">Enter your details above to submit requests and track your digital passes.</p>';
    return;
  }

  const myVisits = data.visits.filter((visit) => visit.mobile === visitor.mobile).reverse();

  if (myVisits.length === 0) {
    renderRecordsFooter(0);
    container.innerHTML = '<p class="hint empty-state">No visit requests found for this mobile. Complete the steps above to book your first visit.</p>';
    return;
  }

  const shown = showAllRecords ? myVisits : myVisits.slice(0, RECORD_PREVIEW_COUNT);
  container.innerHTML = requestList(shown, data);
  renderRecordsFooter(myVisits.length);
}


/* 6. ACTIONS (one per step) */

/* Step 1: check the details and create the demo OTP. */
function submitContact(event) {
  event.preventDefault();

  if (!$('visitor-fullname').checkValidity() || !$('visitor-mobile').checkValidity()) {
    contactForm.reportValidity();
    return;
  }

  currentOtp = String(100000 + Math.floor(Math.random() * 900000));
  $('otp-display').textContent = currentOtp;
  $('visitor-otp').value = '';

  setStep(2);
  $('visitor-otp').focus();
  showToast('Demo OTP generated: ' + currentOtp);
}

/* Step 2: verify the OTP and remember the visitor for this session. */
function submitOtp(event) {
  event.preventDefault();

  if ($('visitor-otp').value.trim() !== currentOtp) {
    showToast('Wrong OTP. Check the demo code shown above.', true);
    return;
  }

  visitor = {
    name: $('visitor-fullname').value.trim(),
    mobile: $('visitor-mobile').value.trim(),
  };
  sessionStorage.setItem('carepass_visitor', JSON.stringify(visitor));

  setStep(3);
  showToast('Verified! Now select the patient and visiting slot.');
}

/* Step 3: SUBMIT THE SLOT. Creates a PENDING visit -> staff badge turns on. */
function submitBooking(event) {
  event.preventDefault();

  const result = addVisit({
    visitorName: visitor.name,
    mobile: visitor.mobile,
    patientId: $('booking-patient').value,
    date: $('booking-date').value,
    slot: $('booking-slot').value,
  });

  if (result.ok) {
    showToast('Visit request submitted! Staff have been notified.');
    setStep(4);
    bookingForm.reset();
    setupDateField();
  } else {
    showToast(result.message, true);
  }
  renderRequests();
}

function cancelRequest(visitId) {
  const result = setStatus(visitId, STATUS.CANCELLED);

  showResult(result, 'Request cancelled.');
  renderRequests();
  updateSlotOptions();
}

function changeNumber() {
  visitor = null;
  sessionStorage.removeItem('carepass_visitor');
  $('visitor-fullname').value = '';
  $('visitor-mobile').value = '';
  $('visitor-otp').value = '';
  setStep(1);
  showToast('Switched to visitor details.');
}


/* 7. EVENT LISTENERS */

/* Forms */
contactForm.addEventListener('submit', submitContact);
otpForm.addEventListener('submit', submitOtp);
bookingForm.addEventListener('submit', submitBooking);

/* Step buttons */
$('btn-back-to-contact').addEventListener('click', () => setStep(1));
$('btn-back-to-otp').addEventListener('click', () => setStep(2));
$('btn-change-number').addEventListener('click', changeNumber);
$('btn-book-another').addEventListener('click', () => setStep(3));

/* Booking form */
$('booking-date').addEventListener('change', updateSlotOptions);

/* Request list: cancel buttons + show more / less */
$('request-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-cancel]');
  if (button) cancelRequest(button.dataset.cancel);
});

$('btn-toggle-visitor-records').addEventListener('click', () => {
  showAllRecords = !showAllRecords;
  renderRequests();
});

/* LIVE UPDATE: staff approved / rejected a request in another tab. */
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return;
  renderRequests();
  updateSlotOptions();
});


/* 8. START-UP */

fillPatientList();
setupDateField();

if (visitor) {
  $('visitor-fullname').value = visitor.name;
  $('visitor-mobile').value = visitor.mobile;
  setStep(3);                      // resume on the booking step
} else {
  setStep(1);
}

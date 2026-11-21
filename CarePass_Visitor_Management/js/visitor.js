/* Visitor portal - registration, verification, pass display, and status tracking */

/* Variables */
let currentOtp = '';
let visitor = readSession('carepass_visitor');
let showAllRecords = false;
let firstDraw = true;

const stepPanels = [$('step-contact'), $('step-otp'), $('step-booking'), $('step-done')];
const stepDots = [$('dot-1'), $('dot-2'), $('dot-3'), $('dot-4')];
const stepLinks = [$('conn-1'), $('conn-2'), $('conn-3')];

const contactForm = $('contact-form');
const otpForm = $('otp-form');
const bookingForm = $('booking-form');

/* Show one step (1 to 4) and update progress indicators */
function setStep(step) {
  const index = step - 1;
  const isLast = index === stepPanels.length - 1;

  for (let i = 0; i < stepPanels.length; i++) {
    stepPanels[i].hidden = i !== index;

    stepDots[i].classList.toggle('done', i < index || (isLast && i === index));
    stepDots[i].classList.toggle('active', i === index);
    if (i === index) {
      stepDots[i].setAttribute('aria-current', 'step');
    } else {
      stepDots[i].removeAttribute('aria-current');
    }
  }

  for (let i = 0; i < stepLinks.length; i++) {
    stepLinks[i].classList.toggle('active', i < index);
  }

  if (step === 3) {
    if (visitor) {
      $('verified-user-label').textContent = visitor.name + ' (' + maskMobile(visitor.mobile) + ')';
    }
    updateSlotOptions();
  }

  /* Move focus to the current step heading for accessibility */
  if (!firstDraw) {
    const heading = stepPanels[index].querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }
  firstDraw = false;

  renderRequests();
}

/* Fill the patient selection dropdown */
function fillPatientList() {
  const data = loadData();
  let html = '<option value="">Choose a patient</option>';

  for (let i = 0; i < data.patients.length; i++) {
    const patient = data.patients[i];
    html += '<option value="' + patient.id + '">' + escapeHtml(patient.name) + ' (' +
            escapeHtml(patient.ward) + ' - Rm ' + escapeHtml(patient.room) + ')</option>';
  }
  $('booking-patient').innerHTML = html;
}

/* Retrieve slots already booked by this visitor on the selected date */
function getBookedSlots(date) {
  const booked = [];
  if (!visitor || !date) {
    return booked;
  }

  const data = loadData();
  for (let i = 0; i < data.visits.length; i++) {
    const visit = data.visits[i];
    if (visit.mobile === visitor.mobile && visit.date === date && isOpen(visit.status)) {
      booked.push(visit.slot);
    }
  }
  return booked;
}

/* Rebuild the slot dropdown and disable unavailable or passed slots */
function updateSlotOptions() {
  const date = $('booking-date').value;
  const select = $('booking-slot');
  const booked = getBookedSlots(date);
  const previous = select.value;

  let html = '<option value="">Choose a slot</option>';
  for (let i = 0; i < VISIT_SLOTS.length; i++) {
    const slot = VISIT_SLOTS[i];
    const isBooked = booked.includes(slot);
    const isPast = slotHasEnded(date, slot);

    let note = '';
    if (isBooked) {
      note = ' (Already Booked)';
    } else if (isPast) {
      note = ' (Time passed)';
    }

    let disabled = '';
    if (isBooked || isPast) {
      disabled = ' disabled';
    }
    html += '<option value="' + slot + '"' + disabled + '>' + slot + note + '</option>';
  }
  select.innerHTML = html;

  /* Retain prior selection if still valid */
  if (VISIT_SLOTS.includes(previous) && !booked.includes(previous) && !slotHasEnded(date, previous)) {
    select.value = previous;
  }
}

/* Set up the date field constraints and default value */
function setupDateField() {
  const dateField = $('booking-date');
  dateField.min = today();

  /* Default to tomorrow if all visiting slots for today have ended */
  let allEnded = true;
  for (let i = 0; i < VISIT_SLOTS.length; i++) {
    if (!slotHasEnded(today(), VISIT_SLOTS[i])) {
      allEnded = false;
    }
  }

  if (allEnded) {
    dateField.value = tomorrow();
  } else {
    dateField.value = today();
  }
  updateSlotOptions();
}

/* Render digital visitor pass card for approved and active visits */
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

/* Render single request card with status and actions */
function requestCard(visit, data) {
  const patient = findPatient(data, visit.patientId);

  let reasonHtml = '';
  if (visit.reason) {
    reasonHtml = '<p><strong>Reason:</strong> ' + escapeHtml(visit.reason) + '</p>';
  }

  let cancelHtml = '';
  if (canChange(visit.status, STATUS.CANCELLED)) {
    cancelHtml = '<button class="btn danger small" data-cancel="' + visit.id + '">Cancel request</button>';
  }

  let passHtml = '';
  if (hasPass(visit.status)) {
    passHtml = passCard(visit, patient);
  }

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
      passHtml +
    '</article>';
}

/* Update footer toggle and count indicator for visit requests */
function renderRecordsFooter(total) {
  const footer = $('visitor-records-footer');
  const hasMore = total > RECORD_PREVIEW_COUNT;

  footer.hidden = !hasMore;
  if (!hasMore) {
    return;
  }

  if (showAllRecords) {
    $('visitor-records-count-text').textContent = 'Showing all ' + total + ' requests';
    $('toggle-record-text').textContent = 'Show less';
    $('toggle-record-icon').textContent = '▲';
  } else {
    $('visitor-records-count-text').textContent = 'Showing ' + RECORD_PREVIEW_COUNT + ' of ' + total + ' requests';
    $('toggle-record-text').textContent = 'Show more (' + (total - RECORD_PREVIEW_COUNT) + ' hidden)';
    $('toggle-record-icon').textContent = '▼';
  }
}

/* Render all requests and passes for the verified visitor */
function renderRequests() {
  expireStaleVisits();
  const container = $('request-list');
  const data = loadData();

  if (!visitor) {
    renderRecordsFooter(0);
    container.innerHTML = '<p class="hint empty-state">Enter your details above to submit requests and track your digital passes.</p>';
    return;
  }

  /* Filter visits matching this visitor mobile */
  const myVisits = [];
  for (let i = data.visits.length - 1; i >= 0; i--) {
    if (data.visits[i].mobile === visitor.mobile) {
      myVisits.push(data.visits[i]);
    }
  }

  if (myVisits.length === 0) {
    renderRecordsFooter(0);
    container.innerHTML = '<p class="hint empty-state">No visit requests found for this mobile. Complete the steps above to book your first visit.</p>';
    return;
  }

  let howMany = myVisits.length;
  if (!showAllRecords && howMany > RECORD_PREVIEW_COUNT) {
    howMany = RECORD_PREVIEW_COUNT;
  }

  let html = '<ul class="request-items">';
  for (let i = 0; i < howMany; i++) {
    html += '<li>' + requestCard(myVisits[i], data) + '</li>';
  }
  html += '</ul>';

  container.innerHTML = html;
  renderRecordsFooter(myVisits.length);
}

/* Step 1: Validate contact details and generate demo OTP */
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
  showToast('Demo OTP generated: ' + currentOtp, false);
}

/* Step 2: Verify submitted OTP and save session */
function submitOtp(event) {
  event.preventDefault();

  if ($('visitor-otp').value.trim() !== currentOtp) {
    showToast('Wrong OTP. Check the demo code shown above.', true);
    return;
  }

  visitor = {
    name: $('visitor-fullname').value.trim(),
    mobile: $('visitor-mobile').value.trim()
  };
  sessionStorage.setItem('carepass_visitor', JSON.stringify(visitor));

  setStep(3);
  showToast('Verified! Now select the patient and visiting slot.', false);
}

/* Step 3: Submit booking request for staff review */
function submitBooking(event) {
  event.preventDefault();

  const result = addVisit({
    visitorName: visitor.name,
    mobile: visitor.mobile,
    patientId: $('booking-patient').value,
    date: $('booking-date').value,
    slot: $('booking-slot').value
  });

  if (result.ok) {
    showToast('Visit request submitted! Staff have been notified.', false);
    setStep(4);
    bookingForm.reset();
    setupDateField();
  } else {
    showToast(result.message, true);
  }
  renderRequests();
}

/* Cancel an open visit request */
function cancelRequest(visitId) {
  const result = setStatus(visitId, STATUS.CANCELLED, 'Visitor', '');

  showResult(result, 'Request cancelled.');
  renderRequests();
  updateSlotOptions();
}

/* Reset session to allow entering a different visitor contact */
function changeNumber() {
  visitor = null;
  sessionStorage.removeItem('carepass_visitor');
  $('visitor-fullname').value = '';
  $('visitor-mobile').value = '';
  $('visitor-otp').value = '';
  setStep(1);
  showToast('Switched to visitor details.', false);
}

/* Event listeners */
contactForm.addEventListener('submit', submitContact);
otpForm.addEventListener('submit', submitOtp);
bookingForm.addEventListener('submit', submitBooking);

$('btn-back-to-contact').addEventListener('click', function () { setStep(1); });
$('btn-back-to-otp').addEventListener('click', function () { setStep(2); });
$('btn-change-number').addEventListener('click', changeNumber);
$('btn-book-another').addEventListener('click', function () { setStep(3); });

$('booking-date').addEventListener('change', updateSlotOptions);

/* Handle delegation for dynamic cancel buttons */
$('request-list').addEventListener('click', function (event) {
  const button = event.target.closest('[data-cancel]');
  if (button) {
    cancelRequest(button.dataset.cancel);
  }
});

$('btn-toggle-visitor-records').addEventListener('click', function () {
  showAllRecords = !showAllRecords;
  renderRequests();
});

/* Live update when request status changes in another tab */
window.addEventListener('storage', function (event) {
  if (event.key === STORAGE_KEY) {
    renderRequests();
    updateSlotOptions();
  }
});

/* Initialize visitor portal */
fillPatientList();
setupDateField();

if (visitor) {
  $('visitor-fullname').value = visitor.name;
  $('visitor-mobile').value = visitor.mobile;
  setStep(3);
} else {
  setStep(1);
}


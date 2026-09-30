/**
 * Frontend Controller & UI Coordinator for Hospital Visitor Management System
 * Interfaces with HVMSBackendAPI and manages DOM updates, stepper navigation,
 * OTP timers, pass rendering, staff dashboard, and patient views.
 */

(function (global) {
  'use strict';

  // Application State
  const state = {
    activePortal: 'home',
    visitorStep: 1,
    visitorSession: null, // { name, mobileNumber, visitorId, sessionToken }
    otpTimerInterval: null,
    otpSecondsRemaining: 300,
    selectedPatientId: null,
    activeStaff: null, // { id, name, username, role }
    activeStaffTab: 'pending',
    selectedPatientPortalId: 'P101'
  };

  // Helper DOM Selectors
  const $ = (id) => document.getElementById(id);
  const escapeHTML = s => String(s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let toastTimer = null;

  // System Initialization
  function init() {
    hideToast();
    setupEventListeners();
    startLiveClock();
    checkVisitingHours();
    renderPatientPortalDropdown();
    renderPatientPortalView();
    updateStaffBadges();
    updateHomeStats();
  }

  // ----------------------------------------------------
  // EVENT LISTENERS & CLOCK
  // ----------------------------------------------------
  function setupEventListeners() {
    // Portal Tabs Navigation
    $('tab-home').addEventListener('click', () => switchPortal('home'));
    $('tab-visitor').addEventListener('click', () => switchPortal('visitor'));
    $('tab-staff').addEventListener('click', () => switchPortal('staff'));
    $('tab-patient').addEventListener('click', () => switchPortal('patient'));
    setupTabKeyboardNavigation('.portal-tabs [role="tab"]', (tab) => {
      switchPortal(tab.id.replace('tab-', ''));
    });
    setupTabKeyboardNavigation('.staff-subnav [role="tab"]', (tab) => {
      switchStaffTab(tab.id.replace('staff-tab-', ''));
    });

    // Step 1: Visitor Registration
    $('form-visitor-register').addEventListener('submit', onRegisterSubmit);

    // Step 2: OTP Verification
    $('form-verify-otp').addEventListener('submit', onVerifyOTPSubmit);

    // Step 4: Visit Schedule Form
    $('form-visit-slot').addEventListener('submit', onVisitSlotSubmit);

    // Staff Login Form
    $('form-staff-login').addEventListener('submit', onStaffLoginSubmit);

    // Set minimum date to today for visit date selector
    const dateInput = $('visit-date-input');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.min = today;
      dateInput.value = today;
    }
  }

  function setupTabKeyboardNavigation(selector, activateTab) {
    const tabs = [...document.querySelectorAll(selector)];
    tabs.forEach((tab, index) => {
      tab.addEventListener('keydown', (event) => {
        const keyActions = {
          ArrowRight: 1,
          ArrowDown: 1,
          ArrowLeft: -1,
          ArrowUp: -1,
          Home: -index,
          End: tabs.length - 1 - index
        };
        if (!(event.key in keyActions)) return;

        event.preventDefault();
        const nextIndex = (index + keyActions[event.key] + tabs.length) % tabs.length;
        const nextTab = tabs[nextIndex];
        activateTab(nextTab);
        nextTab.focus();
      });
    });
  }

  function startLiveClock() {
    const clockEl = $('live-clock');
    if (!clockEl) return;
    const updateTime = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  function checkVisitingHours() {
    const hoursInfo = HVMSBackendAPI.getVisitingHoursInfo();
    const statusEl = $('visiting-hours-status');
    if (!statusEl) return;

    if (hoursInfo.isOpen) {
      statusEl.className = 'hours-badge hours-open';
      statusEl.innerHTML = `<i class="fa-solid fa-clock" aria-hidden="true"></i> 09:00 AM - 09:00 PM <span class="state-pill state-open">OPEN</span>`;
    } else {
      statusEl.className = 'hours-badge hours-closed';
      statusEl.innerHTML = `<i class="fa-solid fa-clock" aria-hidden="true"></i> 09:00 AM - 09:00 PM <span class="state-pill state-closed">CLOSED</span>`;
    }
  }

  function showToast(message, isError = false) {
    const toast = $('global-toast');
    const msgEl = $('toast-message');
    if (!toast || !msgEl) return;

    msgEl.textContent = message;
    toast.style.background = isError ? '#dc2626' : '#0f172a';
    toast.hidden = false;

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 3500);
  }

  function hideToast() {
    const toast = $('global-toast');
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    if (toast) toast.hidden = true;
  }

  // ----------------------------------------------------
  // PORTAL SWITCHING
  // ----------------------------------------------------
  function switchPortal(portalName) {
    state.activePortal = portalName;

    // Update Portal Tab styling
    ['home', 'visitor', 'staff', 'patient'].forEach(p => {
      const tab = $(`tab-${p}`);
      const section = $(`portal-${p}`);
      const isActive = p === portalName;

      if (tab) {
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.tabIndex = isActive ? 0 : -1;
        if (isActive) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      }

      if (section) {
        section.hidden = !isActive;
        if (isActive) {
          section.classList.add('active');
        } else {
          section.classList.remove('active');
        }
      }
    });

    if (portalName === 'visitor') {
      goToVisitorStep(state.visitorStep || 1);
    } else if (portalName === 'patient') {
      renderPatientPortalView();
    } else if (portalName === 'staff') {
      if (state.activeStaff) {
        if ($('staff-login-card')) $('staff-login-card').hidden = true;
        if ($('staff-dashboard')) $('staff-dashboard').hidden = false;
        renderStaffSubtab(state.activeStaffTab || 'pending');
      } else {
        if ($('staff-login-card')) $('staff-login-card').hidden = false;
        if ($('staff-dashboard')) $('staff-dashboard').hidden = true;
      }
    }
  }

  // ----------------------------------------------------
  // VISITOR PORTAL WORKFLOW
  // ----------------------------------------------------
  function goToVisitorStep(stepNum) {
    state.visitorStep = stepNum;

    // Update Stepper Nodes
    for (let i = 1; i <= 5; i++) {
      const node = $(`step-node-${i}`);
      const card = $(`visitor-step-${i}`);

      if (i < stepNum) {
        node.className = 'step-item completed';
      } else if (i === stepNum) {
        node.className = 'step-item active';
      } else {
        node.className = 'step-item';
      }
      if (i === stepNum) {
        node.setAttribute('aria-current', 'step');
      } else {
        node.removeAttribute('aria-current');
      }

      if (card) {
        card.hidden = (i !== stepNum);
      }
    }

    if (stepNum === 3) {
      onPatientSearchInput(''); // Load initial patient grid
    } else if (stepNum === 5) {
      renderVisitorDashboard();
    }
  }

  // Step 1: Submit Details & Request OTP
  function onRegisterSubmit(e) {
    e.preventDefault();
    const nameInput = $('reg-name');
    const mobileInput = $('reg-mobile');

    $('err-reg-name').textContent = '';
    $('err-reg-mobile').textContent = '';
    nameInput.removeAttribute('aria-invalid');
    mobileInput.removeAttribute('aria-invalid');

    const name = nameInput.value.trim();
    const mobile = mobileInput.value.trim();
    let valid = true;

    if (!name || name.length < 2) {
      $('err-reg-name').textContent = 'Please enter a valid full name (at least 2 characters).';
      nameInput.setAttribute('aria-invalid', 'true');
      valid = false;
    }

    if (!mobile || !/^\d{10}$/.test(mobile)) {
      $('err-reg-mobile').textContent = 'Please enter a valid 10-digit mobile number.';
      mobileInput.setAttribute('aria-invalid', 'true');
      valid = false;
    }

    if (!valid) return;

    const response = HVMSBackendAPI.requestOTP(mobile, name);
    if (!response.success) {
      showToast(response.message, true);
      return;
    }

    // Success -> Setup Step 2 UI
    $('otp-target-mobile').textContent = `+91 ${mobile.slice(-4).padStart(10, '*')}`;
    $('demo-otp-code').textContent = response.demoOtp;
    startOTPTimer();

    showToast(response.message);
    goToVisitorStep(2);
  }

  // OTP Countdown Timer
  function startOTPTimer() {
    clearInterval(state.otpTimerInterval);
    state.otpSecondsRemaining = 300; // 5 minutes
    $('btn-resend-otp').disabled = true;
    updateTimerDisplay();

    state.otpTimerInterval = setInterval(() => {
      state.otpSecondsRemaining -= 1;
      updateTimerDisplay();

      if (state.otpSecondsRemaining <= 0) {
        clearInterval(state.otpTimerInterval);
        $('otp-timer').textContent = 'EXPIRED';
        $('btn-resend-otp').disabled = false;
        showToast('OTP has expired. Please request a new OTP.', true);
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(state.otpSecondsRemaining / 60).toString().padStart(2, '0');
    const secs = (state.otpSecondsRemaining % 60).toString().padStart(2, '0');
    $('otp-timer').textContent = `${mins}:${secs}`;
  }

  function resendOTP() {
    const mobile = $('reg-mobile').value.trim();
    const name = $('reg-name').value.trim();
    const response = HVMSBackendAPI.requestOTP(mobile, name);

    if (response.success) {
      $('demo-otp-code').textContent = response.demoOtp;
      $('otp-attempts').textContent = '3 / 3';
      startOTPTimer();
      showToast('New OTP sent successfully!');
    } else {
      showToast(response.message, true);
    }
  }

  // Step 2: Verify OTP
  function onVerifyOTPSubmit(e) {
    e.preventDefault();
    const mobile = $('reg-mobile').value.trim();
    const otpInput = $('otp-input').value.trim();
    $('err-otp').textContent = '';

    if (!otpInput || otpInput.length !== 6) {
      $('err-otp').textContent = 'Please enter the 6-digit OTP code.';
      return;
    }

    const response = HVMSBackendAPI.verifyOTP(mobile, otpInput);
    if (!response.success) {
      $('err-otp').textContent = response.message;
      showToast(response.message, true);
      return;
    }

    clearInterval(state.otpTimerInterval);
    state.visitorSession = response.visitor;

    showToast('OTP verified successfully!');
    goToVisitorStep(3);
  }

  // Step 3: Search & Select Patient
  function onPatientSearchInput(query) {
    const results = HVMSBackendAPI.searchPatients(query);
    const grid = $('patient-search-results');
    grid.innerHTML = '';

    if (results.length === 0) {
      grid.innerHTML = '<p class="empty-msg">No patients matching your search criteria.</p>';
      return;
    }

    results.forEach(p => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `patient-card ${state.selectedPatientId === p.id ? 'selected' : ''}`;
      card.addEventListener('click', () => selectPatient(p));

      card.innerHTML = `
        <strong>${escapeHTML(p.name)}</strong>
        <div class="patient-meta">
          <span>Ward: ${escapeHTML(p.ward)} | Room: ${escapeHTML(p.room)}</span>
        </div>
        <div class="capacity-badge ${p.hasAvailableSlot ? 'cap-available' : 'cap-full'}">
          ${p.currentActiveVisitors} / ${p.maxVisitors} Active Visitors
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function selectPatient(patient) {
    state.selectedPatientId = patient.id;
    $('sel-patient-name').textContent = `${patient.name} (${patient.id})`;
    $('sel-patient-room').textContent = `${patient.ward} - ${patient.room}`;
    $('sel-patient-capacity').textContent = patient.hasAvailableSlot ? 'Slot Available' : 'Full (Wait times may apply)';

    $('selected-patient-summary').hidden = false;
    $('btn-confirm-patient').disabled = false;

    // Refresh grid to reflect selection UI
    onPatientSearchInput($('patient-search-input').value);
  }

  function confirmPatientSelection() {
    if (!state.selectedPatientId) return;
    goToVisitorStep(4);
  }

  // Step 4: Select Visiting Slot & Submit Request
  function onVisitSlotSubmit(e) {
    e.preventDefault();
    $('err-visit-date').textContent = '';
    $('err-visit-slot').textContent = '';

    const visitDate = $('visit-date-input').value;
    const timeSlotSelect = $('visit-slot-select');
    $('visit-date-input').removeAttribute('aria-invalid');
    timeSlotSelect?.removeAttribute('aria-invalid');
    const visitingTimeSlot = timeSlotSelect ? timeSlotSelect.value : null;

    if (!visitDate) {
      $('err-visit-date').textContent = 'Please select a valid visiting date.';
      $('visit-date-input').setAttribute('aria-invalid', 'true');
      return;
    }

    if (!visitingTimeSlot) {
      $('err-visit-slot').textContent = 'Please select an available time slot.';
      timeSlotSelect?.setAttribute('aria-invalid', 'true');
      return;
    }

    const payload = {
      visitorId: state.visitorSession.id,
      patientId: state.selectedPatientId,
      visitDate: visitDate,
      visitingTimeSlot: visitingTimeSlot
    };

    const response = HVMSBackendAPI.submitVisitRequest(payload);
    if (!response.success) {
      showToast(response.message, true);
      return;
    }

    showToast(response.message);
    updateStaffBadges();
    goToVisitorStep(5);
  }

  // Step 5: Render Visitor Requests & Pass Cards
  function renderVisitorDashboard() {
    if (!state.visitorSession) return;

    $('visitor-session-name').textContent = state.visitorSession.name;
    $('visitor-session-mobile').textContent = `+91 ${state.visitorSession.mobileNumber}`;

    const visits = HVMSBackendAPI.getVisitorVisits(state.visitorSession.mobileNumber);
    const container = $('visitor-requests-list');
    container.innerHTML = '';

    if (visits.length === 0) {
      container.innerHTML = '<p class="empty-msg">No visit requests found for this mobile number.</p>';
      return;
    }

    visits.forEach(v => {
      const card = document.createElement('div');

      if (v.status === 'APPROVED' && v.passDetails) {
        // Render Approved Digital Visitor Pass Card with QR Code
        card.className = 'visitor-pass-card';
        const qrSvg = generateQRCodeSVG(v.passDetails.qrCode, 130);

        card.innerHTML = `
          <div class="pass-header">
            <div class="pass-title">Hospital Visitor Pass</div>
            <div class="pass-id-badge">${v.passId}</div>
          </div>
          <div class="pass-body">
            <dl class="pass-details-list">
              <dt>Visitor:</dt><dd>${escapeHTML(v.visitorName)}</dd>
              <dt>Patient:</dt><dd>${escapeHTML(v.patientName)}</dd>
              <dt>Location:</dt><dd>${escapeHTML(v.patientRoom)}</dd>
              <dt>Date:</dt><dd>${v.visitDate}</dd>
              <dt>Time Slot:</dt><dd>${v.visitingTimeSlot}</dd>
              <dt>Status:</dt><dd><span class="badge badge-approved">APPROVED</span></dd>
            </dl>
            <div class="pass-qr-box">
              ${qrSvg}
              <small style="font-size: 0.65rem; color: #64748b; margin-top: 4px;">SCAN FOR ENTRY</small>
            </div>
          </div>
          <div class="pass-footer-actions">
            <button type="button" class="btn btn-sm btn-outline" onclick="window.print()">🖨️ Print Pass</button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="HVMSApp.cancelRequest('${v.visitId}')">Cancel Request</button>
          </div>
        `;
      } else {
        // Render Standard Visit Request Card
        card.className = 'card';
        let statusBadgeClass = `badge-${v.status.toLowerCase()}`;

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h3>Visit Request for ${escapeHTML(v.patientName)} (${escapeHTML(v.patientRoom)})</h3>
              <p class="subtitle">Visit Date: <strong>${v.visitDate}</strong> | Slot: <strong>${v.visitingTimeSlot}</strong></p>
              ${v.rejectionReason ? `<p style="color: #b91c1c; font-size: 0.85rem; margin-top: 6px;"><strong>Rejection Reason:</strong> ${escapeHTML(v.rejectionReason)}</p>` : ''}
            </div>
            <span class="badge ${statusBadgeClass}">${v.status}</span>
          </div>
          ${['PENDING', 'APPROVED'].includes(v.status) ? `
            <div style="margin-top: 14px; text-align: right;">
              <button type="button" class="btn btn-sm btn-outline-danger" onclick="HVMSApp.cancelRequest('${v.visitId}')">Cancel Visit Request</button>
            </div>
          ` : ''}
        `;
      }

      container.appendChild(card);
    });
  }

  function cancelRequest(visitId) {
    if (!state.visitorSession) return;
    const response = HVMSBackendAPI.cancelVisitRequest(visitId, state.visitorSession.mobileNumber);
    if (response.success) {
      showToast(response.message);
      renderVisitorDashboard();
      updateStaffBadges();
    } else {
      showToast(response.message, true);
    }
  }

  function startNewRegistration() {
    state.selectedPatientId = null;
    state.visitorSession = null;
    state.visitorStep = 1;
    if ($('form-visitor-register')) $('form-visitor-register').reset();
    if ($('form-verify-otp')) $('form-verify-otp').reset();
    if ($('form-visit-slot')) $('form-visit-slot').reset();
    if ($('selected-patient-summary')) $('selected-patient-summary').hidden = true;
    if ($('btn-confirm-patient')) $('btn-confirm-patient').disabled = true;
    goToVisitorStep(1);
  }

  // ----------------------------------------------------
  // STAFF / ADMIN PORTAL WORKFLOW
  // ----------------------------------------------------
  function onStaffLoginSubmit(e) {
    e.preventDefault();
    const username = $('staff-username').value.trim();
    const password = $('staff-password').value.trim();

    quickStaffLogin(username, password);
  }

  function quickStaffLogin(username, password) {
    const response = HVMSBackendAPI.staffLogin(username, password);
    if (!response.success) {
      showToast(response.message, true);
      return;
    }

    state.activeStaff = response.staff;
    $('logged-staff-name').textContent = state.activeStaff.name;
    $('logged-staff-role').textContent = state.activeStaff.role;

    $('staff-login-card').hidden = true;
    $('staff-dashboard').hidden = false;

    showToast(`Welcome, ${state.activeStaff.name}!`);
    switchStaffTab('pending');
  }

  function staffLogout() {
    state.activeStaff = null;
    $('staff-dashboard').hidden = true;
    $('staff-login-card').hidden = false;
    $('form-staff-login').reset();
    showToast('Logged out of staff portal.');
  }

  function switchStaffTab(tabName) {
    state.activeStaffTab = tabName;

    const subtabs = ['pending', 'verify', 'active', 'records', 'audit'];
    subtabs.forEach(t => {
      const tab = $(`staff-tab-${t}`);
      const card = $(`staff-subtab-${t}`);
      const isActive = t === tabName;
      if (tab) {
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.tabIndex = isActive ? 0 : -1;
      }
      if (card) card.hidden = !isActive;
    });

    renderStaffSubtab(tabName);
  }

  function renderStaffSubtab(tabName) {
    updateStaffBadges();

    if (tabName === 'pending') {
      renderPendingRequests();
    } else if (tabName === 'active') {
      renderActiveVisitors();
    } else if (tabName === 'records') {
      renderSearchRecords();
    } else if (tabName === 'audit') {
      renderAuditLogs();
    }
  }

  function updateStaffBadges() {
    const pendingList = HVMSBackendAPI.getPendingVisits();
    const activeList = HVMSBackendAPI.getActiveVisitors();

    if ($('count-pending')) $('count-pending').textContent = pendingList.length;
    if ($('count-active')) $('count-active').textContent = activeList.length;

    const pendingBadge = $('pending-count-badge');
    if (pendingBadge) {
      $('pending-count-value').textContent = pendingList.length;
      pendingBadge.hidden = pendingList.length === 0;
    }
  }

  function updateHomeStats() {
    if (!global.HVMSBackendAPI) return;
    const activeList = HVMSBackendAPI.getActiveVisitors();
    const allRecords = HVMSBackendAPI.searchRecords('', 'ALL');

    if ($('stat-active-passes')) $('stat-active-passes').textContent = activeList.length;
    if ($('stat-visitors-today')) $('stat-visitors-today').textContent = allRecords.length || '12';
  }

  function renderPendingRequests() {
    const list = HVMSBackendAPI.getPendingVisits();
    const tbody = $('tbl-pending-requests');
    const emptyMsg = $('pending-empty-msg');

    tbody.innerHTML = '';
    if (list.length === 0) {
      emptyMsg.hidden = false;
      return;
    }
    emptyMsg.hidden = true;

    list.forEach(v => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${v.visitId}</strong></td>
        <td>${escapeHTML(v.visitorName)}</td>
        <td>+91 ${v.visitorMobile.slice(-4).padStart(10, '*')}</td>
        <td>${escapeHTML(v.patientName)} (${escapeHTML(v.patientRoom)})</td>
        <td>${v.visitingTimeSlot}</td>
        <td><span class="badge badge-pending">PENDING</span></td>
        <td>
          <button type="button" class="btn btn-xs btn-primary" onclick="HVMSApp.approveRequest('${v.visitId}')">Approve</button>
          <button type="button" class="btn btn-xs btn-outline-danger" onclick="HVMSApp.openRejectModal('${v.visitId}')">Reject</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function approveRequest(visitId) {
    if (!state.activeStaff) return;
    const response = HVMSBackendAPI.approveVisit(visitId, state.activeStaff.id);
    if (response.success) {
      showToast(response.message);
      renderPendingRequests();
      renderPatientPortalView();
    } else {
      showToast(response.message, true);
    }
  }

  function openRejectModal(visitId) {
    $('reject-visit-id').value = visitId;
    $('reject-reason-text').value = '';
    const modal = $('modal-reject-reason');
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', 'true');
    }
  }

  function closeRejectModal() {
    const modal = $('modal-reject-reason');
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
  }

  function confirmRejectRequest(e) {
    e.preventDefault();
    const visitId = $('reject-visit-id').value;
    const reason = $('reject-reason-text').value;

    if (!state.activeStaff) return;
    const response = HVMSBackendAPI.rejectVisit(visitId, state.activeStaff.id, reason);

    closeRejectModal();
    if (response.success) {
      showToast(response.message);
      renderPendingRequests();
      renderPatientPortalView();
    } else {
      showToast(response.message, true);
    }
  }

  function verifyAndGrantEntry() {
    const input = $('pass-scan-input').value.trim();
    const resultBox = $('verification-result-box');

    if (!input) {
      showToast('Please enter a Pass ID or scan QR code.', true);
      return;
    }

    if (!state.activeStaff) return;
    const response = HVMSBackendAPI.verifyPassForEntry(input, state.activeStaff.id);

    resultBox.hidden = false;
    if (response.success) {
      resultBox.className = 'result-box alert alert-success';
      resultBox.innerHTML = `
        <h4>✅ Entry Verification Successful</h4>
        <p>${response.message}</p>
        <small>Visitor: <strong>${escapeHTML(response.visit.visitorName)}</strong> | Patient: <strong>${escapeHTML(response.visit.patientName)} (${escapeHTML(response.visit.patientRoom)})</strong></small>
      `;
      showToast('Entry recorded successfully!');
    } else {
      resultBox.className = 'result-box alert alert-error';
      resultBox.innerHTML = `
        <h4>❌ Verification Failed</h4>
        <p>${response.message}</p>
      `;
      showToast('Verification failed', true);
    }

    updateStaffBadges();
    renderPatientPortalView();
  }

  function renderActiveVisitors() {
    const list = HVMSBackendAPI.getActiveVisitors();
    const tbody = $('tbl-active-visitors');
    const emptyMsg = $('active-empty-msg');

    tbody.innerHTML = '';
    if (list.length === 0) {
      emptyMsg.hidden = false;
      return;
    }
    emptyMsg.hidden = true;

    list.forEach(v => {
      const entryTimeStr = new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td><strong>${v.passId || 'VP-1001'}</strong></td>
        <td>${escapeHTML(v.visitorName)}</td>
        <td>+91 ${v.maskedMobile}</td>
        <td>${escapeHTML(v.patientName)} (${escapeHTML(v.patientRoom)})</td>
        <td>${entryTimeStr}</td>
        <td>${v.durationMinutes} mins inside</td>
        <td>
          ${v.isOverdue ? '<span class="badge badge-overdue">OVERDUE (>60m)</span>' : '<span class="badge badge-active">ON TIME</span>'}
        </td>
        <td>
          <button type="button" class="btn btn-xs btn-outline-danger" onclick="HVMSApp.recordExit('${v.visitId}')">Record Exit</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function recordExit(visitId) {
    if (!state.activeStaff) return;
    const response = HVMSBackendAPI.recordExit(visitId, state.activeStaff.id);
    if (response.success) {
      showToast(response.message);
      renderActiveVisitors();
      renderPatientPortalView();
    } else {
      showToast(response.message, true);
    }
  }

  function renderSearchRecords() {
    const query = $('search-records-query').value;
    const statusFilter = $('search-records-status').value;

    const list = HVMSBackendAPI.searchRecords(query, statusFilter);
    const tbody = $('tbl-search-records');
    tbody.innerHTML = '';

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-msg">No matching visitor records found.</td></tr>';
      return;
    }

    list.forEach(v => {
      const entryStr = v.entryTime ? new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---';
      const exitStr = v.exitTime ? new Date(v.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${v.visitId}</td>
        <td>${v.passId || 'N/A'}</td>
        <td>${escapeHTML(v.visitorName)}</td>
        <td>+91 ${v.maskedMobile}</td>
        <td>${escapeHTML(v.patientName)}</td>
        <td>${v.visitDate}</td>
        <td>${entryStr}</td>
        <td>${exitStr}</td>
        <td><span class="badge badge-${v.status.toLowerCase()}">${v.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderAuditLogs() {
    const logs = HVMSBackendAPI.getAuditLogs();
    const tbody = $('tbl-audit-logs');
    tbody.innerHTML = '';

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">No audit log entries recorded.</td></tr>';
      return;
    }

    logs.forEach(l => {
      const timeStr = new Date(l.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${l.logId}</strong></td>
        <td>${timeStr}</td>
        <td>${escapeHTML(l.staffName)}</td>
        <td><span class="badge badge-approved">${l.action}</span></td>
        <td>${l.visitId || '---'}</td>
        <td>${l.details}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ----------------------------------------------------
  // PATIENT PORTAL WORKFLOW
  // ----------------------------------------------------
  function renderPatientPortalDropdown() {
    const patients = HVMSBackendAPI.getPatientsList();
    const select = $('patient-account-select');
    select.innerHTML = '';

    patients.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (Ward: ${p.ward}, Room: ${p.room})`;
      select.appendChild(opt);
    });

    state.selectedPatientPortalId = patients[0] ? patients[0].id : 'P101';
  }

  function onPatientPortalChange(patientId) {
    state.selectedPatientPortalId = patientId;
    renderPatientPortalView();
  }

  function renderPatientPortalView() {
    const data = HVMSBackendAPI.getPatientPortalData(state.selectedPatientPortalId);
    if (!data) return;

    $('patient-view-name').textContent = data.patient.name;
    $('patient-view-id').textContent = data.patient.id;
    if ($('patient-view-ward')) $('patient-view-ward').textContent = data.patient.ward;
    $('patient-view-room').textContent = data.patient.room;

    if ($('patient-stat-active')) $('patient-stat-active').textContent = data.activeVisitors.length;
    if ($('patient-stat-upcoming')) $('patient-stat-upcoming').textContent = data.upcomingVisitors.length;
    if ($('patient-stat-past')) $('patient-stat-past').textContent = data.pastVisitors.length;

    // Block 2: Active & Scheduled Visitors
    const activeScheduledList = [...data.activeVisitors, ...data.upcomingVisitors];
    const tbodyActive = $('tbl-active-scheduled-visitors');
    const emptyActive = $('patient-active-scheduled-empty');
    if (tbodyActive) {
      tbodyActive.innerHTML = '';
      if (activeScheduledList.length === 0) {
        if (emptyActive) emptyActive.hidden = false;
      } else {
        if (emptyActive) emptyActive.hidden = true;
        activeScheduledList.forEach(v => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${escapeHTML(v.visitorName)}</strong></td>
            <td>${v.visitDate}</td>
            <td>${v.visitingTimeSlot}</td>
            <td><span class="badge badge-${v.status.toLowerCase()}">${v.status}</span></td>
            <td>${v.entryTime || '---'}</td>
            <td>${v.exitTime || '---'}</td>
          `;
          tbodyActive.appendChild(tr);
        });
      }
    }

    // Block 3: Past Visitor History
    const tbodyPast = $('tbl-past-visitors');
    const emptyPast = $('patient-past-empty');
    if (tbodyPast) {
      tbodyPast.innerHTML = '';
      if (data.pastVisitors.length === 0) {
        if (emptyPast) emptyPast.hidden = false;
      } else {
        if (emptyPast) emptyPast.hidden = true;
        data.pastVisitors.forEach(v => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${escapeHTML(v.visitorName)}</strong></td>
            <td>${v.visitDate}</td>
            <td>${v.visitingTimeSlot}</td>
            <td><span class="badge badge-${v.status.toLowerCase()}">${v.status}</span></td>
            <td>${v.entryTime || '---'}</td>
            <td>${v.exitTime || '---'}</td>
          `;
          tbodyPast.appendChild(tr);
        });
      }
    }
  }

  // Reset System Data
  function resetAllData() {
    if (confirm('Are you sure you want to reset all system data to initial seed state?')) {
      HVMSBackendAPI.resetDatabase();
      showToast('System data reset successfully.');
      location.reload();
    }
  }

  // Initialize application on DOM load
  document.addEventListener('DOMContentLoaded', init);

  // Export to global scope
  global.HVMSApp = {
    switchPortal,
    goToVisitorStep,
    resendOTP,
    onPatientSearchInput,
    confirmPatientSelection,
    cancelRequest,
    startNewRegistration,
    quickStaffLogin,
    staffLogout,
    switchStaffTab,
    approveRequest,
    openRejectModal,
    closeRejectModal,
    confirmRejectRequest,
    verifyAndGrantEntry,
    recordExit,
    renderSearchRecords,
    onPatientPortalChange,
    resetAllData,
    hideToast
  };

})(typeof window !== 'undefined' ? window : global);

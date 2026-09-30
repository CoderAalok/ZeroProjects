/**
 * Central Backend & Database Engine for Hospital Visitor Management System
 * Handles data storage, business logic rules, role-based access, OTP processing,
 * visit status transitions, pass generation, data masking, and audit logging.
 */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'hvms_central_db_v2';

  // Core Visit Status Enum
  const VISIT_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    ACTIVE: 'ACTIVE',
    EXITED: 'EXITED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED'
  };

  // Visiting Hours configuration (24h clock)
  const VISITING_HOURS = {
    START_HOUR: 9, // 9:00 AM
    END_HOUR: 21   // 9:00 PM
  };

  // Initial Seed Data
  const SEED_DATA = {
    patients: [
      { id: 'P101', name: 'Raj Kumar', ward: 'General Ward', room: '204-A', maxSimultaneousVisitors: 3 },
      { id: 'P102', name: 'Neha Singh', ward: 'ICU', room: 'ICU-03', maxSimultaneousVisitors: 1 },
      { id: 'P103', name: 'Amit Patel', ward: 'Cardiology', room: '105-B', maxSimultaneousVisitors: 2 },
      { id: 'P104', name: 'Priya Verma', ward: 'Maternity', room: '302-C', maxSimultaneousVisitors: 2 },
      { id: 'P105', name: 'Suresh Sharma', ward: 'Orthopedics', room: '410-A', maxSimultaneousVisitors: 3 }
    ],
    staff: [
      { id: 'S101', username: 'admin', name: 'Dr. Ananya Roy', role: 'ADMIN', passwordHash: 'admin123' },
      { id: 'S102', username: 'staff', name: 'Rajesh Kumar (Security Desk)', role: 'STAFF', passwordHash: 'staff123' }
    ],
    visitors: [
      { id: 'V101', name: 'Rahul Kumar', mobileNumber: '9876543210', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'V102', name: 'Amit Sharma', mobileNumber: '9123456789', createdAt: new Date(Date.now() - 86400000).toISOString() }
    ],
    visits: [
      {
        visitId: 'VST-1001',
        visitorId: 'V101',
        visitorName: 'Rahul Kumar',
        visitorMobile: '9876543210',
        patientId: 'P101',
        patientName: 'Raj Kumar',
        patientRoom: '204-A',
        visitDate: new Date().toISOString().split('T')[0],
        visitingTimeSlot: '17:00 - 18:00',
        status: VISIT_STATUS.ACTIVE,
        reviewedBy: 'S102',
        rejectionReason: null,
        entryTime: new Date(Date.now() - 40 * 60000).toISOString(),
        exitTime: null,
        passId: 'VP-1001',
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
      },
      {
        visitId: 'VST-1002',
        visitorId: 'V102',
        visitorName: 'Amit Sharma',
        visitorMobile: '9123456789',
        patientId: 'P102',
        patientName: 'Neha Singh',
        patientRoom: 'ICU-03',
        visitDate: new Date().toISOString().split('T')[0],
        visitingTimeSlot: '18:00 - 19:00',
        status: VISIT_STATUS.PENDING,
        reviewedBy: null,
        rejectionReason: null,
        entryTime: null,
        exitTime: null,
        passId: null,
        createdAt: new Date(Date.now() - 30 * 60000).toISOString()
      }
    ],
    visitorPasses: [
      {
        passId: 'VP-1001',
        visitId: 'VST-1001',
        qrCode: 'VP-1001|V101|P101|APPROVED',
        validFrom: new Date(Date.now() - 3600000).toISOString(),
        validUntil: new Date(Date.now() + 3600000 * 2).toISOString(),
        generatedAt: new Date(Date.now() - 3600000).toISOString()
      }
    ],
    otps: {},
    auditLogs: [
      {
        logId: 'LOG-1',
        staffId: 'S102',
        staffName: 'Rajesh Kumar (Security Desk)',
        action: 'APPROVE',
        visitId: 'VST-1001',
        details: 'Approved visit request for Rahul Kumar to visit Raj Kumar',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        logId: 'LOG-2',
        staffId: 'S102',
        staffName: 'Rajesh Kumar (Security Desk)',
        action: 'ENTRY',
        visitId: 'VST-1001',
        details: 'Verified pass VP-1001 and recorded entry',
        timestamp: new Date(Date.now() - 40 * 60000).toISOString()
      }
    ]
  };

  // Database Access Layer
  class CentralDatabase {
    constructor() {
      this.data = this.loadDB();
    }

    loadDB() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...SEED_DATA, ...parsed };
        }
      } catch (e) {
        console.warn('LocalStorage access issue, using initial seed data.', e);
      }
      return JSON.parse(JSON.stringify(SEED_DATA));
    }

    saveDB() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.error('Failed to save to localStorage', e);
      }
    }

    resetDB() {
      this.data = JSON.parse(JSON.stringify(SEED_DATA));
      this.saveDB();
    }
  }

  const db = new CentralDatabase();

  // Utility Functions
  function maskMobileNumber(mobile) {
    if (!mobile || mobile.length < 10) return '**********';
    const last4 = mobile.slice(-4);
    return '******' + last4;
  }

  function hashOTP(otp) {
    // Simple hash simulation for demo security compliance
    let hash = 0;
    for (let i = 0; i < otp.length; i++) {
      hash = (hash << 5) - hash + otp.charCodeAt(i);
      hash |= 0;
    }
    return 'hash_' + Math.abs(hash);
  }

  function generateID(prefix) {
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  function logAuditAction(staffId, action, visitId, details) {
    const staff = db.data.staff.find(s => s.id === staffId);
    const logEntry = {
      logId: generateID('LOG'),
      staffId: staffId || 'SYSTEM',
      staffName: staff ? staff.name : 'System Action',
      action: action,
      visitId: visitId || null,
      details: details || '',
      timestamp: new Date().toISOString()
    };
    db.data.auditLogs.unshift(logEntry);
    db.saveDB();
  }

  // Central Backend API implementation
  const HVMSBackendAPI = {
    // Check system status & visiting hours
    getVisitingHoursInfo() {
      const now = new Date();
      const currentHour = now.getHours();
      const isOpen = currentHour >= VISITING_HOURS.START_HOUR && currentHour < VISITING_HOURS.END_HOUR;
      return {
        start: '09:00 AM',
        end: '09:00 PM',
        isOpen: isOpen,
        currentTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    },

    // ----------------------------------------------------
    // VISITOR PORTAL APIs
    // ----------------------------------------------------

    // Step 1: Request OTP
    requestOTP(mobileNumber, visitorName) {
      if (!mobileNumber || !/^\d{10}$/.test(mobileNumber.trim())) {
        return { success: false, message: 'Please enter a valid 10-digit mobile number.' };
      }

      if (!visitorName || visitorName.trim().length < 2) {
        return { success: false, message: 'Please enter a valid full name.' };
      }

      const cleanMobile = mobileNumber.trim();
      const plainOTP = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

      db.data.otps[cleanMobile] = {
        otpHash: hashOTP(plainOTP),
        expiresAt: expiresAt,
        attempts: 0,
        maxAttempts: 3,
        verified: false,
        name: visitorName.trim()
      };
      db.saveDB();

      return {
        success: true,
        message: `OTP sent successfully to +91 ${maskMobileNumber(cleanMobile)}`,
        demoOtp: plainOTP, // Exposed for easy testing in demo mode
        expiresInSeconds: 300
      };
    },

    // Step 2: Verify OTP
    verifyOTP(mobileNumber, inputOTP) {
      const cleanMobile = (mobileNumber || '').trim();
      const otpRecord = db.data.otps[cleanMobile];

      if (!otpRecord) {
        return { success: false, message: 'No OTP request found for this mobile number. Please request a new OTP.' };
      }

      if (Date.now() > otpRecord.expiresAt) {
        delete db.data.otps[cleanMobile];
        db.saveDB();
        return { success: false, message: 'OTP has expired. Please request a new OTP.' };
      }

      if (otpRecord.attempts >= otpRecord.maxAttempts) {
        return { success: false, message: 'Maximum verification attempts exceeded. Please request a new OTP.' };
      }

      if (hashOTP(inputOTP.trim()) !== otpRecord.otpHash) {
        otpRecord.attempts += 1;
        const remaining = otpRecord.maxAttempts - otpRecord.attempts;
        db.saveDB();
        return {
          success: false,
          message: `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        };
      }

      // Mark verified & register visitor profile
      otpRecord.verified = true;

      let visitor = db.data.visitors.find(v => v.mobileNumber === cleanMobile);
      if (!visitor) {
        visitor = {
          id: generateID('V'),
          name: otpRecord.name,
          mobileNumber: cleanMobile,
          createdAt: new Date().toISOString()
        };
        db.data.visitors.push(visitor);
      } else {
        visitor.name = otpRecord.name; // update name if changed
      }

      db.saveDB();

      return {
        success: true,
        message: 'OTP verified successfully!',
        visitor: {
          id: visitor.id,
          name: visitor.name,
          mobileNumber: visitor.mobileNumber
        },
        sessionToken: `SESSION_${visitor.id}_${Date.now()}`
      };
    },

    // Step 3: Search Patients
    searchPatients(query) {
      const q = (query || '').toLowerCase().trim();
      const patients = db.data.patients.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.ward.toLowerCase().includes(q)
      );

      // Return only minimum non-medical identification fields
      return patients.map(p => {
        // count active visitors for slot capacity calculation
        const activeCount = db.data.visits.filter(
          v => v.patientId === p.id && v.status === VISIT_STATUS.ACTIVE
        ).length;

        return {
          id: p.id,
          name: p.name,
          ward: p.ward,
          room: p.room,
          maxVisitors: p.maxSimultaneousVisitors,
          currentActiveVisitors: activeCount,
          hasAvailableSlot: activeCount < p.maxSimultaneousVisitors
        };
      });
    },

    // Step 4 & 5: Submit Visit Request
    submitVisitRequest(data) {
      const { visitorId, patientId, visitDate, visitingTimeSlot } = data;

      const visitor = db.data.visitors.find(v => v.id === visitorId);
      const patient = db.data.patients.find(p => p.id === patientId);

      if (!visitor) return { success: false, message: 'Invalid visitor session. Please re-verify mobile OTP.' };
      if (!patient) return { success: false, message: 'Selected patient not found.' };

      if (!visitDate || !visitingTimeSlot) {
        return { success: false, message: 'Please select a valid visiting date and time slot.' };
      }

      // Check if visitor already has an active or pending request for this patient today
      const existing = db.data.visits.find(v =>
        v.visitorId === visitorId &&
        v.patientId === patientId &&
        v.visitDate === visitDate &&
        [VISIT_STATUS.PENDING, VISIT_STATUS.APPROVED, VISIT_STATUS.ACTIVE].includes(v.status)
      );

      if (existing) {
        return {
          success: false,
          message: `You already have a ${existing.status} visit request for this patient today.`
        };
      }

      const newVisit = {
        visitId: generateID('VST'),
        visitorId: visitor.id,
        visitorName: visitor.name,
        visitorMobile: visitor.mobileNumber,
        patientId: patient.id,
        patientName: patient.name,
        patientRoom: patient.room,
        visitDate: visitDate,
        visitingTimeSlot: visitingTimeSlot,
        status: VISIT_STATUS.PENDING,
        reviewedBy: null,
        rejectionReason: null,
        entryTime: null,
        exitTime: null,
        passId: null,
        createdAt: new Date().toISOString()
      };

      db.data.visits.push(newVisit);
      db.saveDB();

      return {
        success: true,
        message: 'Visit request submitted successfully! Pending staff approval.',
        visit: newVisit
      };
    },

    // Visitor status tracking & cancel request
    getVisitorVisits(mobileNumber) {
      const visits = db.data.visits.filter(v => v.visitorMobile === mobileNumber);
      return visits.map(v => {
        const pass = v.passId ? db.data.visitorPasses.find(p => p.passId === v.passId) : null;
        return { ...v, passDetails: pass };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    cancelVisitRequest(visitId, mobileNumber) {
      const visit = db.data.visits.find(v => v.visitId === visitId && v.visitorMobile === mobileNumber);
      if (!visit) return { success: false, message: 'Visit request not found.' };

      if (![VISIT_STATUS.PENDING, VISIT_STATUS.APPROVED].includes(visit.status)) {
        return { success: false, message: `Cannot cancel visit in ${visit.status} status.` };
      }

      visit.status = VISIT_STATUS.CANCELLED;
      db.saveDB();

      return { success: true, message: 'Visit request has been cancelled.' };
    },

    // ----------------------------------------------------
    // STAFF / ADMIN PORTAL APIs
    // ----------------------------------------------------

    staffLogin(username, password) {
      const staff = db.data.staff.find(s => s.username === username.trim().toLowerCase());
      if (!staff || staff.passwordHash !== password) {
        return { success: false, message: 'Invalid staff username or password.' };
      }

      logAuditAction(staff.id, 'LOGIN', null, `Staff ${staff.name} logged into portal.`);

      return {
        success: true,
        staff: {
          id: staff.id,
          name: staff.name,
          username: staff.username,
          role: staff.role
        }
      };
    },

    getPendingVisits() {
      return db.data.visits
        .filter(v => v.status === VISIT_STATUS.PENDING)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    },

    approveVisit(visitId, staffId) {
      const visit = db.data.visits.find(v => v.visitId === visitId);
      if (!visit) return { success: false, message: 'Visit request not found.' };

      if (visit.status !== VISIT_STATUS.PENDING) {
        return { success: false, message: `Request is no longer pending (current: ${visit.status}).` };
      }

      const passId = generateID('VP');
      visit.status = VISIT_STATUS.APPROVED;
      visit.reviewedBy = staffId;
      visit.passId = passId;

      // Create Visitor Pass Entity
      const now = new Date();
      const validUntil = new Date(now.getTime() + 4 * 3600000); // Valid for 4 hours
      const pass = {
        passId: passId,
        visitId: visit.visitId,
        qrCode: `${passId}|${visit.visitorId}|${visit.patientId}|APPROVED`,
        generatedAt: now.toISOString(),
        validFrom: now.toISOString(),
        validUntil: validUntil.toISOString()
      };

      db.data.visitorPasses.push(pass);
      logAuditAction(staffId, 'APPROVE', visitId, `Approved visit request for ${visit.visitorName}`);
      db.saveDB();

      return {
        success: true,
        message: `Visit approved! Visitor Pass ${passId} generated.`,
        pass: pass
      };
    },

    rejectVisit(visitId, staffId, reason) {
      const visit = db.data.visits.find(v => v.visitId === visitId);
      if (!visit) return { success: false, message: 'Visit request not found.' };

      if (visit.status !== VISIT_STATUS.PENDING) {
        return { success: false, message: `Request is no longer pending (current: ${visit.status}).` };
      }

      const rejectionReason = (reason || 'Hospital capacity limit reached or restricted visiting hours.').trim();

      visit.status = VISIT_STATUS.REJECTED;
      visit.reviewedBy = staffId;
      visit.rejectionReason = rejectionReason;

      logAuditAction(staffId, 'REJECT', visitId, `Rejected visit request: ${rejectionReason}`);
      db.saveDB();

      return {
        success: true,
        message: 'Visit request rejected.'
      };
    },

    // Entry Verification
    verifyPassForEntry(query, staffId) {
      const searchStr = (query || '').trim();
      const pass = db.data.visitorPasses.find(p => p.passId === searchStr || p.qrCode.includes(searchStr));

      if (!pass) {
        // Fallback: search by visit ID
        const visitByPass = db.data.visits.find(v => v.passId === searchStr || v.visitId === searchStr);
        if (!visitByPass) {
          return { success: false, message: 'Invalid or unrecognized visitor pass ID/QR code.' };
        }
        return this.processEntry(visitByPass.visitId, staffId);
      }

      return this.processEntry(pass.visitId, staffId);
    },

    processEntry(visitId, staffId) {
      const visit = db.data.visits.find(v => v.visitId === visitId);
      if (!visit) return { success: false, message: 'Visit record not found.' };

      if (visit.status !== VISIT_STATUS.APPROVED) {
        if (visit.status === VISIT_STATUS.ACTIVE) {
          return { success: false, message: 'Entry denied: Visitor pass has already been used and visitor is currently ACTIVE.' };
        }
        if (visit.status === VISIT_STATUS.EXITED) {
          return { success: false, message: 'Entry denied: Pass has already completed exit.' };
        }
        return { success: false, message: `Entry denied: Visit status is ${visit.status}. Only APPROVED passes can enter.` };
      }

      // Check slot time validity (simplified rule: valid on visit date)
      const now = new Date();
      visit.status = VISIT_STATUS.ACTIVE;
      visit.entryTime = now.toISOString();

      logAuditAction(staffId, 'ENTRY', visit.visitId, `Recorded entry for visitor ${visit.visitorName} (Pass: ${visit.passId})`);
      db.saveDB();

      return {
        success: true,
        message: `Entry granted for ${visit.visitorName}! Visitor status set to ACTIVE.`,
        visit: visit
      };
    },

    // Active Visitors Management
    getActiveVisitors() {
      const activeVisits = db.data.visits.filter(v => v.status === VISIT_STATUS.ACTIVE);
      const now = new Date();

      return activeVisits.map(v => {
        const entryDate = new Date(v.entryTime);
        const durationMinutes = Math.floor((now - entryDate) / 60000);
        const isOverdue = durationMinutes > 60; // Max recommended visit duration 60 mins

        return {
          ...v,
          maskedMobile: maskMobileNumber(v.visitorMobile),
          durationMinutes: durationMinutes,
          isOverdue: isOverdue
        };
      });
    },

    recordExit(visitId, staffId) {
      const visit = db.data.visits.find(v => v.visitId === visitId);
      if (!visit) return { success: false, message: 'Visit record not found.' };

      if (visit.status !== VISIT_STATUS.ACTIVE) {
        return { success: false, message: `Cannot record exit for visitor in status ${visit.status}.` };
      }

      const now = new Date();
      visit.status = VISIT_STATUS.EXITED;
      visit.exitTime = now.toISOString();

      logAuditAction(staffId, 'EXIT', visitId, `Recorded exit for visitor ${visit.visitorName} (Pass: ${visit.passId})`);
      db.saveDB();

      return {
        success: true,
        message: `Exit recorded for ${visit.visitorName}. Visitor status set to EXITED.`,
        visit: visit
      };
    },

    // Search and Records for Staff/Admin
    searchRecords(query, statusFilter) {
      const q = (query || '').toLowerCase().trim();
      const status = (statusFilter || 'ALL').toUpperCase();

      return db.data.visits.filter(v => {
        const matchesQuery = !q ||
          v.visitorName.toLowerCase().includes(q) ||
          v.visitorMobile.includes(q) ||
          v.patientName.toLowerCase().includes(q) ||
          v.patientId.toLowerCase().includes(q) ||
          (v.passId && v.passId.toLowerCase().includes(q)) ||
          v.visitId.toLowerCase().includes(q);

        const matchesStatus = status === 'ALL' || v.status === status;

        return matchesQuery && matchesStatus;
      }).map(v => ({
        ...v,
        maskedMobile: maskMobileNumber(v.visitorMobile) // Privacy data masking
      })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    getAuditLogs() {
      return db.data.auditLogs;
    },

    // ----------------------------------------------------
    // PATIENT PORTAL APIs
    // ----------------------------------------------------

    getPatientPortalData(patientId) {
      const patient = db.data.patients.find(p => p.id === patientId || p.name.toLowerCase() === patientId.toLowerCase());
      if (!patient) return null;

      const visits = db.data.visits.filter(v => v.patientId === patient.id);

      // STRICT PRIVACY RULE: Mobile numbers are NOT returned to the patient portal!
      const sanitizedVisits = visits.map(v => ({
        visitId: v.visitId,
        visitorName: v.visitorName,
        visitDate: v.visitDate,
        visitingTimeSlot: v.visitingTimeSlot,
        status: v.status,
        entryTime: v.entryTime ? new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        exitTime: v.exitTime ? new Date(v.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        rejectionReason: v.rejectionReason
      })).sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

      const activeVisitors = sanitizedVisits.filter(v => v.status === VISIT_STATUS.ACTIVE);
      const upcomingVisitors = sanitizedVisits.filter(v => v.status === VISIT_STATUS.APPROVED || v.status === VISIT_STATUS.PENDING);
      const pastVisitors = sanitizedVisits.filter(v => v.status === VISIT_STATUS.EXITED || v.status === VISIT_STATUS.REJECTED || v.status === VISIT_STATUS.CANCELLED);

      return {
        patient: {
          id: patient.id,
          name: patient.name,
          ward: patient.ward,
          room: patient.room
        },
        activeVisitors: activeVisitors,
        upcomingVisitors: upcomingVisitors,
        pastVisitors: pastVisitors,
        allVisits: sanitizedVisits
      };
    },

    getPatientsList() {
      return db.data.patients.map(p => ({ id: p.id, name: p.name, ward: p.ward, room: p.room }));
    },

    resetDatabase() {
      db.resetDB();
      return { success: true, message: 'Database reset to default seed data.' };
    }
  };

  // Export to global context
  global.HVMSBackendAPI = HVMSBackendAPI;
  global.VISIT_STATUS = VISIT_STATUS;

})(typeof window !== 'undefined' ? window : global);

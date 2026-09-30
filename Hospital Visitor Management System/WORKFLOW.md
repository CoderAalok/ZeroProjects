# Hospital Visitor Management System: Complete Workflow & Specifications

## 1. Overview
The Hospital Visitor Management System is a role-based, multi-portal web system for registering, verifying, monitoring, and recording hospital visitors.

Visitors are verified with **Mobile Number + OTP** (no Aadhaar or Government ID is collected or stored).

### Main Portals
1. **Visitor Portal**: Register Name + Mobile Number, OTP Verification, Patient Search & Selection, Visiting Time Selection, Request Submission, Status Tracking, Digital Visitor Pass with QR Code.
2. **Staff/Admin Portal**: Staff Login, Dashboard, Approve/Reject Requests (with reason), Verify Visitor Passes & QR Scanner, Record Entry (`ACTIVE`), Active Visitors Monitoring (with Overdue Flag), Record Exit (`EXITED`), Search Records (with masked mobile numbers `********21`), and Audit Logs.
3. **Patient Portal**: Patient Login/Selector, View designated visitors across states (`PENDING`, `APPROVED`, `ACTIVE`, `EXITED`, `REJECTED`, `CANCELLED`). Visitor mobile numbers are strictly hidden for privacy.

---

## 2. System Architecture

```
        Hospital Visitor Management System
                       |
      +----------------+----------------+
      |                |                |
      v                v                v
Visitor Portal  Staff/Admin Portal  Patient Portal
      |                |                |
      +----------------+----------------+
                       |
                       v
             Central Backend / API (backend.js)
              (authentication, role-based access,
               business rules, status state machine)
                       |
            +----------+----------+
            |                     |
            v                     v
     Central Database      SMS / OTP Service
     (Local Storage DB)   (6-Digit Hashed OTPs)
```

---

## 3. End-to-End Workflow

```
Visitor opens Visitor Portal
            |
            v
Enter Name + Mobile Number
            |
            v
Request OTP (Hashed 6-digit OTP generated, 5-min expiry)
            |
            v
OTP Verification <--------------+
            |                   |
        +---+---+               |
        |       |               |
      Fail    Success           |
        |       |               |
        v       |               |
 Attempts left? |               |
   Yes -> ------|---------------+
   No -> Locked / Request new OTP
                |
                v
        Search / Select Patient
                |
                v
        Select Visiting Time Slot
                |
                v
        Submit Visit Request (Status = PENDING)
                |
                v
     Staff/Admin Verification
                |
          +-----+-----+
          |           |
        Reject      Approve
          |           |
          v           v
   Status = REJECTED  Generate Visitor Pass (VP-XXXX + QR SVG)
                          |
                          v
                    Visitor Arrives
                          |
                          v
                   Pass Entry Verification
                          |
                          v
                    Status = ACTIVE (Recorded Entry Time)
                          |
                          v
                    Visitor Leaves
                          |
                          v
                    Record Exit Time
                          |
                          v
                    Status = EXITED
```

---

## 4. Key Entities & Database Schemas

- **Visitor**: `id`, `name`, `mobileNumber`, `createdAt`
- **Patient**: `id`, `name`, `ward`, `room`, `maxSimultaneousVisitors`
- **Visit**: `visitId`, `visitorId`, `patientId`, `visitDate`, `visitingTimeSlot`, `status`, `reviewedBy`, `rejectionReason`, `entryTime`, `exitTime`, `passId`, `createdAt`
- **VisitorPass**: `passId`, `visitId`, `qrCode`, `generatedAt`, `validFrom`, `validUntil`
- **OTP**: `otpHash`, `expiresAt`, `attempts`, `maxAttempts`, `verified`
- **Staff**: `id`, `username`, `name`, `role`, `passwordHash`
- **AuditLog**: `logId`, `staffId`, `staffName`, `action`, `visitId`, `details`, `timestamp`

---

## 5. Security & Privacy Rules

1. **Mobile number + OTP**: Visitors verify strictly via 10-digit mobile number + 6-digit OTP.
2. **OTP Hashing**: Plaintext OTP is hashed before storing; max 3 verification attempts allowed within 5 minutes.
3. **Data Masking**: Staff search logs mask visitor mobile numbers by default (`********21`).
4. **Patient Privacy**: Patient Portal never discloses visitor mobile numbers.
5. **Audit Logging**: Every staff action (`APPROVE`, `REJECT`, `ENTRY`, `EXIT`, `LOGIN`) is logged with staff ID and timestamp.

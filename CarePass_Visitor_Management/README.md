# CarePass – Hospital Visitor Management System

CarePass is a front-end hospital visitor management system built using **semantic HTML, CSS, and vanilla JavaScript**. It provides a digital process for managing hospital visits without requiring manual registration.

Visitors can request passes, staff can approve requests and manage visitor entry and exit, and patients can view their visitor information.

> **Project Type:** Front-end college project  
> **Technology:** HTML5, CSS3, Vanilla JavaScript  
> **Backend:** None  
> **Database:** Browser Local Storage

---

## 1. Features

### Visitor Portal
- Enter visitor details and verify using a demo OTP.
- Select a patient, visit date, and available time slot.
- Submit a visit request.
- Track request status.
- View the digital visitor pass after approval.

### Staff Portal
- Sign in using demo credentials.
- Approve or reject visitor requests.
- Verify visitors using their pass ID.
- Record visitor entry and exit.
- Monitor currently active visits.
- Search visitor records and view audit logs.
- Receive notifications for new pending requests.

### Patient Portal
- View visitors associated with the patient.
- Check visitor information and visit history.
- View visitor details without exposing their phone numbers.

---

## 2. Visit Lifecycle

CarePass manages each visit through a controlled status lifecycle.

**Main workflow:**

[VISITOR] --request--> PENDING --[STAFF]--> APPROVED --pass check--> ACTIVE --> EXITED
                          |                    |
                          |--> REJECTED        |--> CANCELLED   (visitor can also cancel from PENDING)
                                   
**Other possible statuses:**
- `REJECTED`
- `CANCELLED`
- `EXPIRED`

All status changes are handled through a centralized `setStatus()` function. It validates status transitions and records the corresponding activity in the audit log.

---

## 3. Booking Rules and Validation

The system implements the following rules:

- Visitors cannot book past dates or unavailable time slots.
- Duplicate bookings for the same slot are not allowed.
- Only one open request per patient per visitor per day is allowed.
- Visitors already inside the hospital cannot create another booking.
- Entry is permitted only within the booked time slot, starting 15 minutes before the scheduled time and ending when the slot expires.
- Pending and approved requests automatically become `EXPIRED` after their scheduled slot has passed.
- ICU patients can have a maximum of **1 visitor at a time**.
- Other wards can have a maximum of **2 visitors at a time**.
- Visitors staying inside for more than 60 minutes trigger an overstay alert.

---

## 4. Additional Features

- Staff dashboard refreshes automatically every 30 seconds.
- Notification badge and browser tab-title counter for pending requests.
- Responsive interface with breakpoints at 980px and 600px.
- Accessibility support, including:
  - Skip navigation link.
  - Semantic HTML landmarks.
  - Table captions and header scopes.
  - Native HTML `<dialog>` element.
  - Keyboard focus handling.
  - Reduced-motion support.

---

## 5. Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure and semantic elements |
| CSS3 | Styling and responsive layouts |
| Vanilla JavaScript | Application logic and interactions |
| Local Storage | Persistent browser-side data storage |
| Session Storage | Temporary browser session data |
| DOM API | Dynamic page updates and interactions |

No frontend framework, backend server, or external database is required.

---

## 6. Project Structure

```text
CarePass/
│
├── index.html
├── visitor.html
├── staff.html
├── patient.html
│
├── css/
│   ├── common.css
│   ├── visitor.css
│   ├── staff.css
│   └── patient.css
│
├── js/
│   ├── common.js
│   ├── visitor.js
│   ├── staff.js
│   └── patient.js
│
└── images/
    ├── icons
    ├── logo
    └── compressed WebP backgrounds
```

---

## 7. Configuration

The application's main settings are available in:

`js/common.js`

| Setting | Purpose |
|---|---|
| `VISIT_SLOTS` | Defines available visit time slots |
| `ICU_LIMIT` | Maximum simultaneous visitors for ICU patients |
| `NORMAL_LIMIT` | Maximum simultaneous visitors for other wards |
| `OVERDUE_MINUTES` | Time threshold for overstay alerts |
| `EARLY_ENTRY_MINUTES` | How early a visitor can enter before their slot |
| `ENFORCE_SLOT_TIME` | Enables or disables slot-time validation |

### Demo behaviour

- **Immediate entry check-in (`ENFORCE_SLOT_TIME = false`):** Disabled for demonstration so staff can admit visitors as soon as their request is approved and their pass ID is verified, without waiting for the scheduled slot time. In real deployment, set this to `true` in `js/common.js` so entry is allowed only from 15 minutes before the slot starts until it ends.
- **Dynamic slot updates:** While the visitor booking step is visible, a periodic timer running every `REFRESH_EVERY_MS` (30 seconds) resets the date field's minimum to `today()` and calls `updateSlotOptions()`, ensuring slots that pass while the page is open become disabled.

---

## 8. How to Run the Project

No installation, package manager, or backend server is required.

1. Download or clone the project repository.
2. Extract the project folder if downloaded as a ZIP file.
3. Open the extracted folder.
4. Open `index.html` in a modern browser such as Google Chrome, Microsoft Edge, or Mozilla Firefox.

### Testing Live Updates

To test updates between the Visitor and Staff portals:

1. Open `visitor.html` in one browser tab.
2. Open `staff.html` in another tab.
3. Submit a visitor request.
4. Approve or reject the request through the Staff portal.
5. Observe the updated status in the Visitor portal.

**Important:** Both tabs must be opened in the same browser profile because the application uses browser Local Storage.

---

## 9. Demo Credentials

Use the following credentials to access the Staff portal:

| Field | Value |
|---|---|
| Username | `staff` |
| Password | `staff123` |

### Demo OTP

The Visitor portal displays the generated OTP directly on the screen under the label **Demo Code**.

No actual SMS or external OTP service is used.

---

## 10. Limitations

CarePass is intentionally designed as a front-end demonstration project. It does not provide production-level authentication or data security.

- **No backend or database:** All application records are stored in browser Local Storage. Data is limited to the browser and device where it was created.
- **Demo OTP:** No real SMS verification takes place.
- **Demo authentication:** Staff credentials are stored in JavaScript and pre-filled in the login form.
- **No patient authentication:** The Patient portal does not require login.
- **Pass ID verification:** Staff manually enter the visitor pass ID. The barcode graphic is decorative and cannot be scanned.
- **Client-side time validation:** Slot validation depends on the device's local clock.
- **Non-secure audit logs:** Browser-stored records can be modified or deleted. The reset option can restore the demonstration data.

---

## 11. Future Enhancements

The following features could be introduced in a future backend-enabled version:

- Backend development using Node.js and Express.
- Database integration using PostgreSQL or MySQL.
- Secure staff and patient authentication.
- Real OTP verification through an SMS service.
- QR-code-based visitor pass generation and scanning.
- Server-side booking validation and access control.
- Centralized data storage for multi-device access.
- Automated notifications and improved reporting.

---

## 12. Project Objective

The objective of CarePass is to demonstrate how a digital visitor management system can simplify hospital visitor registration, reduce manual administrative work, and provide a structured process for managing visitor requests, approvals, entry, and exit.

**CarePass – A simpler, more organized approach to hospital visitor management.**
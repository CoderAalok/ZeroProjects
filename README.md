# Hospital Visitor Management System (CarePass)

**CarePass** is a frontend-based demonstration application designed to coordinate hospital visits through three dedicated portals: Visitor, Staff, and Patient.

Visitors can verify their contact details and request hospital visiting slots. Staff can review requests, approve or reject visits, and record visitor entry and exit. Patients can view visit information associated with their selected profile.

> **Demo Scope:** CarePass is a client-side demonstration application. It does not provide server-side processing or real identity verification. Use sample data only. It is not suitable for managing real patient information or controlling actual hospital access.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Getting Started](#getting-started)
3. [Demo Credentials](#demo-credentials)
4. [User Roles and Workflows](#user-roles-and-workflows)
5. [Visit Lifecycle](#visit-lifecycle)
6. [Project Structure](#project-structure)
7. [Application Architecture](#application-architecture)
8. [Data Model](#data-model)
9. [Business Rules and Validation](#business-rules-and-validation)
10. [Configuration and Customization](#configuration-and-customization)
11. [Data Management and Reset](#data-management-and-reset)
12. [Limitations](#limitations)
13. [Future Enhancements](#future-enhancements)

---

## 1. Project Overview

CarePass provides a structured digital approach to hospital visitor coordination.

### Key Features

- Digital visitor registration.
- Demonstration OTP-based contact verification.
- Patient selection and visiting slot booking.
- Staff approval and rejection of visit requests.
- Digital visitor pass generation.
- Visitor entry and exit management.
- Patient-specific visitor monitoring.
- Searchable visitor records.
- Audit logging of recorded actions.
- Browser-based data persistence.
- Cross-tab notifications within the same browser profile.

### Three Dedicated Portals

| Portal | Primary Responsibility |
|---|---|
| Visitor Portal | Registration, verification, visit booking, and pass management |
| Staff Portal | Request approval, visitor entry/exit, and record management |
| Patient Portal | Viewing patient profiles and associated visitor history |

---

## 2. Getting Started

CarePass is a frontend-only application. No installation, build process, or backend server is required.

### Prerequisites

- A modern web browser.
- The CarePass project files.

### Running the Application

1. Download or clone the project.
2. Navigate to the `CarePass_Visitor_Management` directory.
3. Open `index.html` in a modern web browser.
4. Select the desired portal from the navigation.

### Recommended Demo Setup

For live staff notifications:

1. Open `visitor.html` in one browser tab.
2. Open `staff.html` in another tab.
3. Keep both tabs within the same browser profile.

When a visitor submits or cancels a request, the staff tab receives a browser `storage` event and updates its request count and notification interface.

**Note:** Google Fonts and Font Awesome are loaded through external CDNs. These resources may not be available without an internet connection, although the core application runs locally.

---

## 3. Demo Credentials

The application provides demonstration access for all three portals.

| Portal | Demo Access |
|---|---|
| Visitor | OTP is generated and displayed directly on the screen. |
| Staff | Username: `staff` |
| Staff Password | `staff123` |
| Patient | Select one of the predefined patient profiles. |

**Important:** The OTP is not delivered through SMS. Staff credentials and authentication checks are implemented on the client side and are not secure authentication mechanisms.

---

## 4. User Roles and Workflows

### 4.1 Visitor Portal

The Visitor Portal allows visitors to request and manage hospital visits.

**Workflow:**

1. Enter the visitor's name and mobile number.
2. Submit the details to generate a demonstration OTP.
3. Enter the displayed OTP to complete verification.
4. Select the patient to be visited.
5. Choose the visiting date and available time slot.
6. Submit the visit request.
7. Track the request status within the same browser session.
8. Cancel a pending or approved request when required.
9. View the digital visitor pass after staff approval.

The approved visitor can present the visit ID at the security desk for staff verification.

### 4.2 Staff Portal

The Staff Portal provides administrative controls for managing hospital visits.

**Available functionalities:**

- Staff sign-in.
- Pending visit request management.
- Visit approval and rejection.
- Rejection reason display.
- Visitor pass ID verification.
- Visitor entry recording.
- Active visitor monitoring.
- Visitor exit recording.
- Searchable visitor records.
- Filtering by patient name, patient ID, and visit status.
- Audit log inspection.
- Resetting demonstration records and logs.

**Staff Workflow:**

1. Sign in using the demonstration credentials.
2. Review pending visit requests.
3. Approve or reject requests.
4. Provide a rejection reason when necessary.
5. Verify an approved visitor using the visit ID.
6. Record visitor entry.
7. Monitor visitors currently inside the hospital.
8. Record visitor exit.
9. Review historical records and audit logs.

### 4.3 Patient Portal

The Patient Portal allows patients to review their associated visitor information.

**Available functionalities:**

- Select a predefined patient profile.
- View patient information.
- Review current visitor counts.
- Review upcoming visits.
- Review previous visit history.
- View visitor information associated with the selected profile.

Visitor mobile numbers are intentionally omitted from the patient-facing view.

---

## 5. Visit Lifecycle

CarePass manages visitor requests through a predefined status transition system.

### Visit Status Flow

```text
                 VISITOR
                    |
                    v
              VISIT REQUEST
                    |
                    v
               PENDING
                    |
              STAFF REVIEW
                    |
          +---------+---------+
          |         |         |
          v         v         v
       APPROVED  REJECTED  CANCELLED
          |
          v
      ENTRY CHECK
          |
          v
        ACTIVE
          |
          v
        EXITED
```

### Status Definitions

| Status | Description |
|---|---|
| `PENDING` | Request submitted and awaiting staff approval. |
| `APPROVED` | Staff approved the request. |
| `ACTIVE` | Visitor entry has been recorded. |
| `EXITED` | Visitor exit has been recorded. |
| `REJECTED` | Staff rejected the request. |
| `CANCELLED` | Visitor cancelled the request. |

### Status Categories

**Open States:**
- `PENDING`
- `APPROVED`
- `ACTIVE`

**Closed States:**
- `REJECTED`
- `CANCELLED`
- `EXITED`

Allowed transitions are defined in `TRANSITIONS` inside `js/config.js` and enforced through `setStatus()` in `js/rules.js`.

This centralized approach prevents invalid status transitions.

---

## 6. Project Structure

The project follows a modular frontend structure that separates presentation, configuration, shared utilities, storage, validation, and portal-specific functionality.

```text
ZeroProjects/
└── CarePass_Visitor_Management/
    │
    ├── index.html
    ├── visitor.html
    ├── staff.html
    ├── patient.html
    ├── .editorconfig
    │
    ├── css/
    │   ├── common.css
    │   ├── home.css
    │   ├── portal-split.css
    │   ├── visitor.css
    │   ├── staff.css
    │   └── patient.css
    │
    ├── js/
    │   ├── config.js
    │   ├── utils.js
    │   ├── storage.js
    │   ├── rules.js
    │   ├── helpers.js
    │   ├── visitor.js
    │   ├── staff.js
    │   └── patient.js
    │
    └── images/
        ├── Logos
        ├── Portal Icons
        └── Page Imagery
```

### Directory Responsibilities

| Directory/File | Responsibility |
|---|---|
| `index.html` | Landing page and portal navigation |
| `visitor.html` | Visitor registration and digital pass |
| `staff.html` | Staff authentication, request management, and records |
| `patient.html` | Patient profile and visitor history |
| `css/` | Page-specific and shared styling |
| `js/` | Browser-side application logic |
| `images/` | Logos, icons, and visual assets |

---

## 7. Application Architecture

CarePass follows a modular, browser-based architecture.

### 7.1 Page-to-Script Mapping

| Page | Stylesheets | JavaScript | Purpose |
|---|---|---|---|
| `index.html` | `common.css`, `home.css` | None | Static landing page |
| `visitor.html` | `common.css`, `portal-split.css`, `visitor.css` | `visitor.js` | Visitor verification, booking, and pass display |
| `staff.html` | `common.css`, `portal-split.css`, `staff.css` | `staff.js` | Staff management and visit records |
| `patient.html` | `common.css`, `patient.css` | `patient.js` | Patient profiles and visitor history |

### 7.2 Shared JavaScript Architecture

Interactive pages load shared JavaScript modules in the following order:

```text
config.js
    |
    v
utils.js
    |
    v
storage.js
    |
    v
rules.js
    |
    v
helpers.js
    |
    v
Page-Specific Script
```

### Module Responsibilities

| Module | Responsibility |
|---|---|
| `config.js` | Shared constants, status definitions, and demonstration data |
| `utils.js` | Date/time formatting, masking, and HTML escaping |
| `storage.js` | Browser storage operations and data lookups |
| `rules.js` | Booking validation and status transition enforcement |
| `helpers.js` | Shared DOM operations, notifications, badges, and display helpers |
| `visitor.js` | Visitor portal functionality |
| `staff.js` | Staff portal functionality |
| `patient.js` | Patient portal functionality |

### Architectural Approach

The application separates responsibilities into distinct modules:

- **Configuration Layer:** Defines application constants and demonstration data.
- **Utility Layer:** Provides reusable formatting and helper functions.
- **Storage Layer:** Manages browser-based persistence.
- **Business Logic Layer:** Enforces booking rules and visit status transitions.
- **Presentation Layer:** Handles portal-specific interfaces and user interactions.

This structure improves code organization, maintainability, and extensibility.

---

## 8. Data Model

CarePass stores application records in a browser-based object containing four primary arrays.

### Data Structure

```javascript
{
    patients: [],
    staff: [],
    visits: [],
    logs: []
}
```

### Data Components

| Component | Description |
|---|---|
| `patients` | Demonstration patient profiles |
| `staff` | Demonstration staff accounts |
| `visits` | Visitor booking and visit records |
| `logs` | Recorded application actions and status changes |

### Initial Data

On a clean application start:

- Patient profiles are initialized using predefined demonstration data.
- A demonstration staff account is created.
- The visits array starts empty.
- The audit logs array starts empty.

### Visit Identification

Each visit receives a sequential identifier.

Example:

```text
VST-1001
VST-1002
VST-1003
```

These identifiers are used to reference and verify visitor passes within the demonstration.

---

## 9. Business Rules and Validation

CarePass implements centralized validation rules to maintain consistency across visitor requests and staff operations.

### 9.1 Booking Rules

- A visitor cannot book a visit for a past date.
- A visitor cannot book a slot that has already ended on the current day.
- Duplicate open requests for the same slot are prevented.
- Multiple open requests for the same patient and day are prevented for a visitor.
- A visitor currently inside the hospital cannot request another visit for that day.

### 9.2 Entry Validation

- Entry requires an approved pass.
- The approved pass must be valid for the current date.
- A visitor cannot be inside the hospital using two passes simultaneously.
- Patient-specific visitor limits must be respected.

### 9.3 Patient Visitor Limits

| Ward | Maximum Simultaneous Visitors |
|---|---:|
| ICU | 1 |
| Other Wards | 2 |

### 9.4 Audit Logging

Request creation and status changes are recorded in the audit log.

This provides a demonstration record of important application actions.

### 9.5 Core Business Functions

| Function | Responsibility |
|---|---|
| `addVisit()` | Creates and validates new visit requests |
| `setStatus()` | Validates and performs visit status transitions |

Both functions return a structured response:

```javascript
{ ok: true }
```

When an operation fails:

```javascript
{ 
    ok: false, 
    message: "Explanation of the validation or storage error"
}
```

This approach allows the interface to display meaningful feedback when an operation cannot be completed.

---

## 10. Configuration and Customization

Application-wide settings are maintained in:

```text
js/config.js
```

### Configurable Constants

| Constant | Responsibility |
|---|---|
| `VISIT_SLOTS` | Visiting time slots available in the visitor form |
| `WARD_INSIDE_LIMIT` | Ward-specific visitor limits |
| `DEFAULT_INSIDE_LIMIT` | Default simultaneous visitor limit |
| `OVERDUE_MINUTES` | Threshold used for overdue indicators |
| `SEED_PATIENTS` | Predefined patient profiles |
| `SEED_STAFF` | Demonstration staff account |
| `LOG_PREVIEW_COUNT` | Initial number of audit log rows |
| `RECORD_PREVIEW_COUNT` | Initial number of request cards |
| `REFRESH_EVERY_MS` | Staff page refresh interval |

### Extending Business Rules

CarePass provides centralized extension points.

**Adding a Booking Rule:**

1. Define the validation function in `js/rules.js`.
2. Return an explanatory message when validation fails or `null` when it passes.
3. Register the function in `NEW_REQUEST_RULES`.

**Adding an Entry Rule:**

Add the validation function to:

```javascript
RULES_BEFORE_STATUS[STATUS.ACTIVE]
```

**Adding a New Visit Status:**

Update the following:

1. `STATUS` in `js/config.js`.
2. `TRANSITIONS` in `js/config.js`.
3. Corresponding status-chip styles in `css/common.css`.

This design makes application rules easier to extend without unnecessarily modifying portal-specific code.

---

## 11. Data Management and Reset

CarePass uses browser storage to maintain demonstration records.

### Storage Mechanisms

| Storage | Purpose |
|---|---|
| `localStorage` | Persistent application records |
| `sessionStorage` | Visitor and staff session information |

### Resetting Application Data

The Staff Portal provides a feature named:

**Reset all records & logs**

This operation:

- Restores predefined patient profiles.
- Restores the demonstration staff account.
- Clears visitor records.
- Clears audit logs.
- Resets data associated with the current application storage key.

Visitor and staff session information is maintained separately in `sessionStorage`.

Clearing the browser session removes session-specific information.

**Important:** Browser storage is isolated by browser profile. Resetting data in one browser profile does not affect records in other profiles or devices.

---

## 12. Limitations

CarePass is designed for academic demonstration and frontend development practice.

The following limitations apply:

1. **Client-Side Architecture:** The application does not have a backend server.
2. **Local Data Storage:** Records are stored in browser `localStorage`, not a centralized database.
3. **No Server-Side Validation:** Business rules execute in the browser and can be bypassed by a user who modifies browser data.
4. **Demo OTP:** OTP codes are generated and displayed on the page. No SMS is sent.
5. **Demo Authentication:** Staff credentials and authentication checks are implemented client-side.
6. **No Authorization Layer:** The application does not provide secure server-side role-based access control.
7. **Browser Dependency:** Application records are specific to the browser profile.
8. **Decorative Pass Artwork:** The barcode-like artwork is decorative and is not a scannable QR code.
9. **No Real-Time Multi-Device Synchronization:** Cross-tab notifications work only within the same browser profile.

> **Security Notice:** Do not use CarePass to store real patient information, authenticate real visitors, or manage actual hospital entry and exit operations.

---

## 13. Future Enhancements

The following improvements could extend CarePass into a more complete hospital visitor management platform.

| Area | Proposed Enhancement |
|---|---|
| Backend | Node.js and Express integration |
| Database | MySQL or PostgreSQL integration |
| Authentication | Secure server-side authentication |
| OTP Verification | Real SMS-based OTP delivery |
| Access Control | Role-based access control |
| Visitor Pass | QR-code generation and verification |
| Notifications | Real-time visitor and staff notifications |
| Data Security | Protected patient information and secure APIs |
| Integration | Hospital management system integration |
| Synchronization | Centralized multi-device data synchronization |

These are proposed enhancements and are not part of the current implementation.

---

## Conclusion

CarePass demonstrates how a structured frontend application can simplify hospital visitor coordination through dedicated visitor, staff, and patient interfaces.

By combining visitor registration, booking validation, staff approval, digital pass management, entry/exit tracking, and patient-specific visitor history, the project provides a practical demonstration of modular frontend application development.

The project also establishes a foundation for future development involving backend services, centralized databases, secure authentication, and real-time communication.

**CarePass – Making Hospital Visits Smarter, Safer and More Organized.**

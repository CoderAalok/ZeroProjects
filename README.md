# README Suggestion

## Hospital Visitor Management System (CarePass)

CarePass is a browser-based hospital visitor management demo built with HTML, CSS, and vanilla JavaScript. It provides separate interfaces for visitors, staff, and patients, and simulates the complete visit lifecycle through browser storage.

## Features

### Visitor Portal
- Request a patient visit
- Verify with a demo OTP
- Choose an available date and time slot
- Track request status
- View an approved digital visitor pass

### Staff Portal
- Review and approve or reject requests
- Verify visitors at entry
- Record entry and exit times
- Monitor active visits
- Search records and review audit logs
- Receive pending-request notifications

### Patient Portal
- View associated visitors
- Check visitor details and visit history
- Keep visitor phone numbers masked

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- DOM and Browser APIs
- Local Storage and Session Storage

No framework, backend, database, package manager, or external dependency is required.

## Visit Lifecycle

```text
VISITOR → PENDING → APPROVED → ACTIVE → EXITED
                     ↓
                  REJECTED
```

Pending and approved visits also expire automatically when their scheduled slot passes.

## Project Structure

```text
CarePass_Visitor_Management/
├── index.html
├── visitor.html
├── staff.html
├── patient.html
├── css/
│   ├── common.css
│   ├── home.css
│   ├── portal-split.css
│   ├── visitor.css
│   ├── staff.css
│   └── patient.css
└── js/
    ├── common.js
    ├── visitor.js
    ├── staff.js
    └── patient.js
```

## Running the Project

1. Clone or download the repository.
2. Open the `CarePass_Visitor_Management` folder.
3. Open `index.html` in a modern browser.

```bash
git clone https://github.com/CoderAalok/ZeroProjects.git
cd ZeroProjects/CarePass_Visitor_Management
```

Open `index.html` directly in Chrome, Edge, Firefox, or another modern browser.

## Demo Staff Login

| Field | Value |
|---|---|
| Username | `staff` |
| Password | `staff123` |

## Testing the Visitor Flow

1. Open `visitor.html`.
2. Submit a visit request.
3. Open `staff.html` in another tab.
4. Approve or reject the request.
5. Reopen `visitor.html` to see the updated status.

Use both tabs in the same browser profile because application data is stored in Local Storage.

## Demo Data

A demo OTP is displayed directly in the visitor interface. No SMS or external OTP service is used.

The staff credentials and patient data are included in JavaScript for demonstration only.

## Limitations

CarePass is a front-end demonstration and does not provide production-grade security or data storage.

- No backend or database
- No real authentication
- No real OTP delivery
- No server-side validation
- No cross-device synchronization
- No secure audit history
- Browser data can be modified or deleted
- Booking rules depend on the device clock

## Future Improvements

- Node.js or Express backend
- PostgreSQL or MongoDB database
- Secure staff and patient authentication
- SMS-based OTP verification
- QR-code visitor passes
- Server-side booking validation
- Role-based access control
- Centralized storage and reporting
- Automated notifications

## Author

Created by [CoderAalok](https://github.com/CoderAalok) as a college project demonstrating a hospital visitor management workflow.

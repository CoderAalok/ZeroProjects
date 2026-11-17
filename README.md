# CarePass

CarePass is a front-end demo for coordinating hospital visits. Visitors verify their contact details and request a time slot; staff approve requests and record entry and exit; patients can review visits associated with their profile.

> **Demo scope:** CarePass has no server or real identity verification. Use sample data only. It is not suitable for managing real patient information or hospital access.

## Contents

1. [Run the demo](#run-the-demo)
2. [Roles and workflows](#roles-and-workflows)
3. [Visit lifecycle](#visit-lifecycle)
4. [Project layout](#project-layout)
5. [Application architecture](#application-architecture)
6. [Data model and business rules](#data-model-and-business-rules)
7. [Configuration and extension points](#configuration-and-extension-points)
8. [Reset and browser data](#reset-and-browser-data)
9. [Limitations](#limitations)

## Run the demo

1. Open `index.html` directly in a modern browser. There is no install, build, or server step.
2. Select a portal from the navigation: Visitor, Staff, or Patient.
3. For live staff notifications, open `visitor.html` and `staff.html` in separate tabs in the same browser profile.

The application stores records in the browser's `localStorage`. Fonts and icons come from external CDNs and may not load offline; the core application is local.

### Demo sign-in

| Portal | Demo access |
|---|---|
| Visitor | The page generates a demo OTP and displays it on screen. No SMS is sent. |
| Staff | Username `staff`, password `staff123` (prefilled in the form). |
| Patient | Choose one of the seeded profiles; no sign-in is required. |

## Roles and workflows

### Visitor

1. Enter a name and mobile number in the Visitor portal.
2. Submit to generate a demo OTP, then enter the displayed code.
3. Select a patient, date, and available visit slot and submit the request.
4. Track the request on the same browser session. A pending or approved request can be cancelled.
5. When staff approve the request, view the digital pass and show its visit ID at the security desk.

### Staff

1. Sign in using the demo staff credentials.
2. Review pending requests and approve or reject them. A rejection reason is shown to the visitor.
3. For an approved pass, enter its visit ID in **Entry check**. A successful check records entry and marks the visit active.
4. Record the visitor's exit from **Visitors inside now**. The visit is then closed.
5. Search and filter **Records** by patient name or ID and status; consult the audit log for recorded actions.

When a visitor submits or cancels a request in another tab, the staff tab receives a browser `storage` event and refreshes its request count and notification UI.

### Patient

1. Choose a seeded patient profile.
2. Review current, upcoming, and past visit counts and the patient's visitor history.
3. Visitor mobile numbers are omitted from this view.

## Visit lifecycle

```text
                         approve                 record entry             record exit
PENDING ─────────────────────────> APPROVED ───────────────────────> ACTIVE ─────────> EXITED
   │                                  │
   ├── reject ──> REJECTED            └── cancel ──> CANCELLED
   └── cancel ──> CANCELLED
```

`PENDING`, `APPROVED`, and `ACTIVE` are open states. `REJECTED`, `CANCELLED`, and `EXITED` are closed states. Allowed transitions are declared in `TRANSITIONS` in `js/config.js` and enforced by `setStatus()` in `js/rules.js`.

## Project layout

```text
CarePass_Visitor_Management/
├── index.html                  Landing page and portal links
├── visitor.html                Visitor registration and pass view
├── staff.html                  Staff sign-in, request desk, and records
├── patient.html                Patient profile and visitor history
├── .editorconfig               Shared editor formatting defaults
├── css/                        Page and shared styles
│   ├── common.css              Design tokens and shared components
│   ├── home.css                Landing page
│   ├── portal-split.css        Shared visitor/staff layout
│   ├── visitor.css             Visitor portal
│   ├── staff.css               Staff portal
│   └── patient.css             Patient portal
├── js/                         Browser-side application logic
│   ├── config.js               Settings, status constants, demo data
│   ├── utils.js                Date/time, masking, and escaping helpers
│   ├── storage.js              Persistence and data lookups
│   ├── rules.js                Booking rules and status transitions
│   ├── helpers.js              Shared DOM and display helpers
│   ├── visitor.js              Visitor page behavior
│   ├── staff.js                Staff page behavior
│   └── patient.js              Patient page behavior
└── images/                     Logos, portal icons, and page imagery
```

## Application architecture

### Page-to-script mapping

| Page | Styles | Page script | Purpose |
|---|---|---|---|
| `index.html` | `common.css`, `home.css` | None | Static landing page |
| `visitor.html` | `common.css`, `portal-split.css`, `visitor.css` | `visitor.js` | Verify visitor, request/cancel visit, display pass |
| `staff.html` | `common.css`, `portal-split.css`, `staff.css` | `staff.js` | Sign in, process requests, record entry/exit, search records |
| `patient.html` | `common.css`, `patient.css` | `patient.js` | Select profile and view visits |

### Shared script load order

Interactive pages load scripts in this order because each layer uses the one before it:

```text
config.js → utils.js → storage.js → rules.js → helpers.js → page-specific script
```

- `config.js` defines shared constants and demo seed data.
- `utils.js` contains pure formatting, date, masking, and HTML-escaping functions.
- `storage.js` owns reads and writes to browser storage.
- `rules.js` validates requests and controls status changes.
- `helpers.js` contains shared DOM, toast, badge, and display functions.
- The page script binds that functionality to its page's forms, controls, and rendering.


## Data model and business rules

The persisted object has four arrays:

```js
{
  patients: [],
  staff: [],
  visits: [],
  logs: []
}
```

On a clean start, the app seeds patient profiles and a demo staff account; the visit and audit-log arrays start empty. Visit IDs are sequential (`VST-1001`, `VST-1002`, ...).

Current booking and entry rules include:

- A visit cannot be booked for a past date or for a slot that has already ended today.
- A visitor cannot have another open request for the same slot, or another open request for the same patient and day.
- A visitor who is currently inside cannot request another visit for today.
- Entry requires an approved pass for today.
- A visitor cannot be inside on two passes at once.
- A patient can have one visitor inside at a time in ICU and two in other wards.
- Request and status changes are added to the audit log.

`addVisit()` creates requests and `setStatus()` performs state changes. Both return `{ ok: true }` on success or `{ ok: false, message }` when a rule or storage operation prevents the change.

## Configuration and extension points

Adjust the constants in `js/config.js`:

| Constant | Controls |
|---|---|
| `VISIT_SLOTS` | Slots offered in the visitor form |
| `WARD_INSIDE_LIMIT` | Ward-specific simultaneous visitor limits (currently ICU: 1) |
| `DEFAULT_INSIDE_LIMIT` | Limit for wards without a specific setting (currently 2) |
| `OVERDUE_MINUTES` | Threshold for the overdue indicator |
| `SEED_PATIENTS` / `SEED_STAFF` | Demo profiles and staff account |
| `LOG_PREVIEW_COUNT` / `RECORD_PREVIEW_COUNT` | Initial number of log rows/request cards |
| `REFRESH_EVERY_MS` | Staff page refresh interval |

To add a booking rule, define a function in `js/rules.js` that returns an explanatory message or `null`, then add it to `NEW_REQUEST_RULES`. To add an entry rule, add it to `RULES_BEFORE_STATUS[STATUS.ACTIVE]`. To add a status, update `STATUS`, `TRANSITIONS`, and the status-chip styles in `css/common.css`.

## Reset and browser data

Use **Reset all records & logs** in the Staff portal to restore seed profiles and clear visits and audit logs for the current app storage key. Visitor and staff session information uses `sessionStorage`, separate from saved records; clearing the browser session removes it. Data in other browser profiles or devices is unaffected.

## Limitations

- This is a client-only demo. There is no shared database, server-side validation, or authorization layer.
- `localStorage` is specific to a browser profile and can be inspected or edited by that browser's user. Cross-tab notifications work only within the same browser profile.
- The OTP is generated and shown in the page; it is not delivered to a phone.
- Staff credentials and the sign-in check are client-side and are not secure authentication.
- The pass ID is text. The barcode-like artwork is decorative and is not a scannable QR code.
- Real use would require a secure backend, authenticated roles, protected patient data, server-side rules, and real OTP delivery and pass verification.

/* ==========================================================================
   config.js - Every setting you might want to change lives here.
   No logic, no DOM. Loaded first on every page.

   Quick recipes:
     * Add or change a visiting slot ........ VISIT_SLOTS
     * Change how many people may be inside .. WARD_INSIDE_LIMIT / DEFAULT_INSIDE_LIMIT
     * Change the overstay alert time ........ OVERDUE_MINUTES
     * Add a demo patient or staff login ..... SEED_PATIENTS / SEED_STAFF
   ========================================================================== */


/* ---------- Storage ---------- */

/* Key used in the browser's localStorage. Change the suffix to wipe saved demo data. */
const STORAGE_KEY = 'carepass_data_v4';

/* Older versions of the app used these keys. They are cleaned up on start. */
const OLD_STORAGE_KEYS = ['carepass_data', 'carepass_data_v2', 'carepass_data_v3'];


/* ---------- Visit statuses ---------- */

/* Always use STATUS.PENDING (not the text 'PENDING') so typos are caught early. */
const STATUS = Object.freeze({
  PENDING:   'PENDING',     // visitor asked, waiting for staff
  APPROVED:  'APPROVED',    // staff said yes, pass is issued
  ACTIVE:    'ACTIVE',      // visitor is inside the hospital
  EXITED:    'EXITED',      // visit finished
  REJECTED:  'REJECTED',    // staff said no
  CANCELLED: 'CANCELLED',   // visitor cancelled
});

/* Shown as a coloured label only. It is never saved as a real status. */
const CHIP_OVERDUE = 'OVERDUE';

const TRANSITIONS = {
  [STATUS.PENDING]:  [STATUS.APPROVED, STATUS.REJECTED, STATUS.CANCELLED],
  [STATUS.APPROVED]: [STATUS.ACTIVE, STATUS.CANCELLED],
  [STATUS.ACTIVE]:   [STATUS.EXITED],
};

/* Named groups of statuses, used for counts and for deciding what to show. */
const STATUS_GROUPS = {
  upcoming: [STATUS.PENDING, STATUS.APPROVED],
  past:     [STATUS.EXITED, STATUS.REJECTED, STATUS.CANCELLED],
  hasPass:  [STATUS.APPROVED, STATUS.ACTIVE],     // a digital pass is shown
  attended: [STATUS.ACTIVE, STATUS.EXITED],       // the visit really happened
};


/* ---------- Visiting rules ---------- */

/* Visiting slots offered to visitors (single source of truth). Format: "HH:MM - HH:MM". */
const VISIT_SLOTS = ['10:00 - 11:00', '14:00 - 15:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00'];

/*
  How many visitors may be inside with ONE patient at the same time.
  A ward listed here uses its own limit; every other ward uses DEFAULT_INSIDE_LIMIT.
*/
const WARD_INSIDE_LIMIT = { ICU: 1 };
const DEFAULT_INSIDE_LIMIT = 2;

/* Visitors inside longer than this are flagged as overdue. */
const OVERDUE_MINUTES = 60;


/* ---------- Screen behaviour ---------- */

const LOG_PREVIEW_COUNT = 6;       // staff audit log rows shown before "Show more"
const RECORD_PREVIEW_COUNT = 3;    // visitor request cards shown before "Show more"
const REFRESH_EVERY_MS = 30000;    // staff desk refresh, keeps "time inside" fresh


/* ---------- Demo data (used on first run and after a reset) ---------- */

const SEED_PATIENTS = [
  { id: 'P1', name: 'Raj Kumar',   ward: 'General Ward', room: '204-A' },
  { id: 'P2', name: 'Neha Singh',  ward: 'ICU',          room: 'ICU-03' },
  { id: 'P3', name: 'Amit Patel',  ward: 'Cardiology',   room: '105-B' },
  { id: 'P4', name: 'Priya Verma', ward: 'Maternity',    room: '302-C' },
];

/* Demo only. A real system must check passwords on a server. */
const SEED_STAFF = [
  { username: 'staff', password: 'staff123', name: 'Rajesh Kumar (Security Desk)' },
];

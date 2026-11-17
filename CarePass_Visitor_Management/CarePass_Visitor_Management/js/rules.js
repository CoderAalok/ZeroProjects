/* ==========================================================================
   rules.js - Business rules: who may book, enter, be approved, and so on.
   Never touches the page (DOM). Page scripts call addVisit() and setStatus().

   HOW IT WORKS
     Every rule is a small function with the same shape:

         function ruleSomething(data, subject) { ... }

     It returns a message explaining the problem, or null when everything is fine.
     Rules are collected in two lists below. To add a rule, write one function
     and add its name to the right list. Rules run in order; the first
     problem found is the one shown to the person.

   RESULT SHAPE
     addVisit() and setStatus() return { ok: true } or { ok: false, message }.
   ========================================================================== */


/* ==========================================================================
   1. RESULTS & STATUS HELPERS
   ========================================================================== */

const OK = Object.freeze({ ok: true });

function fail(message) {
  return { ok: false, message };
}

/* Saves, and turns a browser-storage failure into a normal result. */
function saveResult(data) {
  return saveData(data) ? OK : fail('Could not save: browser storage is unavailable or full.');
}

/* True while a visit can still change (PENDING, APPROVED or ACTIVE). */
function isOpenStatus(status) {
  return status in TRANSITIONS;
}

function canTransition(fromStatus, toStatus) {
  return (TRANSITIONS[fromStatus] || []).includes(toStatus);
}

/* Adds a line to the audit log (newest first). */
function addLogEntry(data, who, action, visitId) {
  data.logs.unshift({ time: new Date().toISOString(), who, action, visitId });
}

/* Runs rules in order and returns the first problem, or null. */
function firstProblem(rules, data, subject) {
  for (const rule of rules) {
    const message = rule(data, subject);
    if (message) return message;
  }
  return null;
}


/* ==========================================================================
   2. RULES FOR A NEW VISIT REQUEST      rule(data, request) -> message | null
   ========================================================================== */

function ruleDateNotInPast(data, request) {
  if (!request.date || request.date < today()) {
    return 'The visit date cannot be in the past.';
  }
  return null;
}

function ruleSlotNotEnded(data, request) {
  if (slotHasEnded(request.date, request.slot)) {
    return `The ${request.slot} slot has already ended today. Please choose a later slot.`;
  }
  return null;
}

/* The same visitor cannot hold two open visits in the same slot. */
function ruleNoSameSlotConflict(data, request) {
  const clash = data.visits.find((visit) =>
    visit.mobile === request.mobile &&
    visit.date === request.date &&
    visit.slot === request.slot &&
    isOpenStatus(visit.status));
  if (!clash) return null;

  const patient = findPatient(data, clash.patientId);
  return `You already have a ${clash.status.toLowerCase()} visit (${clash.id}) with ${patient.name} ` +
         `for ${request.slot} on ${request.date}. Please choose a different time.`;
}

/* A visitor who is inside right now cannot ask for another visit today. */
function ruleNotInsideNow(data, request) {
  if (request.date !== today()) return null;

  const inside = data.visits.find((visit) =>
    visit.mobile === request.mobile && visit.status === STATUS.ACTIVE);
  if (!inside) return null;

  return `You’re currently inside the hospital on pass ${inside.id}. ` +
         'Please check out before booking another visit.';
}

/* Only one open request per patient, per visitor, per day. */
function ruleNoDuplicateOpenRequest(data, request) {
  const duplicate = data.visits.some((visit) =>
    visit.mobile === request.mobile &&
    visit.patientId === request.patientId &&
    visit.date === request.date &&
    isOpenStatus(visit.status));

  return duplicate ? 'You already have an open visit request for this patient on that day.' : null;
}

/* Add new rules to this list. */
const NEW_REQUEST_RULES = [
  ruleDateNotInPast,
  ruleSlotNotEnded,
  ruleNoSameSlotConflict,
  ruleNotInsideNow,
  ruleNoDuplicateOpenRequest,
];


/* ==========================================================================
   3. RULES FOR LETTING A VISITOR IN      rule(data, visit) -> message | null
   ========================================================================== */

function ruleVisitIsToday(data, visit) {
  return visit.date === today() ? null : `This pass is for ${visit.date}, not today.`;
}

/* The same visitor cannot be inside on two passes at once. */
function ruleVisitorNotAlreadyInside(data, visit) {
  const other = data.visits.find((item) =>
    item.id !== visit.id && item.mobile === visit.mobile && item.status === STATUS.ACTIVE);
  if (!other) return null;

  return `${visit.visitorName} (${maskMobile(visit.mobile)}) is already inside on pass ${other.id}. ` +
         'They need to check out before entering again.';
}

/* Ward limit: ICU = 1 visitor inside per patient, other wards = DEFAULT_INSIDE_LIMIT. */
function ruleWardLimit(data, visit) {
  const patient = findPatient(data, visit.patientId);
  const limit = WARD_INSIDE_LIMIT[patient.ward] || DEFAULT_INSIDE_LIMIT;
  const insideNow = data.visits.filter((item) =>
    item.id !== visit.id && item.patientId === visit.patientId && item.status === STATUS.ACTIVE).length;

  if (insideNow < limit) return null;

  const people = insideNow === 1 ? 'visitor' : 'visitors';
  return `${patient.name} already has ${insideNow} ${people} inside. ` +
         `The limit for this ward is ${limit} at a time.`;
}

/* Extra checks that run before a visit moves INTO a status. */
const RULES_BEFORE_STATUS = {
  [STATUS.ACTIVE]: [ruleVisitIsToday, ruleVisitorNotAlreadyInside, ruleWardLimit],
};


/* ==========================================================================
   4. PUBLIC FUNCTIONS (the page scripts only call these two)
   ========================================================================== */

/* Create a new visit request. Returns OK or { ok: false, message }. */
function addVisit(request) {
  const data = loadData();

  const problem = firstProblem(NEW_REQUEST_RULES, data, request);
  if (problem) return fail(problem);

  const visitId = nextVisitId(data);
  data.visits.push({
    ...request,
    id: visitId,
    status: STATUS.PENDING,
    reason: '',
    entryTime: null,
    exitTime: null,
  });
  addLogEntry(data, request.visitorName, STATUS.PENDING, visitId);

  return saveResult(data);
}

/*
  Change the status of a visit. EVERY status change goes through here, so the
  rules are checked in exactly one place.
  Returns OK or { ok: false, message }.
*/
function setStatus(visitId, nextStatus, who = 'Visitor', reason = '') {
  const data = loadData();
  const visit = data.visits.find((item) => item.id === visitId);

  if (!visit) {
    return fail(`No visit found with ID ${visitId}.`);
  }

  if (!canTransition(visit.status, nextStatus)) {
    return fail(`Not allowed: this visit is ${visit.status.toLowerCase()} and cannot become ${nextStatus.toLowerCase()}.`);
  }

  const problem = firstProblem(RULES_BEFORE_STATUS[nextStatus] || [], data, visit);
  if (problem) return fail(problem);

  visit.status = nextStatus;
  if (reason) visit.reason = reason;
  if (nextStatus === STATUS.ACTIVE) visit.entryTime = new Date().toISOString();
  if (nextStatus === STATUS.EXITED) visit.exitTime = new Date().toISOString();
  addLogEntry(data, who, nextStatus, visitId);

  return saveResult(data);
}

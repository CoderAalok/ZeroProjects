/* ==========================================================================
   storage.js - Reading and writing the saved data (browser localStorage).
   This is the ONLY file that touches localStorage for app data. To move to a
   real server later, replace the bodies of loadData() and saveData().

   Saved data shape:
     { patients: [...], staff: [...], visits: [...], logs: [...] }
   ========================================================================== */

/* ---------- Starting data ---------- */

function createSeedData() {
  return {
    patients: SEED_PATIENTS.map((patient) => ({ ...patient })),
    staff:    SEED_STAFF.map((member) => ({ ...member })),
    // Starts EMPTY on purpose: requests appear only when visitors submit them.
    visits: [],
    logs: [],
  };
}

/* ---------- Load / save ---------- */

/* Make sure saved data has the shape the app expects. */
function isValidData(data) {
  return Boolean(data) &&
    Array.isArray(data.patients) && Array.isArray(data.staff) &&
    Array.isArray(data.visits) && Array.isArray(data.logs);
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidData(saved)) return saved;
  } catch (error) {
    // Missing, corrupted or blocked storage: fall back to a clean start below
  }
  return createSeedData();
}

/* Returns true when the data was saved, false when the browser refused. */
function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    return false;
  }
}

function resetData() {
  const fresh = createSeedData();
  return saveData(fresh) ? fresh : null;
}

/* Remove data saved by older versions of the app (runs once per page load). */
function removeOldStorageVersions() {
  OLD_STORAGE_KEYS.forEach((key) => {
    try { localStorage.removeItem(key); } catch (error) { /* storage unavailable */ }
  });
}

/* ---------- Lookups ---------- */

/* Next unique visit ID: VST-1001, VST-1002, ... (never repeats). */
function nextVisitId(data) {
  const highest = data.visits.reduce((max, visit) => {
    const number = parseInt(String(visit.id).replace(/\D/g, ''), 10);
    return Number.isNaN(number) ? max : Math.max(max, number);
  }, 1000);
  return 'VST-' + (highest + 1);
}

/* The patient record, or a harmless placeholder when the ID is unknown. */
function findPatient(data, patientId) {
  return data.patients.find((patient) => patient.id === patientId)
      || { name: 'Unknown', ward: '', room: '' };
}

removeOldStorageVersions();

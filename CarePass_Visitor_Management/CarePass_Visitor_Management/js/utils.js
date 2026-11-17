/* ==========================================================================
   utils.js - Small pure helpers: dates, times, text.
   No DOM and no storage, so they are safe to use from any file.
   ========================================================================== */

/* Format a local calendar date as YYYY-MM-DD without relying on locale output. */
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/* Today's date as YYYY-MM-DD in the local time zone. */
function today() {
  return formatLocalDate(new Date());
}

/* Tomorrow's local calendar date, including across daylight-saving changes. */
function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatLocalDate(date);
}

/* Read session data safely in case storage is blocked or contains bad JSON. */
function readSessionJson(key) {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    return null;
  }
}

/* True when the slot (e.g. "10:00 - 11:00") has already finished today. */
function slotHasEnded(date, slot) {
  if (date !== today()) return false;

  const endTime = String(slot).split(' - ')[1];
  if (!endTime) return false;

  const [hours, minutes] = endTime.split(':').map(Number);
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() >= hours * 60 + minutes;
}

/* Whole minutes since an ISO date-time. */
function minutesSince(isoTime) {
  return Math.floor((Date.now() - new Date(isoTime)) / 60000);
}

/* Hide most of a mobile number (e.g. 9876543210 -> ******3210). */
function maskMobile(mobile) {
  return mobile ? '******' + String(mobile).slice(-4) : '';
}

/* Make text safe to place inside HTML (prevents HTML injection). */
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => '&#' + char.charCodeAt(0) + ';');
}

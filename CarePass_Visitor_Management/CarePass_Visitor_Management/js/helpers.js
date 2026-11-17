/* ==========================================================================
   helpers.js - Display helpers shared by the pages (they use the DOM).
   Pure text/date helpers are in utils.js; saved data is in storage.js.
   ========================================================================== */


/* 1. FINDING ELEMENTS & FORMATTING */

/* Shortcut for document.getElementById. */
function $(id) {
  return document.getElementById(id);
}

/* ISO date-time -> "05:30 PM", or "-" when empty. */
function formatTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}


/*2. SMALL HTML PIECES */

/* Coloured status label, e.g. "Pending". */
function statusChip(status) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return '<span class="chip" data-status="' + status + '">' + label + '</span>';
}

/* Progress track for visits that are still moving through the flow. */
const TRACK_STEPS = ['Requested', 'Approved', 'Inside', 'Done'];
const TRACK_POSITION = {
  [STATUS.PENDING]: 0,
  [STATUS.APPROVED]: 1,
  [STATUS.ACTIVE]: 2,
  [STATUS.EXITED]: 3,
};

function progressTrack(status) {
  if (!(status in TRACK_POSITION)) return '';   // rejected / cancelled: no track

  const current = TRACK_POSITION[status];
  const items = TRACK_STEPS.map((label, index) => {
    let cssClass = '';
    if (index < current) cssClass = 'done';
    if (index === current) cssClass = 'now';
    return '<li class="' + cssClass + '">' + label + '</li>';
  });

  return '<ol class="track" aria-label="Progress">' + items.join('') + '</ol>';
}

/* Table body rows, or one friendly "empty" row when the list is empty. */
function tableRowsOrEmpty(list, rowBuilder, columnCount, emptyMessage) {
  if (list.length === 0) {
    return '<tr><td class="empty" colspan="' + columnCount + '">' + emptyMessage + '</td></tr>';
  }
  return list.map(rowBuilder).join('');
}


/* 3. TOAST (pop-up message at the bottom of the screen) */

let toastTimer = null;

function showToast(message, isError = false) {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = isError ? 'show error' : 'show';

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = ''; }, 3200);
}

/* Shows the toast from a result object: success text or the error message. */
function showResult(result, successMessage) {
  showToast(result.ok ? successMessage : result.message, !result.ok);
}


/* 4. NOTIFICATION BADGE (red circle with a white number)  */

/* Shows the number, and hides the badge itself when the count is 0. */
function setBadge(id, count) {
  const badge = $(id);
  if (!badge) return;

  badge.hidden = count === 0;
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.setAttribute('aria-label', count + ' pending request' + (count === 1 ? '' : 's'));
}

/* Makes a badge bounce to catch the eye (used for NEW requests). */
function pulseBadge(id) {
  const badge = $(id);
  if (!badge || badge.hidden) return;

  badge.classList.remove('pulse');
  void badge.offsetWidth;                       // restart the animation
  badge.classList.add('pulse');
  badge.addEventListener('animationend', () => badge.classList.remove('pulse'), { once: true });
}

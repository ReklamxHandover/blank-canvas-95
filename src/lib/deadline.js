// Deadline helpers: days remaining, soft row tint, overdue check.
// Uses date-only comparison so the row recolors at local midnight each day.

export function daysUntilDeadline(deadlineIso) {
  if (!deadlineIso) return null;
  const d = new Date(deadlineIso);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86400000);
}

export function isOrderOverdue(order) {
  if (!order?.deadline) return false;
  if (order.paid) return false;
  if (order.pipeline?.betald?.status === 'done') return false;
  return daysUntilDeadline(order.deadline) < 0;
}

// 4-tier row tint driven purely by days until deadline.
// Resting opacity increased so the color reads clearly without hovering.
// Hover stays darker (fuller) than resting, preserving existing hover feel.
// Returns { bg, hoverBg } or null when no deadline.
export function deadlineRowTint(deadlineIso) {
  const days = daysUntilDeadline(deadlineIso);
  if (days === null) return null;

  if (days > 30) {
    return { bg: 'var(--row-deadline-green)', hoverBg: 'var(--row-deadline-green-hover)' };
  }
  if (days > 10) {
    return { bg: 'var(--row-deadline-yellow)', hoverBg: 'var(--row-deadline-yellow-hover)' };
  }
  if (days >= 0) {
    return { bg: 'var(--row-deadline-orange)', hoverBg: 'var(--row-deadline-orange-hover)' };
  }
  return { bg: 'var(--row-deadline-red)', hoverBg: 'var(--row-deadline-red-hover)' };
}

// Sort comparator: nearest deadline first, no-deadline last.
export function compareByDeadline(a, b) {
  const da = a.deadline ? new Date(a.deadline).getTime() : null;
  const db = b.deadline ? new Date(b.deadline).getTime() : null;
  if (da === null && db === null) return 0;
  if (da === null) return 1;
  if (db === null) return -1;
  return da - db;
}

// Full-strength pill color for converted orders. Mirrors deadlineRowTint tiers.
export function deadlinePillColor(deadlineIso) {
  const days = daysUntilDeadline(deadlineIso);
  if (days === null) return '#6B7FD4';
  if (days > 30) return '#2d8a4a';
  if (days > 10) return '#b88a1a';
  if (days >= 0) return '#c4691a';
  return '#b53d3d';
}

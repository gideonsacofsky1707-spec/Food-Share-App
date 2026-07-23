export function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// For date-only values (e.g. a listing's "best by") - no time-of-day to
// show, so this deliberately doesn't call toLocaleString with timeStyle,
// which would otherwise print a spurious midnight.
export function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

// Membership rule for which topics belong to a council session's agenda.
//
// A DISCUSSING topic rolls forward across sessions until it is resolved, but it
// must not appear retroactively in sessions that happened before the topic
// existed. Membership is scoped by calendar day: a topic created any time on
// the session's date (up to 23:59) still belongs to that session.
//
// Dates are compared in the server's local timezone, matching how session
// dates are stored (`new Date(date)`) and displayed (`toLocaleDateString`)
// elsewhere in the app.

/**
 * Exclusive upper bound for a topic's `createdAt` to belong to a session on
 * `sessionDate`: the start of the day following the session's date. A topic
 * with `createdAt < cutoff` was created on or before the session's day.
 */
export function sessionTopicCutoff(sessionDate: Date): Date {
  const cutoff = new Date(sessionDate);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() + 1);
  return cutoff;
}

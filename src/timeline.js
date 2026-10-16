/**
 * Turns the content into one ordered list: projects and special days, month by month,
 * sorted by day number. The scene, the Index and Previous/Next all use this order.
 */

export const dayOf = (date) => {
  const d = parseInt(String(date), 10);
  return Number.isFinite(d) ? d : null;
};

export const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

export function buildEntries(months, specialDays = {}) {
  const entries = [];
  let globalIndex = 0;
  months.forEach((month, monthIndex) => {
    const list = [
      ...(month.items || []).map((data, i) => ({ data, kind: 'project', order: i })),
      ...(specialDays[month.name] || []).map((data, i) => ({
        data,
        kind: data.kind === 'birthday' ? 'birthday' : 'special',
        order: 1000 + i,
      })),
    ];
    for (const e of list) e.day = dayOf(e.data.date);
    // Undated entries keep their order and go after dated ones.
    list.sort((a, b) => (a.day ?? 99) - (b.day ?? 99) || a.order - b.order);
    list.forEach((e, indexInMonth) => {
      e.monthIndex = monthIndex;
      e.indexInMonth = indexInMonth;
      e.countInMonth = list.length;
      e.globalIndex = globalIndex++;
      entries.push(e);
    });
  });
  return entries;
}

export const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export const overlapMinutes = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
  const start = Math.max(aStart.getTime(), bStart.getTime());
  const end = Math.min(aEnd.getTime(), bEnd.getTime());
  if (end <= start) return 0;
  return Math.floor((end - start) / 60000);
};

export const calculateWorkedMinutesWithFixedBreaks = (startAtIso: string, endAtIso: string) => {
  const start = new Date(startAtIso);
  const end = new Date(endAtIso);
  if (!(end.getTime() > start.getTime())) return 0;

  const grossMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
  const y = start.getFullYear();
  const m = start.getMonth();
  const d = start.getDate();

  const break1Start = new Date(y, m, d, 9, 0, 0, 0);
  const break1End = new Date(y, m, d, 9, 30, 0, 0);
  const break2Start = new Date(y, m, d, 12, 0, 0, 0);
  const break2End = new Date(y, m, d, 13, 0, 0, 0);

  const breakMinutes =
    overlapMinutes(start, end, break1Start, break1End) +
    overlapMinutes(start, end, break2Start, break2End);
  return Math.max(0, grossMinutes - breakMinutes);
};

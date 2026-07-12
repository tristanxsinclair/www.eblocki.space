type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function partsToDayKey(parts: Intl.DateTimeFormatPart[]): string {
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function localDayKey(value: DateInput = new Date(), timeZone?: string): string {
  const date = toDate(value);
  if (!date) return "";

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return partsToDayKey(formatter.formatToParts(date));
  } catch {
    const formatter = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return partsToDayKey(formatter.formatToParts(date));
  }
}

export function isSameLocalDay(
  candidate: DateInput,
  reference: DateInput = new Date(),
  timeZone?: string,
): boolean {
  const candidateKey = localDayKey(candidate, timeZone);
  const referenceKey = localDayKey(reference, timeZone);
  return Boolean(candidateKey && referenceKey && candidateKey === referenceKey);
}

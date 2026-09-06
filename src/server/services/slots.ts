/**
 * Pure slot-generation function: bookable start times for a given calendar
 * day = Availability windows, minus BlockedDate, minus existing bookings
 * (with a buffer), minus travel time for at-home visits. No Prisma, no
 * Next.js — everything here is plain data in, plain data out, so the tricky
 * timezone/midnight-boundary cases are unit-testable without a database.
 *
 * All timestamps in and out are UTC `Date`s. Callers are responsible for
 * converting to/from Asia/Kolkata at the UI boundary (CLAUDE.md §4.11:
 * store UTC, display IST) — this function only ever compares durations and
 * instants, never wall-clock/local time, so it has no DST or IST-offset
 * edge cases of its own.
 */

export type AvailabilityWindow = { weekday: number; startMinute: number; endMinute: number };
export type BusyInterval = { start: Date; end: Date };

export type SlotGenerationInput = {
  /** The calendar day to generate slots for, at UTC midnight. */
  day: Date;
  availability: AvailabilityWindow[];
  blockedDates: Date[];
  existingBookings: BusyInterval[];
  serviceDurationMin: number;
  /** Minutes to leave clear after each booking before the next can start. */
  bufferMin?: number;
  /** Extra minutes to add to duration for at-home travel time, if any. */
  travelTimeMin?: number;
  /** Generate candidate start times on this granularity. */
  stepMin?: number;
};

function toMinutesOfDay(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function isSameUtcDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function generateSlots(input: SlotGenerationInput): Date[] {
  const {
    day,
    availability,
    blockedDates,
    existingBookings,
    serviceDurationMin,
    bufferMin = 0,
    travelTimeMin = 0,
    stepMin = 15,
  } = input;

  if (blockedDates.some((d) => isSameUtcDate(d, day))) {
    return [];
  }

  const weekday = day.getUTCDay();
  const windows = availability.filter((w) => w.weekday === weekday);
  const totalDurationMin = serviceDurationMin + travelTimeMin;

  const slots: Date[] = [];

  for (const window of windows) {
    for (
      let startMinute = window.startMinute;
      startMinute + totalDurationMin <= window.endMinute;
      startMinute += stepMin
    ) {
      const slotStart = new Date(day);
      slotStart.setUTCMinutes(startMinute);
      const slotEnd = new Date(slotStart.getTime() + totalDurationMin * 60_000);

      const conflicts = existingBookings.some((booking) =>
        overlaps(
          slotStart,
          new Date(slotEnd.getTime() + bufferMin * 60_000),
          booking.start,
          new Date(booking.end.getTime() + bufferMin * 60_000),
        ),
      );

      if (!conflicts) {
        slots.push(slotStart);
      }
    }
  }

  return slots;
}

/** Parses "HH:mm"-style minute-of-day helpers used by callers building AvailabilityWindow. */
export function minutesOfDay(hour: number, minute = 0): number {
  return hour * 60 + minute;
}

export { toMinutesOfDay };

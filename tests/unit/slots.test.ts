import { describe, expect, it } from "vitest";

import { generateSlots, minutesOfDay } from "@/server/services/slots";

// Wednesday, chosen arbitrarily; getUTCDay() = 3.
const DAY = new Date(Date.UTC(2026, 0, 7));
const WEDNESDAY = DAY.getUTCDay();

describe("generateSlots", () => {
  it("generates slots across the full availability window at the given step", () => {
    const slots = generateSlots({
      day: DAY,
      availability: [
        { weekday: WEDNESDAY, startMinute: minutesOfDay(10), endMinute: minutesOfDay(12) },
      ],
      blockedDates: [],
      existingBookings: [],
      serviceDurationMin: 60,
      stepMin: 30,
    });
    // 10:00 and 10:30 fit a 60-min service before the 12:00 window close; 11:00 is the last valid start.
    expect(slots.map((s) => s.getUTCHours() * 60 + s.getUTCMinutes())).toEqual([600, 630, 660]);
  });

  it("returns no slots on a blocked date even if availability would otherwise allow it", () => {
    const slots = generateSlots({
      day: DAY,
      availability: [
        { weekday: WEDNESDAY, startMinute: minutesOfDay(10), endMinute: minutesOfDay(18) },
      ],
      blockedDates: [DAY],
      existingBookings: [],
      serviceDurationMin: 60,
    });
    expect(slots).toHaveLength(0);
  });

  it("excludes slots that overlap an existing booking, honoring the buffer", () => {
    const slots = generateSlots({
      day: DAY,
      availability: [
        { weekday: WEDNESDAY, startMinute: minutesOfDay(10), endMinute: minutesOfDay(15) },
      ],
      blockedDates: [],
      existingBookings: [
        {
          start: new Date(DAY.getTime() + minutesOfDay(11) * 60_000),
          end: new Date(DAY.getTime() + minutesOfDay(12) * 60_000),
        },
      ],
      serviceDurationMin: 60,
      bufferMin: 15,
      stepMin: 30,
    });
    const minutes = slots.map((s) => (s.getTime() - DAY.getTime()) / 60_000);
    // Booking is 11:00-12:00; with a 15min buffer on both sides, any 60min
    // slot starting at or before 12:00 collides with it. The first clear
    // start is 12:30 (750).
    expect(minutes).toEqual(expect.not.arrayContaining([600, 630, 660, 690, 720]));
    expect(minutes).toEqual(expect.arrayContaining([750, 780, 810, 840]));
  });

  it("shrinks the effective window when travel time is added for at-home visits", () => {
    const withoutTravel = generateSlots({
      day: DAY,
      availability: [
        { weekday: WEDNESDAY, startMinute: minutesOfDay(10), endMinute: minutesOfDay(11) },
      ],
      blockedDates: [],
      existingBookings: [],
      serviceDurationMin: 60,
      stepMin: 30,
    });
    const withTravel = generateSlots({
      day: DAY,
      availability: [
        { weekday: WEDNESDAY, startMinute: minutesOfDay(10), endMinute: minutesOfDay(11) },
      ],
      blockedDates: [],
      existingBookings: [],
      serviceDurationMin: 60,
      travelTimeMin: 30,
      stepMin: 30,
    });
    expect(withoutTravel.length).toBeGreaterThan(0);
    expect(withTravel).toHaveLength(0); // 60+30=90min can't fit in a 60min window
  });

  it("respects a window ending exactly at midnight without overflowing into the next day", () => {
    const slots = generateSlots({
      day: DAY,
      availability: [
        { weekday: WEDNESDAY, startMinute: minutesOfDay(23), endMinute: minutesOfDay(24) },
      ],
      blockedDates: [],
      existingBookings: [],
      serviceDurationMin: 45,
      stepMin: 15,
    });
    // Only a 45-min slot starting at 23:00 or 23:15 fits before 24:00 (midnight).
    const minutes = slots.map((s) => (s.getTime() - DAY.getTime()) / 60_000);
    expect(minutes).toEqual([1380, 1395]);
  });

  it("only generates slots for windows matching the requested day's weekday", () => {
    const slots = generateSlots({
      day: DAY,
      availability: [
        { weekday: (WEDNESDAY + 1) % 7, startMinute: minutesOfDay(9), endMinute: minutesOfDay(17) },
      ],
      blockedDates: [],
      existingBookings: [],
      serviceDurationMin: 30,
    });
    expect(slots).toHaveLength(0);
  });
});

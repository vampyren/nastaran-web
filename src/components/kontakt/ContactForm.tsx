"use client";

import { FormEvent, useMemo, useState } from "react";
import { treatments } from "@/content/kontakt";

type CalendarDay = {
  date: Date;
  key: string;
  label: string;
  dayNumber: number;
  inMonth: boolean;
  weekNumber: number;
  disabled: boolean;
};

type CalendarWeek = { weekNumber: number; days: CalendarDay[] };
type CalendarMonth = { key: string; label: string; weeks: CalendarWeek[] };

const CONTACT_CONFIG = {
  workingDays: [1, 2, 3, 4, 5],
  startHour: 8,
  endHour: 17,
  slotMinutes: 30,
  maxChoices: 3,
  monthsToShow: 2,
};

const weekdayLabels = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}
function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
function monthName(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "long",
    year: "numeric",
  }).format(date);
}
function monthKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}
function shiftMonth(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}
function longDateLabel(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}
function isoWeekNumber(date: Date) {
  const tmp = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
}

function buildMonths(baseDate: Date, todayDate: Date): CalendarMonth[] {
  const today = new Date(todayDate);
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: CONTACT_CONFIG.monthsToShow }, (_, monthOffset) => {
    const monthStart = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() + monthOffset,
      1,
    );
    const monthEnd = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
    );
    const gridStart = addDays(monthStart, -((monthStart.getDay() + 6) % 7));
    const gridEnd = addDays(monthEnd, 6 - ((monthEnd.getDay() + 6) % 7));
    const weeks: CalendarWeek[] = [];
    for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor = addDays(cursor, 7)) {
      const days = Array.from({ length: 7 }, (_, dayOffset) => {
        const date = addDays(cursor, dayOffset);
        const day = date.getDay() || 7;
        const inMonth = date.getMonth() === monthStart.getMonth();
        const beforeToday = date < today && !sameDay(date, today);
        const disabled =
          !inMonth || beforeToday || !CONTACT_CONFIG.workingDays.includes(day);
        return {
          date,
          key: dateKey(date),
          label: longDateLabel(date),
          dayNumber: date.getDate(),
          inMonth,
          weekNumber: isoWeekNumber(date),
          disabled,
        };
      });
      weeks.push({ weekNumber: isoWeekNumber(cursor), days });
    }
    return { key: dateKey(monthStart), label: monthName(monthStart), weeks };
  });
}

function timeSlots() {
  const slots: string[] = [];
  const start = CONTACT_CONFIG.startHour * 60;
  const end = CONTACT_CONFIG.endHour * 60;
  for (let minutes = start; minutes <= end; minutes += CONTACT_CONFIG.slotMinutes) {
    slots.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  }
  return slots;
}

const LABEL_TXT =
  "block text-eyebrow uppercase tracking-[0.075em] tabular-nums font-extrabold text-accent-deep";

const INPUT_CLS =
  "block w-full min-h-[48px] rounded-[18px] border border-accent/35 bg-white/70 px-[15px] py-[13px] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] focus:outline-2 focus:outline-accent/60 focus:outline-offset-2";

export default function ContactForm({ email }: { email: string }) {
  const [today] = useState<Date>(() => {
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    return current;
  });
  const [baseDate, setBaseDate] = useState<Date>(() => {
    const current = new Date();
    return new Date(current.getFullYear(), current.getMonth(), 1);
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<Record<string, string>>({});

  const months = useMemo(() => buildMonths(baseDate, today), [baseDate, today]);
  const slots = useMemo(() => timeSlots(), []);
  const canGoBack = monthKey(baseDate) > monthKey(today);
  const selectedLabels = useMemo(() => {
    const dayMap = new Map(
      months.flatMap((month) =>
        month.weeks.flatMap((week) =>
          week.days.map((day) => [day.key, day.label] as const),
        ),
      ),
    );
    return selectedDates.map((key) => ({
      key,
      label: dayMap.get(key) ?? key,
    }));
  }, [months, selectedDates]);

  const toggleDate = (key: string) => {
    setSelectedDates((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= CONTACT_CONFIG.maxChoices) return current;
      return [...current, key];
    });
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dateLines = selectedLabels.map(({ key, label }, index) => {
      const time = selectedTimes[key] || "ej vald tid";
      return `${index + 1}. ${label}, kl. ${time}`;
    });
    const subject = `Kontaktförfrågan: ${String(form.get("treatment") || "Nastaran")}`;
    const body = [
      `Namn: ${form.get("name") || ""}`,
      `E-post: ${form.get("email") || ""}`,
      `Telefon: ${form.get("phone") || ""}`,
      `Intresse: ${form.get("treatment") || ""}`,
      "",
      "Önskade tider:",
      dateLines.length ? dateLines.join("\n") : "Inga tider valda ännu.",
      "",
      "Meddelande:",
      form.get("message") || "",
    ].join("\n");
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form onSubmit={submitForm} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className={LABEL_TXT}>Namn</span>
          <input name="name" type="text" required placeholder="Ditt namn" className={INPUT_CLS} />
        </label>
        <label className="grid gap-2">
          <span className={LABEL_TXT}>E-post</span>
          <input name="email" type="email" required placeholder="namn@example.se" className={INPUT_CLS} />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className={LABEL_TXT}>Telefon</span>
          <input name="phone" type="tel" placeholder="Valfritt" className={INPUT_CLS} />
        </label>
        <label className="grid gap-2">
          <span className={LABEL_TXT}>Behandling</span>
          <select name="treatment" required defaultValue="" className={INPUT_CLS}>
            <option disabled value="">
              Välj vad du är intresserad av
            </option>
            {treatments.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-2">
        <span className={LABEL_TXT}>Meddelande</span>
        <textarea
          name="message"
          rows={5}
          placeholder="Berätta kort vad du söker. Du behöver inte dela känsliga detaljer."
          className={`${INPUT_CLS} min-h-[132px] resize-y`}
        />
      </label>

      <fieldset
        className="m-0 rounded-[26px] border border-accent/30 p-[clamp(22px,4vw,34px)]"
        style={{
          background: "color-mix(in srgb, var(--color-lavender) 42%, white)",
        }}
      >
        <legend className={LABEL_TXT}>Välj upp till tre tider</legend>
        <p className="mt-2 mb-5 max-w-[70ch] text-[15px] leading-6 text-ink-muted">
          Arbetstid är just nu måndag–fredag kl. 08–17. Dagar och tider är samlade
          i en enkel konfiguration i koden så de kan ändras senare.
        </p>

        <div
          aria-label="Byt månad"
          className="mb-5 grid grid-cols-[max-content_minmax(0,1fr)_max-content] items-center gap-2.5 max-[640px]:grid-cols-2"
        >
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() => setBaseDate((c) => shiftMonth(c, -1))}
            className="min-h-[38px] rounded-full border border-accent/35 bg-white/65 px-3.5 py-2 text-[13px] font-extrabold text-accent-deep hover:enabled:bg-accent-deep hover:enabled:text-paper disabled:opacity-40 disabled:cursor-not-allowed max-[640px]:row-start-2"
          >
            Föregående
          </button>
          <span className="text-center font-serif text-[20px] leading-[1.15] capitalize text-ink max-[640px]:col-span-2 max-[640px]:row-start-1">
            {months[0]?.label} – {months.at(-1)?.label}
          </span>
          <button
            type="button"
            onClick={() => setBaseDate((c) => shiftMonth(c, 1))}
            className="min-h-[38px] rounded-full border border-accent/35 bg-white/65 px-3.5 py-2 text-[13px] font-extrabold text-accent-deep hover:bg-accent-deep hover:text-paper max-[640px]:row-start-2"
          >
            Nästa
          </button>
        </div>

        <div className="grid gap-[18px] min-[760px]:grid-cols-2">
          {months.map((month) => (
            <section
              key={month.key}
              aria-label={month.label}
              className="rounded-[22px] border border-accent/25 bg-white/55 p-[18px] max-[640px]:p-[14px]"
            >
              <h3 className="mb-3.5 font-serif text-[24px] font-medium text-ink">
                {month.label}
              </h3>
              <div
                aria-hidden
                className="mb-2 grid grid-cols-[34px_repeat(7,minmax(0,1fr))] items-center gap-1.5 text-[11px] uppercase tracking-[0.05em] text-ink-muted max-[640px]:grid-cols-[28px_repeat(7,minmax(0,1fr))] max-[640px]:gap-1"
              >
                <span>v.</span>
                {weekdayLabels.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              {month.weeks.map((week) => (
                <div
                  key={`${month.key}-${week.weekNumber}-${week.days[0]?.key}`}
                  className="mb-1.5 grid grid-cols-[34px_repeat(7,minmax(0,1fr))] items-center gap-1.5 max-[640px]:grid-cols-[28px_repeat(7,minmax(0,1fr))] max-[640px]:gap-1"
                >
                  <span className="text-center text-[12px] text-copper">
                    {week.weekNumber}
                  </span>
                  {week.days.map((day) => {
                    const selected = selectedDates.includes(day.key);
                    return (
                      <button
                        type="button"
                        key={day.key}
                        aria-label={day.label}
                        aria-pressed={selected}
                        disabled={day.disabled}
                        onClick={() => toggleDate(day.key)}
                        className={`aspect-square min-w-0 rounded-full border border-transparent bg-white/70 text-[13px] text-ink hover:enabled:border-accent/45 disabled:bg-transparent disabled:text-ink-muted/40 disabled:cursor-not-allowed max-[640px]:text-[12px] ${
                          selected
                            ? "!border-accent-deep !bg-accent-deep !text-paper"
                            : ""
                        }`}
                      >
                        {day.dayNumber}
                      </button>
                    );
                  })}
                </div>
              ))}
            </section>
          ))}
        </div>

        {selectedLabels.length ? (
          <div
            aria-label="Valda tider"
            className="mt-5 grid gap-3.5 min-[760px]:grid-cols-2"
          >
            {selectedLabels.map(({ key, label }, index) => (
              <label key={key} className="grid gap-2">
                <span className={LABEL_TXT}>
                  {index + 1}. {label}
                </span>
                <select
                  value={selectedTimes[key] ?? ""}
                  onChange={(e) =>
                    setSelectedTimes((current) => ({
                      ...current,
                      [key]: e.target.value,
                    }))
                  }
                  className={INPUT_CLS}
                >
                  <option value="">Välj tid</option>
                  {slots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        ) : null}
      </fieldset>

      <div className="grid items-start gap-3 min-[760px]:grid-cols-[max-content_minmax(0,1fr)] min-[760px]:items-center">
        <button
          type="submit"
          className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-transparent bg-aubergine px-[18px] py-3 text-[15px] font-extrabold text-paper shadow-cta hover:-translate-y-px transition-transform duration-200 max-[560px]:w-full"
        >
          Skicka förfrågan
        </button>
        <p className="m-0 text-[14px] leading-[22px] text-ink-muted">
          Formuläret öppnar din e-post med texten ifylld. Ingen känslig
          information lagras på sidan.
        </p>
      </div>
    </form>
  );
}

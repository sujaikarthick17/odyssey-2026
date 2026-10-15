export const API_BASE = 'https://render72.pages.dev/api/test';
const string = value => typeof value === 'string' ? value.trim() : '';
const array = value => Array.isArray(value) ? value : [];
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

// Only HTTP(S) links can reach an image or an external registration page.
export function safeURL(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}

export function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object' || !['string', 'number'].includes(typeof raw.id) || raw.id === '') return null;
  return {
    id: raw.id, // Keep the server ID; never generate an ID from the title.
    title: string(raw.name), blurb: string(raw.blurb), description: string(raw.description),
    image: safeURL(raw.cover_image_url), imageAlt: string(raw.cover_image_alt),
    category: string(raw.category), tags: array(raw.tags).filter(t => typeof t === 'string'),
    type: string(raw.event_type), mode: string(raw.event_mode), status: string(raw.event_status),
    featured: raw.is_featured === true, price: number(raw.price), perHead: typeof raw.is_per_head === 'boolean' ? raw.is_per_head : null,
    minTeam: number(raw.min_teamsize), maxTeam: number(raw.max_teamsize),
    registrationStatus: string(raw.registration_status), deadline: string(raw.registration_deadline),
    registrationURL: safeURL(raw.registration_url),
    summary: raw.schedule_summary && typeof raw.schedule_summary === 'object' ? raw.schedule_summary : {},
    schedules: array(raw.schedules).filter(s => s && typeof s === 'object'),
    faqs: array(raw.faqs).filter(f => f && typeof f.question === 'string' && typeof f.answer === 'string'),
    coordinators: array(raw.coordinators).filter(c => c && typeof c === 'object'),
    organizers: array(raw.organizers).filter(o => o && typeof o === 'object'),
    sections: Object.fromEntries(['highlights', 'what_to_expect', 'eligibility', 'prerequisites', 'rules'].map(key => [key, array(raw[key]).filter(x => typeof x === 'string')])),
    prizes: array(raw.prizes).filter(p => p && typeof p === 'object')
  };
}

export class APIError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'APIError'; this.status = status; }
}

async function request(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new APIError(response.status === 404 ? 'This event could not be found. It may have been removed.' : `The event service returned an error (${response.status}). Please try again.`, response.status);
    try { return await response.json(); }
    catch { throw new APIError('The event service returned an unreadable response. Please try again.'); }
  } catch (error) {
    if (error instanceof APIError) throw error;
    if (error.name === 'AbortError') throw new APIError('The event service took too long to respond. Please try again.');
    throw new APIError('We couldn’t reach the event service. Check your connection and try again.');
  } finally { clearTimeout(timeout); }
}

export async function getEvents() {
  const data = await request('/events');
  if (!Array.isArray(data?.events)) throw new APIError('The event service returned an unexpected list format. Please try again.');
  return data.events.map(normalizeEvent).filter(Boolean).map(scheduleForFestival);
}

export async function getEvent(id) {
  const data = await request(`/events/${encodeURIComponent(id)}`);
  const event = normalizeEvent(data?.event);
  if (!event) throw new APIError('This event has no available details.', 404);
  return scheduleForFestival(event);
}

// Presentation-only demo schedule. The API records and their IDs stay unchanged.
// Derive each assignment from its ID so list, detail, sorting and saved views agree.
export function scheduleForFestival(event) {
  const day = 86400000;
  const festivalStart = Date.UTC(2026, 9, 20);
  const validDates = [event.summary.start_date, event.summary.end_date, ...event.schedules.map(s => s.event_date)].filter(value => dateLabel(value));
  const originalStart = dateLabel(event.summary.start_date) ? Date.parse(event.summary.start_date) : validDates.length ? Math.min(...validDates.map(value => Date.parse(value))) : null;
  const originalEnd = validDates.length ? Math.max(...validDates.map(value => Date.parse(value))) : originalStart;
  let hash = 0;
  for (const char of String(event.id)) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  const offset = hash % 4;
  const start = festivalStart + offset * day;
  const span = originalStart === null ? 0 : Math.min(3 - offset, Math.max(0, Math.round((originalEnd - originalStart) / day)));
  const iso = timestamp => new Date(timestamp).toISOString().slice(0, 10);
  const shiftDate = value => {
    const offset = originalStart !== null && dateLabel(value) ? Math.round((Date.parse(value) - originalStart) / day) : 0;
    return iso(start + Math.min(span, Math.max(0, offset)) * day);
  };
  let deadline = '';
  if (originalStart !== null && event.deadline && Number.isFinite(Date.parse(event.deadline))) {
    // Preserve the source lead time, with registration closing no later than start day (IST).
    deadline = new Date(Math.min(Date.parse(event.deadline) + start - originalStart, start + day - 19800000 - 1000)).toISOString();
  }
  return {
    ...event,
    deadline,
    summary: { ...event.summary, start_date: iso(start), end_date: iso(start + span * day) },
    schedules: event.schedules.map(schedule => ({ ...schedule, event_date: shiftDate(schedule.event_date) }))
  };
}

// Validate calendar dates before formatting, so invalid dates never reach the UI.
export function dateLabel(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return '';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export function priceLabel(event) {
  if (event.price === null) return '';
  // The API has no currency field. Display the amount without inventing a currency.
  if (event.price === 0) return 'Free';
  return `${event.price.toLocaleString('en-IN')}${event.perHead === null ? '' : event.perHead ? ' / person' : ' / team'}`;
}
export function registrationOpen(event) {
  const deadline = Date.parse(event.deadline);
  return event.registrationStatus === 'OPEN' && !['CLOSED', 'COMPLETED', 'CANCELLED'].includes(event.status) && (Number.isNaN(deadline) || deadline > Date.now());
}

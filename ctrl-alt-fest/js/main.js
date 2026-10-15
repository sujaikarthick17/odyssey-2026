import { getEvents, getEvent, dateLabel, priceLabel, registrationOpen } from './api.js';
import { createShortlist, SHORTLIST_KEY } from './shortlist.js';

let storage;
try { storage = window.localStorage; } catch { /* Use an in-memory shortlist. */ }
export const shortlist = createShortlist(storage);
const saveStatus = document.createElement('p');
saveStatus.className = 'sr-only';
saveStatus.setAttribute('role', 'status');
document.body.append(saveStatus);

function updateSavedUI() {
  document.querySelectorAll('[data-saved-count]').forEach(node => { node.textContent = String(shortlist.ids().length); });
  document.querySelectorAll('.save-event').forEach(button => {
    const saved = shortlist.has(button.dataset.eventId);
    button.textContent = saved ? '★ Saved' : '☆ Save';
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', `${saved ? 'Remove' : 'Save'} ${button.dataset.eventTitle}${saved ? ' from' : ' to'} your shortlist`);
  });
}

function saveButton(event, inDetail = false) {
  const button = el('button', `save-event${inDetail ? ' detail-save' : ''}`);
  button.type = 'button';
  button.dataset.eventId = String(event.id);
  button.dataset.eventTitle = event.title || 'event';
  button.addEventListener('click', () => {
    const { saved, persisted } = shortlist.toggle(event.id);
    const message = `${event.title || 'Event'} ${saved ? 'saved to' : 'removed from'} your shortlist.${persisted ? '' : ' Browser storage is unavailable; changes last for this page visit only.'}`;
    saveStatus.textContent = message;
    document.querySelector('#shortlist-note')?.replaceChildren(message);
    updateSavedUI();
    window.dispatchEvent(new Event('odyssey:shortlist'));
  });
  return button;
}

window.addEventListener('storage', event => {
  if (event.key !== SHORTLIST_KEY && event.key !== null) return;
  shortlist.refresh(); updateSavedUI();
  window.dispatchEvent(new Event('odyssey:shortlist'));
});
updateSavedUI();

// API strings are inserted as text, never as executable HTML.
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}
const readable = value => value.replaceAll('_', ' ').toLowerCase();
function timeLabel(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value) ? value.slice(0, 5) : '';
}

export function showLoading(container, count = 3) {
  container.replaceChildren(); container.setAttribute('aria-busy', 'true');
  for (let i = 0; i < count; i++) { const block = el('div', 'skeleton'); block.setAttribute('aria-hidden', 'true'); container.append(block); }
}

export function showState(container, title, message, action, label = 'Try again') {
  container.setAttribute('aria-busy', 'false');
  const state = el('div', 'state');
  const symbol = el('div', 'state-symbol', '↗'); symbol.setAttribute('aria-hidden', 'true');
  state.append(symbol, el('h3', '', title), el('p', '', message));
  if (action) { const button = el('button', 'button dark', label); button.type = 'button'; button.addEventListener('click', action); state.append(button); }
  container.replaceChildren(state);
}

function eventImage(event, className = '') {
  const fallback = () => { const box = el('div', 'image-fallback'); box.append(el('span', '', '✳'), el('div', '', 'No image available')); return box; };
  if (!event.image) return fallback();
  const img = el('img', className); img.alt = event.imageAlt; img.loading = 'lazy'; img.decoding = 'async';
  // Pexels URLs support smaller responsive variants; other providers stay unchanged.
  const url = new URL(event.image);
  if (url.hostname === 'images.pexels.com') {
    url.searchParams.set('w', '640'); url.searchParams.set('h', '426');
    const small = url.href; url.searchParams.set('w', '960'); url.searchParams.set('h', '640');
    img.srcset = `${small} 640w, ${url.href} 960w`; img.sizes = '(max-width: 430px) 90vw, (max-width: 700px) 45vw, 30vw';
  }
  img.src = event.image; img.addEventListener('error', () => img.replaceWith(fallback()), { once: true });
  return img;
}

export function renderCards(container, events) {
  container.setAttribute('aria-busy', 'false'); container.replaceChildren();
  for (const [index, event] of events.entries()) {
    const card = el('article', 'event-card'); const media = el('div', 'card-image');
    media.append(eventImage(event));
    if (event.category) media.append(el('span', 'tag', event.category));
    media.append(el('span', 'card-number', String(index + 1).padStart(2, '0')));
    const meta = el('div', 'card-meta');
    const date = dateLabel(event.summary.start_date);
    if (date) meta.append(el('span', '', date));
    if (event.type || event.mode) meta.append(el('span', '', [event.type, event.mode].filter(Boolean).map(readable).join(' / ')));
    const bottom = el('div', 'card-bottom');
    const labels = [priceLabel(event), event.registrationStatus ? readable(event.registrationStatus) : ''].filter(Boolean);
    if (labels.length) bottom.append(el('span', 'price', labels.join(' · ')));
    const button = el('button', 'card-button', 'Explore event ↗'); button.type = 'button';
    button.setAttribute('aria-label', `Explore ${event.title || 'event details'}`); button.addEventListener('click', () => openEvent(event.id)); bottom.append(button);
    card.append(media, meta);
    if (event.title) card.append(el('h3', '', event.title));
    if (event.blurb) card.append(el('p', 'card-summary', event.blurb));
    card.append(bottom, saveButton(event)); container.append(card);
  }
  updateSavedUI();
}

const dialog = document.querySelector('#event-dialog');
const detail = document.querySelector('#event-detail');
let requestVersion = 0;
if (dialog) {
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { requestVersion++; });
}

async function openEvent(id) {
  const version = ++requestVersion;
  detail.replaceChildren(el('h2', 'sr-only', 'Loading event details'));
  detail.firstChild.id = 'detail-title';
  const loading = el('div', 'detail-content'); showLoading(loading, 1); detail.append(loading);
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  try {
    const event = await getEvent(id);
    // Closing or opening another event makes older responses irrelevant.
    if (version !== requestVersion || !dialog.open) return;
    renderDetail(event);
  } catch (error) {
    if (version !== requestVersion || !dialog.open) return;
    const title = el('h2', 'sr-only', 'Event details unavailable'); title.id = 'detail-title';
    const state = el('div'); showState(state, error.status === 404 ? 'Event not found' : 'A little interruption.', error.message, () => openEvent(id));
    detail.replaceChildren(title, state);
  }
}

function renderDetail(event) {
  const content = el('div', 'detail-content');
  if (event.category) content.append(el('span', 'tag', event.category));
  const title = el('h2', event.title ? '' : 'sr-only', event.title || 'Event details'); title.id = 'detail-title'; content.append(title);
  content.append(saveButton(event, true));
  if (event.image) content.append(eventImage(event, 'detail-image'));
  if (event.description || event.blurb) content.append(el('p', 'detail-description', event.description || event.blurb));
  const facts = el('dl', 'detail-facts');
  function fact(label, value) { if (!value) return; const cell = el('div'); cell.append(el('dt', '', label), el('dd', '', value)); facts.append(cell); }
  fact('Date', dateLabel(event.summary.start_date)); fact('End date', event.summary.end_date !== event.summary.start_date ? dateLabel(event.summary.end_date) : '');
  fact('Format', [event.type, event.mode].filter(Boolean).map(readable).join(' · '));
  fact('Price', priceLabel(event));
  if (event.price > 0) fact('Currency', 'Not specified by the event listing');
  fact('Team size', event.minTeam !== null && event.maxTeam !== null ? event.minTeam === event.maxTeam ? `${event.minTeam} ${event.minTeam === 1 ? 'person' : 'people'}` : `${event.minTeam}–${event.maxTeam} people` : event.minTeam !== null ? `At least ${event.minTeam}` : event.maxTeam !== null ? `Up to ${event.maxTeam}` : '');
  fact('Event status', event.status ? readable(event.status) : ''); fact('Registration', event.registrationStatus ? readable(event.registrationStatus) : '');
  const deadline = new Date(event.deadline);
  if (event.deadline && !Number.isNaN(deadline.getTime())) fact('Registration deadline', new Intl.DateTimeFormat('en-GB', {dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Kolkata'}).format(deadline) + ' IST');
  if (facts.children.length) content.append(facts);
  if (event.schedules.length) {
    content.append(el('h3', '', 'When & where'));
    for (const schedule of event.schedules) {
      const values = [dateLabel(schedule.event_date), [timeLabel(schedule.start_time), timeLabel(schedule.end_time)].filter(Boolean).join(' – '), typeof schedule.venue === 'string' ? schedule.venue : ''].filter(Boolean);
      if (values.length) content.append(el('p', 'schedule-row', values.join(' · ')));
    }
  } else {
    const times = [timeLabel(event.summary.start_time), timeLabel(event.summary.end_time)].filter(Boolean).join(' – ');
    if (times) content.append(el('h3', '', 'Schedule'), el('p', '', times));
  }
  const headings = { highlights: 'The highlights', what_to_expect: 'What to expect', eligibility: 'Who can join', prerequisites: 'What to bring', rules: 'The ground rules' };
  for (const [key, values] of Object.entries(event.sections)) {
    if (!values.length) continue;
    const list = el('ul'); values.forEach(value => list.append(el('li', '', value))); content.append(el('h3', '', headings[key]), list);
  }
  if (event.prizes.length) {
    content.append(el('h3', '', 'Prizes'));
    for (const prize of event.prizes) {
      const text = [typeof prize.title === 'string' ? prize.title : '', typeof prize.amount === 'number' ? `Amount: ${prize.amount.toLocaleString('en-IN')}` : '', typeof prize.description === 'string' ? prize.description : ''].filter(Boolean).join(' · ');
      if (text) content.append(el('p', '', text));
    }
  }
  if (event.faqs.length) {
    content.append(el('h3', '', 'A few things to know'));
    for (const faq of event.faqs) { const item = el('details'); item.append(el('summary', '', faq.question), el('p', '', faq.answer)); content.append(item); }
  }
  const organizers = event.organizers.map(o => typeof o.name === 'string' ? o.name : '').filter(Boolean);
  if (organizers.length) content.append(el('h3', '', 'Organized by'), el('p', '', organizers.join(' · ')));
  const contacts = event.coordinators.filter(c => c.name || c.contact);
  if (contacts.length) {
    content.append(el('h3', '', 'Get in touch'));
    for (const contact of contacts) content.append(el('p', 'contact', [contact.name, contact.role, contact.contact].filter(x => typeof x === 'string' && x).join(' · ')));
  }
  if (event.registrationURL && registrationOpen(event)) {
    const link = el('a', 'button dark', 'Visit registration ↗'); link.href = event.registrationURL; link.target = '_blank'; link.rel = 'noopener noreferrer'; content.append(link);
  } else {
    content.append(el('p', 'registration-note', !event.registrationURL ? 'No registration link is provided in this listing. Check the organizer information above for next steps.' : 'Registration is not currently available for this event.'));
  }
  detail.replaceChildren(content);
  updateSavedUI();
}

async function loadFeatured() {
  const container = document.querySelector('#event-list');
  showLoading(container);
  try {
    const events = await getEvents();
    const featured = events.filter(event => event.featured).slice(0, 3);
    const selection = featured.length ? featured : events.slice(0, 3);
    if (!selection.length) showState(container, 'The lineup is taking a breather.', 'No events are available right now.', loadFeatured, 'Refresh lineup');
    else renderCards(container, selection);
    document.querySelector('#list-status').textContent = `${selection.length} events loaded.`;
  } catch (error) {
    showState(container, 'A little interruption.', error.message, loadFeatured);
    document.querySelector('#list-status').textContent = 'Events could not be loaded.';
  }
}
if (!document.querySelector('#filters')) loadFeatured();

import { getEvents, dateLabel, registrationOpen } from './api.js';
import { el, showLoading, showState, renderCards, shortlist } from './main.js';

const container = document.querySelector('#event-list');
const status = document.querySelector('#list-status');
const form = document.querySelector('#filters');
const search = document.querySelector('#search');
const category = document.querySelector('#category');
const type = document.querySelector('#type');
const sort = document.querySelector('#sort');
const openOnly = document.querySelector('#open-only');
const savedOnly = document.querySelector('#saved-only');
// Suit links on the homepage open a useful, shareable view of the lineup.
const initialFilters = new URLSearchParams(window.location.search);
savedOnly.checked = initialFilters.get('saved') === '1';
search.value = initialFilters.get('q') || '';
if (['EVENT', 'WORKSHOP'].includes(initialFilters.get('type'))) type.value = initialFilters.get('type');
let events = [];
let loaded = false;

function render() {
  if (!loaded) return;
  const query = search.value.trim().toLocaleLowerCase();
  const result = events.filter(event => (!query || [event.title, event.blurb, event.category, ...event.tags].join(' ').toLocaleLowerCase().includes(query)) && (!category.value || event.category === category.value) && (!type.value || event.type === type.value) && (!openOnly.checked || registrationOpen(event)) && (!savedOnly.checked || shortlist.has(event.id)));
  result.sort((a, b) => {
    if (sort.value === 'name') return a.title.localeCompare(b.title);
    if (sort.value === 'price') return (a.price ?? Infinity) - (b.price ?? Infinity);
    if (sort.value === 'date') return (dateLabel(a.summary.start_date) ? Date.parse(a.summary.start_date) : Infinity) - (dateLabel(b.summary.start_date) ? Date.parse(b.summary.start_date) : Infinity);
    return Number(b.featured) - Number(a.featured);
  });
  status.textContent = `${result.length} ${savedOnly.checked ? 'saved ' : ''}${result.length === 1 ? 'event' : 'events'} / ${events.length} in the demo lineup`;
  if (result.length) renderCards(container, result);
  else if (!events.length) showState(container, 'The lineup is taking a breather.', 'No events are available right now.', load, 'Refresh lineup');
  else if (savedOnly.checked) showState(container, 'Make room for your favourites.', 'No saved events match this view. Browse the lineup and use Save to build your shortlist.', reset, 'Browse all events');
  else showState(container, 'Nothing here. Yet.', 'Try a different search or make room for another interest.', reset, 'Clear filters');
}

function syncSavedURL() {
  const url = new URL(window.location.href);
  if (savedOnly.checked) url.searchParams.set('saved', '1'); else url.searchParams.delete('saved');
  history.replaceState(null, '', url);
}
function reset() { form.reset(); openOnly.checked = false; savedOnly.checked = false; syncSavedURL(); render(); }
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('input', render);
form.addEventListener('change', render);
openOnly.addEventListener('change', render);
savedOnly.addEventListener('change', () => { syncSavedURL(); render(); });
window.addEventListener('odyssey:shortlist', () => {
  if (!savedOnly.checked) return;
  const buttons = [...container.querySelectorAll('.save-event')];
  const focusedIndex = buttons.indexOf(document.activeElement);
  render();
  if (focusedIndex >= 0) {
    const next = [...container.querySelectorAll('.save-event')];
    (next[Math.min(focusedIndex, next.length - 1)] || savedOnly).focus();
  }
});
document.querySelector('#reset-filters').addEventListener('click', reset);

async function load() {
  loaded = false; showLoading(container, 6); status.textContent = 'Loading the lineup…';
  try {
    events = await getEvents(); loaded = true;
    const previous = category.value;
    category.replaceChildren(new Option('All categories', ''));
    [...new Set(events.map(event => event.category).filter(Boolean))].sort().forEach(value => { const option = el('option', '', value); option.value = value; category.append(option); });
    if ([...category.options].some(option => option.value === previous)) category.value = previous;
    render();
  } catch (error) {
    showState(container, 'A little interruption.', error.message, load);
    status.textContent = 'Events could not be loaded.';
  }
}
load();

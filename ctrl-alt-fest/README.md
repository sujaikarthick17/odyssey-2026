# Odyssey

A buildless, responsive festival website for Odyssey, presented by Core Lab at Amrita Vishwa Vidyapeetham, 20–23 October 2026. Warm ivory, ink and restrained orange accents accompany an interactive crown-themed deck and Render72 test-API integration. No framework, API key, installation or build step is required.

## Hosting

- Vercel: import the repository with its root directory set to the repository root and the framework set to Other. The root `vercel.json` publishes `ctrl-alt-fest/` as the website, so `/` serves the homepage and `/events.html` serves the lineup. No build or install command is needed.
- GitHub Pages: select **GitHub Actions** as the Pages source in repository settings. `.github/workflows/pages.yml` tests and publishes `ctrl-alt-fest/` whenever `main` changes. The site's relative links also work under a repository URL such as `/odyssey-2026/`.

## Lightweight visitor features

- Both pages use Odyssey branding and navigation to the event lineup, visit information and saved events.
- “Plan your visit” shows the supplied dates, institution and organizer. Campus, venue, daily timings, entry requirements and organizer contact remain explicitly unconfirmed.
- Save buttons on cards and in event details keep event IDs in `localStorage` under `odyssey.shortlist.v1`. The saved-only view is available at `events.html?saved=1` and combines with existing filters. Saving is not registration.
- Shortlists persist in the same browser and origin, synchronize between tabs, and can be removed one event at a time. If storage is blocked or full, an explanation is announced and the selection lasts only for the current page visit. No account or server-side storage is used.
- Demo event dates are assigned consistently by event ID across 20–23 October 2026. Cards, details, schedule rows and date sorting share this presentation schedule; API records and event IDs remain unchanged. Multi-day spans are retained where they fit and clipped at 23 October. Registration deadlines shift by the same date offset and are capped at the assigned start day's end in IST; source registration/status values remain unchanged. Visible notices identify the schedule as a preview awaiting confirmation.
- API and shortlist checks: `node --test tests/api.test.mjs tests/shortlist.test.mjs`. Browser checks cover saving, reload persistence, the saved-only view, event details, removal, empty state and focus recovery.

The provided brief began with API requirements, followed by sections 7–12. The visual identity and introductory copy are original design choices, not claims about an official festival. Event content is fetched from the supplied public **test** API; it is not production registration data.

## Files

```text
ctrl-alt-fest/
  index.html                 Homepage, featured events, introduction
  events.html                Searchable/filterable full event lineup
  css/
    style.css                Layout, responsive styles, motion, dialog styling
  js/
    api.js                   Fetching, timeout/errors, normalization, formatting
    main.js                  Shared cards/dialog and homepage loading
    events.js                Search, filters, sort, lineup states
    shortlist.js             Small browser-local saved-event store
  assets/
    images/
      favicon.svg            Original arrow favicon
  tests/
    api.test.mjs             Dependency-free API edge-case tests
    shortlist.test.mjs       Persistence, invalid data and unavailable storage
  README.md
```

Hero artwork is CSS, so it needs no bitmap download. Event photos use the API's image URLs and alt text. Failed images receive a placeholder. Google Fonts provides Barlow Condensed and DM Sans with system fallbacks and `display=swap`.

## Open in VS Code and run with Live Server

1. In VS Code choose **File → Open Folder** and select `D:\render72 fest1\ctrl-alt-fest`.
2. In Extensions, install **Live Server** by Ritwick Dey if needed.
3. Right-click `index.html` and choose **Open with Live Server**.
4. Use the navigation or open `http://127.0.0.1:5500/events.html` (use the port Live Server actually reports).

Serve the folder over HTTP. Double-clicking HTML to open a `file://` URL can prevent ES modules from loading. Both pages need internet access for live data; no fake events are substituted when offline.

## How the supplied API works

- Base: `https://render72.pages.dev/api/test`
- `GET /events` returns `{ "events": [...] }`.
- `GET /events/{id}` returns `{ "event": { ... } }`.
- Both are public and require no authentication.
- On 14 October 2026, a live list request returned HTTP 200 with 30 events and `Access-Control-Allow-Origin: *`.
- A live detail request for `4819d0b0-4b31-527d-ab30-44cf58ed3b11` returned the full TrackTact event successfully.

The homepage fetches the list and displays up to three API-featured entries (falling back to the first three real entries if no events are featured). The events page fetches the list independently; searches, category/format/open-registration filters and sorting then run locally. Opening any event always fetches its full details using its unchanged ID, encoded only as a URL path segment.

`api.js` maps `name → title`, `cover_image_url → image`, `cover_image_alt → imageAlt`, `is_featured → featured`, `min_teamsize/max_teamsize → minTeam/maxTeam`, and retains the relevant schedule, FAQ and contact information. Missing optional fields are omitted, zero-price events remain free, invalid dates are not displayed, and malformed items without an ID are skipped. API content is inserted using `textContent`, and external links accept only HTTP(S).

The sampled API does **not** supply a currency field or registration URL. Prices therefore show the supplied numeric amount and per-person/per-team unit without an invented currency symbol; detail panels explain that currency is unspecified. Contacts and descriptions can contain sample information. Confirm real arrangements with the organizer before using this as a production festival site.

If the API later supplies a `registration_url`, a link is shown only when registration is `OPEN`, the event is not closed/completed/cancelled, and the supplied deadline has not expired. This site never submits a registration or claims success. No URL is synthesized. The registration filter uses the same status/deadline checks. The reported API status itself remains visible even if its deadline has passed.

Requests time out after 12 seconds. HTTP errors, invalid response JSON, unexpected structures, network failures and missing detail records produce honest error states with retry controls. No stale or fabricated event cache is used.

## Test both pages

### Homepage

1. Open `index.html` through Live Server. Confirm a skeleton is replaced by real featured events.
2. Follow each lineup link and confirm it opens `events.html`.
3. Open an event. Confirm its title, description, dates, venue, price, team size, rules, FAQ and coordinators match the detail response in the browser Network panel.
4. Expand an FAQ using the keyboard. Press Escape to close the dialog and confirm focus returns to the event button. Reopen and use the close button; test Tab/Shift+Tab stay inside the native modal.

### Events page

1. Open `events.html` directly and confirm the result count matches the list response.
2. Search `robotics`, select a category or workshop format, change sorting and toggle **Registration open**. Filters combine.
3. Search an impossible string to see the empty-result message. Use **Clear filters** or **Reset filters** to restore results.
4. Open different event cards and verify each request contains that event's original ID. Close a dialog while loading and confirm late responses do not reopen it.

### Failure, layout and accessibility checks

- DevTools → Network → Offline; reload either page. Confirm the error state and retry button. Restore networking and retry.
- Use DevTools request blocking for a detail request and separately an image request. Confirm the dialog error and image placeholder. Use a throttled connection to inspect skeletons and the 12-second timeout.
- Inspect widths of **360, 768, 1024 and 1440 px**, plus 200% zoom. Check horizontal overflow, long titles, filters and dialog scrolling.
- Test keyboard navigation, visible focus, skip link, dialog focus return and screen-reader announcements on both pages.
- Emulate `prefers-reduced-motion: reduce`; marquee, reveal and hover animations should stop.
- Run Lighthouse for each page using a clean browser profile. Do not assume scores; external fonts, image providers and API response times affect them.

## Automated checks

With Node.js 22 or newer, from the project folder:

```powershell
node --check js/api.js
node --check js/main.js
node --check js/events.js
node --test tests/api.test.mjs
```

Tests cover nullable fields, ID preservation, URL rejection, prices, calendar validation, registration availability, list/detail response contracts, ID path encoding, empty data, HTTP 404/503, malformed JSON, network failure and timeout. Test responses are isolated to the test runner; the website never loads them.

## Verification and remaining work

- Verified: live list and one real detail API response, CORS header, JavaScript syntax, and automated API edge cases.
- Browser QA: homepage inspected at 390, 768 and 1440 px; lineup inspected at 390 and 1440 px. No horizontal page overflow at those widths. Live events and images loaded, and deck flip/shuffle controls worked. Full keyboard, failure-state and Lighthouse checks remain manual.
- Obtain the organizer's confirmed currency, real registration URLs and production endpoint before a production launch.
- Deployed on [Vercel](https://render72-fest1.vercel.app/) and [GitHub Pages](https://sujaikarthick17.github.io/odyssey-2026/). See the [repository README](../README.md) for live links, setup, and hosting configuration.

## Royal edition layout

The homepage uses suit-based discovery links, an asymmetric featured lineup, a crown manifesto, and a closing invitation. The lineup has a desktop filter sidebar and a mobile filter grid. Suit links support `?q=music` and `?type=WORKSHOP` to initialize the filters.

Visual overrides and deck motion live in `css/royal.css` and `js/royal.js`. Motion respects the reduced-motion preference.

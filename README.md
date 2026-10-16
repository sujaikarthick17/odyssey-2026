# ODYSSEY 2026

**Ithaka awaits.**

A responsive college festival website for **Odyssey**, presented by **Core Lab** at **Amrita Vishwa Vidyapeetham**, with festival dates of **20–23 October 2026**. The design pairs oversized typography, a cream-and-black palette, orange accents, and an interactive playing-card deck.

## Live website

| Host | Website |
| --- | --- |
| Vercel | [render72-fest1.vercel.app](https://render72-fest1.vercel.app/) |
| GitHub Pages | [sujaikarthick17.github.io/odyssey-2026](https://sujaikarthick17.github.io/odyssey-2026/) |

## Features

- Responsive homepage with festival information, suit-based discovery, featured events, and visitor essentials.
- Interactive royal card deck with shuffle, flip, and pointer tilt controls.
- Searchable event lineup with category, format, registration, and sorting controls.
- Event detail dialogs with schedules, team requirements, rules, FAQs, and organizer contacts when supplied.
- Saved-event shortlist stored in the browser, with a dedicated saved-only view.
- Loading, empty, and error states with retry controls.
- Keyboard navigation, visible focus indicators, accessible dialogs, and reduced-motion support.

## Built with

HTML5, CSS3, and vanilla JavaScript ES modules. Event data comes from the Render72 test API. Shortlists use `localStorage`, and automated checks use Node.js's built-in test runner.

**No framework, dependency installation, or build step is required.**

## Run locally

```sh
git clone https://github.com/sujaikarthick17/odyssey-2026.git
cd odyssey-2026/ctrl-alt-fest
```

Open this folder in VS Code and use **Live Server** to serve `index.html`. Open `events.html` through the site's lineup navigation.

Serve the site over HTTP rather than opening the HTML file directly: browsers restrict ES modules on `file://` URLs. An internet connection is needed for API data, external fonts, and event photos.

## Project structure

```text
odyssey-2026/
├── README.md
├── vercel.json                    # Static-site deployment configuration
├── .github/workflows/pages.yml    # GitHub Pages deployment workflow
└── ctrl-alt-fest/
    ├── index.html                # Festival homepage
    ├── events.html               # Event lineup and filters
    ├── css/
    │   ├── style.css             # Shared layout and components
    │   └── royal.css             # Festival visual identity
    ├── js/
    │   ├── api.js                # API requests and data normalization
    │   ├── main.js               # Event cards, dialogs, and homepage
    │   ├── events.js             # Search, filters, and sorting
    │   ├── shortlist.js          # Browser-local saved events
    │   └── royal.js              # Deck interaction and motion
    ├── assets/images/            # Crown artwork and favicon
    ├── tests/                    # API and shortlist tests
    └── README.md                 # Detailed implementation and QA notes
```

## Tests

With **Node.js 22 or newer**, run these commands from the repository root:

```sh
node --test ctrl-alt-fest/tests/api.test.mjs ctrl-alt-fest/tests/shortlist.test.mjs
node --check ctrl-alt-fest/js/api.js
node --check ctrl-alt-fest/js/main.js
node --check ctrl-alt-fest/js/events.js
node --check ctrl-alt-fest/js/royal.js
```

The tests cover API normalization and errors, date handling, registration availability, shortlist persistence, unavailable storage, and synchronization between tabs.

## Deployment

- **Vercel:** the root `vercel.json` publishes `ctrl-alt-fest/`. The repository root is the project root, with no install or build command.
- **GitHub Pages:** `.github/workflows/pages.yml` runs the tests and deploys `ctrl-alt-fest/` on pushes to `main`. Pages uses **GitHub Actions** as its source.
- Relative asset and page links support both the Vercel domain root and GitHub Pages' `/odyssey-2026/` path.

## Event data

This project uses the public **Render72 test API** at `https://render72.pages.dev/api/test`. Event listings and their displayed festival schedule are **demo content**, not a confirmed festival programme. Entry details, currency, venues, and registration links require organizer confirmation. Saving an event creates a local shortlist entry; it does not register a participant.

See the [detailed project notes](ctrl-alt-fest/README.md) for API behavior and manual verification steps.

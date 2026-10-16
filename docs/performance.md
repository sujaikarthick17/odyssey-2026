# Mobile performance

Measured against the live Vercel homepage on **16 October 2026**, using **Lighthouse 13.5.0** with its standard simulated mobile settings: 150 ms RTT, approximately 1.6 Mbps throughput, and 4× CPU slowdown. Both runs used the same machine and settings.

| Metric | Before | After |
| --- | --- | --- |
| Performance | 63 | **99** |
| First Contentful Paint | 3.4 s | **1.4 s** |
| Largest Contentful Paint | 8.2 s | **1.9 s** |
| Speed Index | 6.3 s | **2.6 s** |
| Total Blocking Time | 10 ms | **0 ms** |
| Cumulative Layout Shift | 0 | **0** |

The optimized audit also scored **100 for accessibility, best practices, and SEO**. These are lab measurements; PageSpeed Insights results can vary with test location, network conditions, and run timing.

## Changes

- Replaced the 845,529-byte crown PNG used on the homepage with a 21,640-byte, 512×512 WebP, retaining the original PNG as the source asset.
- Hosted the existing fonts as local WOFF2 files, including their SIL Open Font License notices in `ctrl-alt-fest/assets/fonts/`.
- Preloaded the homepage's critical fonts and crown image, removing the Google Fonts stylesheet and font-server round trips.
- Added module preload hints for shared JavaScript dependencies.
- Reserved featured-card space immediately and deferred the homepage's event API request until the section is within 600 px of the viewport. The lineup page still loads its events immediately.

## Functional checks

- All 11 API and shortlist tests passed.
- Mobile browser checks passed for the original title font, responsive layout, crown rendering, deck flip/shuffle, featured loading on scroll, saving an event, and the 30-event lineup.
- No JavaScript runtime errors or mobile horizontal overflow were observed.
- The homepage made no external network requests during its initial viewport load.

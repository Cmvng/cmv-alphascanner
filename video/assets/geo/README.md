Globe assets for the review page's `gl_*` screens (the "Follow the Sun" analysis, first used 7 Oct 2026).
- d3-geo 3.1.1 and d3-array 3.2.4 (ISC licence, Mike Bostock), topojson-client 3.1.0 (ISC): from cdn.jsdelivr.net.
- Land (1:50m) and country borders (1:110m) from world-atlas 2.0.2 (ISC), built from Natural Earth (public domain),
  wrapped as `window.WORLD_LAND50` / `window.WORLD_COUNTRIES110` so the page can load them from disk without fetch().

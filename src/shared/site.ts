// TEMPORARY shim, added during Task 8.
//
// Task 8 deletes this file's original content (the pre-Overgrowth chrome script) per its
// brief, but `projects.html` and `music.html` still load it via
// `<script type="module" src="/src/shared/site.ts">`, and Vite's multi-page build
// (see vite.config.ts `rollupOptions.input`) resolves that as a real module graph edge,
// not a soft runtime reference — so the build hard-fails without a file at this path,
// unlike the `/src/styles/site.css` reference from the same two pages, which only warns.
//
// This is a placeholder only. It intentionally does nothing. Plan 2/3 rewire
// projects.html and music.html onto src/shared/chrome.ts and remove this script tag —
// delete this file at that point.
export {};

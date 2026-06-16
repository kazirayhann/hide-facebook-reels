# Hide Facebook Reels

A small Chrome extension that hides Facebook Reels sections in the feed, hides the Reels tab/link from Facebook navigation, blocks Reels page navigation, and removes Sponsored sidebar sections.

## Random redirect URLs

Edit [redirect-config.js](redirect-config.js) and replace the dummy URLs:

```js
globalThis.HFR_REDIRECT_URLS = [
  "https://example.com/",
  "https://www.wikipedia.org/",
  "https://news.ycombinator.com/",
  "https://developer.chrome.com/docs/extensions/",
  "https://www.google.com/search?q=focus"
];
```

When a Facebook Reels URL opens, the extension blocks it and opens one random URL from this list.

## Focus lock

Edit [redirect-config.js](redirect-config.js) to control the timed focus reminder:

```js
globalThis.HFR_FOCUS_CHECK_MINUTES = 15;
globalThis.HFR_FOCUS_COOLDOWN_MINUTES = 20;
globalThis.HFR_FOCUS_LOCK_SECONDS = 60;
globalThis.HFR_FOCUS_TARGETS = [
  "facebook.com",
  "youtube.com",
  "youtu.be"
];
globalThis.HFR_FOCUS_MEDIA_URLS = [
  "https://youtu.be/iC-2t-FEbvk?si=HFHhChO8FPSWI_mQ"
];
```

Every check interval, the extension looks for active Facebook or YouTube tabs. If one is active and the cooldown has passed, it opens a focus reminder page with one random media URL and unlocks the return button after the configured seconds.

## Install locally

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the folder:


5. Open or refresh `https://www.facebook.com`.

The extension runs at `document_start`, so it starts hiding Reels, Sponsored sections, and blocking Reels navigation as soon as Facebook begins loading. The focus lock runs from the background service worker using Chrome alarms.

## Files

- `manifest.json`: Chrome extension manifest.
- `redirect-config.js`: Dummy URLs used for random Reels redirects.
- `background.js`: Blocks direct Reels page navigation.
- `focus-lock.html`: Reminder page shown after repeated Facebook or YouTube usage.
- `styles.css`: Early CSS rules for obvious Reels links.
- `content.js`: Dynamic cleanup for Facebook's changing feed, navigation DOM, and Sponsored sidebar.

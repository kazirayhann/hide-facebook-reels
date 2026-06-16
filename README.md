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

## Install locally

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the folder:


5. Open or refresh `https://www.facebook.com`.

The extension runs at `document_start`, so it starts hiding Reels, Sponsored sections, and blocking Reels navigation as soon as Facebook begins loading.

## Files

- `manifest.json`: Chrome extension manifest.
- `redirect-config.js`: Dummy URLs used for random Reels redirects.
- `background.js`: Blocks direct Reels page navigation.
- `styles.css`: Early CSS rules for obvious Reels links.
- `content.js`: Dynamic cleanup for Facebook's changing feed, navigation DOM, and Sponsored sidebar.

# Hide Facebook Reels

A small Chrome extension that hides Facebook Reels sections in the feed, hides the Reels tab/link from Facebook navigation, and locks feed photos/videos behind a `Locked` message.

## Install locally

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the folder:


5. Open or refresh `https://www.facebook.com`.

The extension runs at `document_start`, so it starts hiding Reels as soon as Facebook begins loading. Feed media is locked dynamically because Facebook renders posts after the first page load.

## Files

- `manifest.json`: Chrome extension manifest.
- `styles.css`: Early CSS rules for obvious Reels links.
- `content.js`: Dynamic cleanup for Facebook's changing feed, navigation DOM, and feed media.



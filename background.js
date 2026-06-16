importScripts("redirect-config.js");

const REELS_PAGE_URL = /^https:\/\/(?:www\.)?facebook\.com\/reels?(?:\/|\?|$)/i;

function getRedirectUrl() {
  const urls = Array.isArray(globalThis.HFR_REDIRECT_URLS)
    ? globalThis.HFR_REDIRECT_URLS.filter(Boolean)
    : [];

  if (urls.length === 0) {
    return "https://www.facebook.com/";
  }

  return urls[Math.floor(Math.random() * urls.length)];
}

function closeOriginalTab(tabId) {
  if (typeof tabId !== "number" || tabId < 0) {
    return;
  }

  chrome.tabs.remove(tabId, () => {
    if (!chrome.runtime.lastError) {
      return;
    }

    chrome.tabs.update(tabId, { url: getRedirectUrl() });
  });
}

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0 || !REELS_PAGE_URL.test(details.url)) {
    return;
  }

  chrome.tabs.create({ url: getRedirectUrl(), active: true }, () => {
    closeOriginalTab(details.tabId);
  });
});

importScripts("redirect-config.js");

const REELS_PAGE_URL = /^https:\/\/(?:www\.)?facebook\.com\/reels?(?:\/|\?|$)/i;
const FOCUS_ALARM_NAME = "hfr-focus-check";
let lastFocusLockAt = 0;
let focusLockUntil = 0;

function getPositiveNumberConfig(name) {
  const value = Number(globalThis[name]);

  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getRedirectUrl() {
  const urls = Array.isArray(globalThis.HFR_REDIRECT_URLS)
    ? globalThis.HFR_REDIRECT_URLS.filter(Boolean)
    : [];

  if (urls.length === 0) {
    return "https://www.facebook.com/";
  }

  return urls[Math.floor(Math.random() * urls.length)];
}

function getFocusMediaUrl() {
  const urls = Array.isArray(globalThis.HFR_FOCUS_MEDIA_URLS)
    ? globalThis.HFR_FOCUS_MEDIA_URLS.filter(Boolean)
    : [];

  if (urls.length > 0) {
    return urls[Math.floor(Math.random() * urls.length)];
  }

  return getRedirectUrl();
}

function isFocusTargetUrl(url) {
  if (!url || url.startsWith(chrome.runtime.getURL(""))) {
    return false;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch (_error) {
    return false;
  }

  const targets = Array.isArray(globalThis.HFR_FOCUS_TARGETS)
    ? globalThis.HFR_FOCUS_TARGETS
    : [];

  return targets.some((target) => (
    parsedUrl.hostname === target ||
    parsedUrl.hostname.endsWith(`.${target}`)
  ));
}

function getLockPageUrl(tabUrl) {
  const params = new URLSearchParams({
    media: getFocusMediaUrl(),
    returnUrl: tabUrl || "https://www.google.com/"
  });

  return chrome.runtime.getURL(`focus-lock.html?${params.toString()}`);
}

function getFocusLockMs() {
  const lockSeconds = getPositiveNumberConfig("HFR_FOCUS_LOCK_SECONDS");

  return lockSeconds * 1000;
}

function isFocusLockActive() {
  return Date.now() < focusLockUntil;
}

function shouldFocusLockNow() {
  const cooldownMinutes = getPositiveNumberConfig("HFR_FOCUS_COOLDOWN_MINUTES");

  if (cooldownMinutes === 0) {
    return false;
  }

  const cooldownMs = cooldownMinutes * 60 * 1000;

  return Date.now() - lastFocusLockAt >= cooldownMs;
}

async function runFocusCheck() {
  if (!shouldFocusLockNow()) {
    return;
  }

  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  });
  const targetTab = tabs.find((tab) => isFocusTargetUrl(tab.url));

  if (!targetTab || typeof targetTab.id !== "number") {
    return;
  }

  lastFocusLockAt = Date.now();
  focusLockUntil = Date.now() + getFocusLockMs();
  await chrome.tabs.update(targetTab.id, {
    active: true,
    url: getLockPageUrl(targetTab.url)
  });
}

function blockFocusTargetDuringLock(tabId, url) {
  if (!isFocusLockActive() || !isFocusTargetUrl(url)) {
    return false;
  }

  chrome.tabs.update(tabId, {
    active: true,
    url: getLockPageUrl(url)
  });

  return true;
}

async function setupFocusAlarm() {
  const periodInMinutes = getPositiveNumberConfig("HFR_FOCUS_CHECK_MINUTES");

  if (periodInMinutes === 0) {
    await chrome.alarms.clear(FOCUS_ALARM_NAME);
    return;
  }

  const existingAlarm = await chrome.alarms.get(FOCUS_ALARM_NAME);
  const earliestNextRun = Date.now() + ((periodInMinutes - 0.1) * 60 * 1000);

  if (
    existingAlarm &&
    existingAlarm.periodInMinutes === periodInMinutes &&
    existingAlarm.scheduledTime >= earliestNextRun
  ) {
    return;
  }

  await chrome.alarms.clear(FOCUS_ALARM_NAME);
  chrome.alarms.create(FOCUS_ALARM_NAME, {
    delayInMinutes: periodInMinutes,
    periodInMinutes
  });
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
  if (details.frameId === 0 && blockFocusTargetDuringLock(details.tabId, details.url)) {
    return;
  }

  if (details.frameId !== 0 || !REELS_PAGE_URL.test(details.url)) {
    return;
  }

  chrome.tabs.create({ url: getRedirectUrl(), active: true }, () => {
    closeOriginalTab(details.tabId);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    blockFocusTargetDuringLock(tabId, changeInfo.url);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === "HFR_FOCUS_UNLOCKED") {
    focusLockUntil = 0;
  }
});

chrome.runtime.onInstalled.addListener(setupFocusAlarm);
chrome.runtime.onStartup.addListener(setupFocusAlarm);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === FOCUS_ALARM_NAME) {
    runFocusCheck();
  }
});

setupFocusAlarm();

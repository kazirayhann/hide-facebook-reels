(function () {
  "use strict";

  const HIDDEN_CLASS = "hfr-hidden";
  const REELS_TEXT = /\breels?\b/i;
  const SPONSORED_TEXT = /^\s*sponsored\s*$/i;
  const BIRTHDAYS_TEXT = /\bbirthdays\b/i;
  const REELS_URL = /\/reels?(?:\/|\?|$)/i;
  const REELS_PAGE_URL = /^https:\/\/(?:www\.)?facebook\.com\/reels?(?:\/|\?|$)/i;
  const MAX_TEXT_LENGTH = 1200;
  let lastSeenUrl = window.location.href;

  function getRedirectUrl() {
    const urls = Array.isArray(globalThis.HFR_REDIRECT_URLS)
      ? globalThis.HFR_REDIRECT_URLS.filter(Boolean)
      : [];

    if (urls.length === 0) {
      return "https://www.facebook.com/";
    }

    return urls[Math.floor(Math.random() * urls.length)];
  }

  function blockCurrentReelsPage() {
    if (REELS_PAGE_URL.test(window.location.href)) {
      window.location.replace(getRedirectUrl());
    }
  }

  function checkForReelsRoute() {
    if (window.location.href !== lastSeenUrl) {
      lastSeenUrl = window.location.href;
      blockCurrentReelsPage();
    }
  }

  function patchHistoryNavigation() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      queueMicrotask(checkForReelsRoute);
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      queueMicrotask(checkForReelsRoute);
      return result;
    };
  }

  function blockReelsClick(event) {
    const link = event.target && event.target.closest
      ? event.target.closest('a[href*="/reel"], a[href*="/reels"]')
      : null;

    if (!link) {
      setTimeout(checkForReelsRoute, 0);
      setTimeout(checkForReelsRoute, 250);
      setTimeout(checkForReelsRoute, 1000);
      return;
    }

    const url = new URL(link.getAttribute("href"), window.location.origin);

    if (!REELS_PAGE_URL.test(url.href)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    window.open(getRedirectUrl(), "_blank", "noopener,noreferrer");
  }

  function normalizeText(value) {
    return value
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function textOf(node) {
    return normalizeText(node.innerText || node.textContent || "");
  }

  function isReelsNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const ariaLabel = node.getAttribute("aria-label") || "";
    const href = node.getAttribute("href") || "";
    const role = node.getAttribute("role") || "";
    const text = textOf(node);

    return (
      REELS_TEXT.test(ariaLabel) ||
      REELS_URL.test(href) ||
      (role === "tab" && REELS_TEXT.test(text)) ||
      (text.length > 0 && text.length < MAX_TEXT_LENGTH && REELS_TEXT.test(text))
    );
  }

  function hide(node) {
    if (node && node.classList && !node.classList.contains(HIDDEN_CLASS)) {
      node.classList.add(HIDDEN_CLASS);
    }
  }

  function closestVisibleContainer(node, selectors) {
    for (const selector of selectors) {
      const match = node.closest(selector);
      if (match) {
        return match;
      }
    }

    return null;
  }

  function findSingleNavSlot(node) {
    const navRoot = node.closest('[role="navigation"], [role="tablist"]');

    if (!navRoot) {
      return null;
    }

    let current = node.closest('[role="tab"], a[href], [aria-label*="Reel"], [aria-label*="reel"]') || node;
    let best = current;

    while (current.parentElement && current.parentElement !== navRoot) {
      const parent = current.parentElement;
      const linksAndTabs = parent.querySelectorAll('a[href], [role="tab"]').length;
      const text = textOf(parent);

      if (linksAndTabs <= 1 && text.length < 120) {
        best = parent;
      }

      current = parent;
    }

    return best;
  }

  function hideReelsTab(node) {
    const navSlot = findSingleNavSlot(node);
    const navItem = navSlot || closestVisibleContainer(node, [
      '[role="tab"]',
      '[role="listitem"]',
      'a[role="link"]',
      "a",
      "li"
    ]);

    hide(navItem || node);
  }

  function hideReelsFeedSection(node) {
    const feedContainer = closestVisibleContainer(node, [
      '[role="feed"] > div',
      '[data-pagelet^="FeedUnit"]',
      '[data-pagelet*="FeedUnit"]',
      '[aria-posinset]',
      "article"
    ]);

    hide(feedContainer || node);
  }

  function hideSponsoredSection(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const candidates = [];

    if (SPONSORED_TEXT.test(textOf(root))) {
      candidates.push(root);
    }

    root.querySelectorAll("span, h2, h3, div[role='heading']").forEach((node) => {
      if (SPONSORED_TEXT.test(textOf(node))) {
        candidates.push(node);
      }
    });

    root.querySelectorAll('[aria-label*="sponsored content"], [aria-label*="Sponsored content"]').forEach((node) => {
      candidates.push(node);
    });

    for (const node of candidates) {
      const section = findSponsoredSidebarBlock(node);

      hide(section || node);
    }
  }

  function hasSponsoredAdMarker(node) {
    return Boolean(
      node.querySelector(
        [
          'a[rel*="nofollow"]',
          'a[href*="utm_source=fb"]',
          'a[href*="fbclid="]',
          '[aria-label*="sponsored content"]',
          '[aria-label*="Sponsored content"]'
        ].join(",")
      )
    );
  }

  function startsWithSponsored(node) {
    return /^sponsored\b/i.test(textOf(node));
  }

  function containsBirthdays(node) {
    return BIRTHDAYS_TEXT.test(textOf(node));
  }

  function findSponsoredAdCard(node) {
    const link = node.closest('a[rel*="nofollow"], a[href*="utm_source=fb"], a[href*="fbclid="]');
    const menu = node.closest('[aria-label*="sponsored content"], [aria-label*="Sponsored content"]');
    let current = link || menu || node;
    let best = null;

    while (current && current !== document.body) {
      if (current.getAttribute && current.getAttribute("role") === "complementary") {
        break;
      }

      if (
        current.closest('[role="complementary"]') &&
        hasSponsoredAdMarker(current) &&
        !containsBirthdays(current)
      ) {
        best = current;
      }

      current = current.parentElement;
    }

    return best;
  }

  function findSponsoredSidebarBlock(node) {
    const adCard = findSponsoredAdCard(node);

    if (adCard && !SPONSORED_TEXT.test(textOf(node))) {
      return adCard;
    }

    let current = node;

    while (current && current !== document.body) {
      if (current.getAttribute && current.getAttribute("role") === "complementary") {
        break;
      }

      if (
        current.parentElement &&
        current.closest('[role="complementary"]') &&
        startsWithSponsored(current) &&
        hasSponsoredAdMarker(current) &&
        !containsBirthdays(current)
      ) {
        return current;
      }

      current = current.parentElement;
    }

    return adCard;
  }

  function hideMatchingNodes(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const candidates = [];

    if (isReelsNode(root)) {
      candidates.push(root);
    }

    root
      .querySelectorAll(
        [
          'a[href*="/reel"]',
          'a[href*="/reels"]',
          '[aria-label*="Reel"]',
          '[aria-label*="reel"]',
          '[role="tab"]',
          '[role="feed"] span',
          '[data-pagelet^="FeedUnit"] span',
          "article span"
        ].join(",")
      )
      .forEach((node) => {
        if (isReelsNode(node)) {
          candidates.push(node);
        }
      });

    for (const node of candidates) {
      const href = node.getAttribute("href") || "";
      const role = node.getAttribute("role") || "";
      const inNav = Boolean(node.closest('[role="navigation"], [role="tablist"]'));
      const inFeed = Boolean(node.closest('[role="feed"], [data-pagelet^="FeedUnit"], article'));

      if (REELS_URL.test(href) || role === "tab" || inNav) {
        hideReelsTab(node);
      }

      if (inFeed) {
        hideReelsFeedSection(node);
      }
    }
  }

  function run() {
    blockCurrentReelsPage();

    if (document.documentElement) {
      hideMatchingNodes(document.documentElement);
      hideSponsoredSection(document.documentElement);
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        hideMatchingNodes(node);
        hideSponsoredSection(node);
      }
    }
  });

  function start() {
    run();

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  }

  window.addEventListener("click", blockReelsClick, true);
  window.addEventListener("auxclick", blockReelsClick, true);
  window.addEventListener("popstate", checkForReelsRoute);
  window.addEventListener("hashchange", checkForReelsRoute);

  patchHistoryNavigation();
  start();
})();

(function () {
  "use strict";

  const HIDDEN_CLASS = "hfr-hidden";
  const LOCKED_CLASS = "hfr-media-locked";
  const LOCK_MESSAGE_CLASS = "hfr-lock-message";
  const REELS_TEXT = /\breels?\b/i;
  const REELS_URL = /\/reels?(?:\/|\?|$)/i;
  const MAX_TEXT_LENGTH = 1200;

  function textOf(node) {
    return (node.innerText || node.textContent || "").trim();
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

  function hideReelsTab(node) {
    const navItem = closestVisibleContainer(node, [
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

  function isFeedMedia(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const tagName = node.tagName.toLowerCase();
    const inFeed = Boolean(node.closest('[role="feed"], [data-pagelet^="FeedUnit"], article'));
    const inStoryTray = Boolean(node.closest('[aria-label*="Stories"], [data-pagelet*="Stories"]'));
    const inComposer = Boolean(node.closest('[role="textbox"], form, [aria-label*="Create"]'));

    return (
      inFeed &&
      !inStoryTray &&
      !inComposer &&
      (tagName === "img" || tagName === "video")
    );
  }

  function lockMedia(node) {
    if (!isFeedMedia(node) || node.closest(`.${LOCKED_CLASS}`)) {
      return;
    }

    const mediaLink = node.closest('a[href], [role="button"]') || node;
    const mediaContainer = closestVisibleContainer(mediaLink, [
      '[data-visualcompletion="media-vc-image"]',
      '[data-pagelet^="FeedUnit"] a[href]',
      'a[href]',
      '[role="button"]',
      "div"
    ]);

    if (!mediaContainer || mediaContainer.classList.contains(LOCKED_CLASS)) {
      return;
    }

    mediaContainer.classList.add(LOCKED_CLASS);
    mediaContainer.setAttribute("aria-label", "Locked media");

    const message = document.createElement("div");
    message.className = LOCK_MESSAGE_CLASS;
    message.setAttribute("aria-hidden", "true");
    message.textContent = "Locked";
    mediaContainer.appendChild(message);
  }

  function lockFeedMedia(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    if (isFeedMedia(root)) {
      lockMedia(root);
    }

    root.querySelectorAll("img, video").forEach(lockMedia);
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
    if (document.documentElement) {
      hideMatchingNodes(document.documentElement);
      lockFeedMedia(document.documentElement);
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        hideMatchingNodes(node);
        lockFeedMedia(node);
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

  start();
})();

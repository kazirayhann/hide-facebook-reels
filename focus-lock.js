(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const mediaUrl = params.get("media") || "";
  const returnUrl = params.get("returnUrl") || "https://www.google.com/";
  const lockSeconds = Number(globalThis.HFR_FOCUS_LOCK_SECONDS) || 60;
  const mediaHost = document.getElementById("mediaHost");
  const openMedia = document.getElementById("openMedia");
  const returnButton = document.getElementById("returnButton");
  const timer = document.getElementById("timer");

  function getYouTubeEmbedUrl(url) {
    let parsedUrl;

    try {
      parsedUrl = new URL(url);
    } catch (_error) {
      return "";
    }

    if (parsedUrl.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${parsedUrl.pathname.slice(1)}?autoplay=1&rel=0`;
    }

    if (parsedUrl.hostname.endsWith("youtube.com") && parsedUrl.searchParams.has("v")) {
      return `https://www.youtube.com/embed/${parsedUrl.searchParams.get("v")}?autoplay=1&rel=0`;
    }

    return "";
  }

  function renderMedia() {
    const youtubeEmbedUrl = getYouTubeEmbedUrl(mediaUrl);

    openMedia.href = mediaUrl || "https://www.youtube.com/results?search_query=dua+beautiful+recitation";

    if (youtubeEmbedUrl) {
      const iframe = document.createElement("iframe");
      iframe.src = youtubeEmbedUrl;
      iframe.title = "Focus reminder video";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      mediaHost.appendChild(iframe);
      return;
    }

    if (/\.(mp3|wav|ogg|m4a)(?:\?|$)/i.test(mediaUrl)) {
      const audio = document.createElement("audio");
      audio.src = mediaUrl;
      audio.controls = true;
      audio.autoplay = true;
      mediaHost.appendChild(audio);
      return;
    }

    if (/\.(mp4|webm|mov)(?:\?|$)/i.test(mediaUrl)) {
      const video = document.createElement("video");
      video.src = mediaUrl;
      video.controls = true;
      video.autoplay = true;
      mediaHost.appendChild(video);
      return;
    }

    const link = document.createElement("a");
    link.className = "fallback-link";
    link.href = openMedia.href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open the selected reminder on YouTube";
    mediaHost.appendChild(link);
  }

  function startTimer() {
    let remaining = lockSeconds;

    function tick() {
      if (remaining <= 0) {
        timer.textContent = "You can return now.";
        returnButton.disabled = false;
        chrome.runtime.sendMessage({ type: "HFR_FOCUS_UNLOCKED" });
        return;
      }

      timer.textContent = `Return unlocks in ${remaining} seconds.`;
      remaining -= 1;
      setTimeout(tick, 1000);
    }

    tick();
  }

  returnButton.addEventListener("click", () => {
    window.location.href = returnUrl;
  });

  renderMedia();
  startTimer();
})();

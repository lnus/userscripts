// ==UserScript==
// @name        LSF Mirror Player
// @namespace   lnus.github.io
// @match       https://www.reddit.com/r/LivestreamFail/*
// @grant       GM_xmlhttpRequest
// @description Embeds Arazu mirrors on LSF, makes viewing better
// @author      lnus
// @version     0.1.1
// @lastModified 2025-01-17
// @tags video, reddit, livestreamfail, player
// ==/UserScript==
(function () {
  "use strict";

  const BOT_USERNAME = "LSFSecondaryMirror";
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  async function fetchWithRetry(url, retries = MAX_RETRIES) {
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(url, retries - 1);
      }
      throw error;
    }
  }

  function throttleRAF(func) {
    let rafId = null;
    return function (...args) {
      if (rafId) return; // Skip if frame is already scheduled

      rafId = requestAnimationFrame(() => {
        func.apply(this, args);
        rafId = null;
      });
    };
  }

  // URL sanitization
  function isSafeUrl(url) {
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname === "arazu.io" || parsed.hostname.endsWith(".arazu.io")
      );
    } catch (e) {
      return false;
    }
  }

  function findMirrorLink(commentThread) {
    const pinnedComment = commentThread.querySelector(".stickied");
    if (!pinnedComment) return null;

    const author = pinnedComment.querySelector(".author")?.textContent;
    if (author !== BOT_USERNAME) return null;

    const mirrorLink = pinnedComment.querySelector('a[href*="arazu.io"]');
    const href = mirrorLink?.href;
    return isSafeUrl(href) ? href : null;
  }

  function createFloatingPlayer(videoUrl, postTitle = "LSF Mirror") {
    // Inject CSS for drag prevention
    const style = document.createElement("style");
    style.textContent = `
.lsf-player-dragging * {
user-select: none !important;
-webkit-user-select: none !important;
}
`;
    document.head.appendChild(style);

    // Create the container
    const player = document.createElement("div");
    player.style.cssText = `
position: fixed;
width: 320px;
min-width: 200px;
background: #000;
border: 2px solid #333;
border-radius: 4px;
z-index: 999999;
top: 20px;
left: 20px;
user-select: none;
-webkit-user-select: none;
`;

    // Create header for the player
    const header = document.createElement("div");
    header.style.cssText = `
background: #333;
padding: 8px;
cursor: move;
color: white;
display: flex;
justify-content: space-between;
align-items: center;
`;

    const title = document.createElement("span");
    title.style.cssText = `
pointer-events: none;
`;
    title.textContent = postTitle;

    const controls = document.createElement("div");
    controls.style.cssText = `
display: flex;
gap: 8px;
`;

    // Buttons
    const minimizeBtn = document.createElement("button");
    minimizeBtn.textContent = "-";
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";

    // Create video element
    const video = document.createElement("video");
    video.style.cssText = `
width: 100%;
display: block;
`;
    video.controls = true;
    video.src = videoUrl;

    // Create resize handle
    const resizeHandle = document.createElement("div");
    resizeHandle.style.cssText = `
position: absolute;
width: 10px;
height: 10px;
background: #666;
right: 0;
bottom: 0;
cursor: se-resize;
`;

    // Some assembly required, IKEA mode
    controls.append(minimizeBtn);
    controls.append(closeBtn);
    header.appendChild(title);
    header.appendChild(controls);
    player.appendChild(header);
    player.appendChild(video);
    player.appendChild(resizeHandle);

    // Add to document
    document.body.appendChild(player);

    // Dragging state
    let dragState = {
      isDragging: false,
      isResizing: false,
      currentX: 20,
      currentY: 20,
      initialX: 0,
      initialY: 0,
      xOffset: 20,
      yOffset: 20,
      startTime: 0,
    };

    function dragStart(e) {
      if (e.target === header && e.buttons === 1) {
        e.preventDefault();
        e.stopPropagation();

        dragState.isDragging = true;
        dragState.startTime = Date.now();
        dragState.initialX = e.clientX - dragState.xOffset;
        dragState.initialY = e.clientY - dragState.yOffset;

        // Class for global text disable
        document.documentElement.classList.add("lsf-player-dragging");
        player.style.cursor = "grabbing";
      }
    }

    const drag = throttleRAF((e) => {
      if (!dragState.isDragging && !dragState.isResizing) return;

      e.preventDefault();
      e.stopPropagation();

      if (dragState.isDragging) {
        dragState.currentX = e.clientX - dragState.initialX;
        dragState.currentY = e.clientY - dragState.initialY;
        dragState.xOffset = dragState.currentX;
        dragState.yOffset = dragState.currentY;

        // Bound the dragging to window dimensions
        const rect = player.getBoundingClientRect();
        const initialLeft = parseInt(player.style.left) || 20; // Get initial CSS left value
        const initialTop = parseInt(player.style.top) || 20; // Get initial CSS top value

        const maxX = window.innerWidth - rect.width - initialLeft;
        const maxY = window.innerHeight - rect.height - initialTop;

        dragState.currentX = Math.max(
          -initialLeft,
          Math.min(dragState.currentX, maxX)
        );
        dragState.currentY = Math.max(
          -initialTop,
          Math.min(dragState.currentY, maxY)
        );

        player.style.transform = `translate(${dragState.currentX}px, ${dragState.currentY}px)`;
      }

      if (dragState.isResizing) {
        const maxWidth =
          window.innerWidth - player.getBoundingClientRect().left;
        const width = Math.min(
          maxWidth,
          Math.max(200, e.clientX - player.getBoundingClientRect().left)
        );
        player.style.width = `${width}px`;
      }
    });

    // FIXME: This is getting eaten by the video player
    // Mostly an issue when rescaling the video.
    // Not really sure how to fix.
    function dragEnd(e) {
      if (!dragState.isDragging && !dragState.isResizing) return;

      e.preventDefault();
      e.stopPropagation();

      // Reset all states
      dragState.isDragging = false;
      dragState.isResizing = false;
      document.documentElement.classList.remove("lsf-player-dragging");
      player.style.cursor = "";

      // Only update the offset if we've been dragging for more than 100ms
      if (Date.now() - dragState.startTime > 100) {
        dragState.initialX = dragState.currentX;
        dragState.initialY = dragState.currentY;
      }
    }

    header.addEventListener("mousedown", dragStart, {
      capture: true,
      passive: false,
    });
    document.addEventListener("mousemove", drag, {
      capture: true,
      passive: false,
    });
    document.addEventListener("mouseup", dragEnd, {
      capture: true,
      passive: false,
    });
    window.addEventListener("blur", dragEnd, { capture: true, passive: false });

    resizeHandle.addEventListener(
      "mousedown",
      (e) => {
        e.stopPropagation();
        dragState.isResizing = true;
      },
      { capture: true, passive: false }
    );

    minimizeBtn.addEventListener("click", () => {
      video.style.display = video.style.display === "none" ? "block" : "none";
    });

    closeBtn.addEventListener("click", () => {
      // Cleanup
      video.pause();
      video.removeAttribute("src");
      video.load();

      // Silence the listening
      header.removeEventListener("mousedown", dragStart, { capture: true });
      document.removeEventListener("mousemove", drag, { capture: true });
      document.removeEventListener("mouseup", dragEnd, { capture: true });
      window.removeEventListener("blur", dragEnd, { capture: true });

      // Remove player and injected style
      player.remove();
      style.remove();
    });

    return player;
  }

  function addMirrorButton(post) {
    const actions = post.querySelector(".flat-list.buttons");
    if (!actions || post.querySelector(".mirror-btn")) return;

    const btn = document.createElement("li");
    btn.innerHTML = '<a class="mirror-btn">📺 mirror</a>';
    btn.style.cursor = "pointer";
    btn.onclick = async () => {
      const btnLink = btn.querySelector("a");
      const originalText = btnLink.textContent;
      btnLink.textContent = "🔄 loading...";

      const postTitle = post.querySelector(".title")?.textContent;

      try {
        const postUrl = post.querySelector(".comments")?.href;
        if (!postUrl) throw new Error("Could not find post URL");

        const response = await fetchWithRetry(postUrl);
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const mirrorLink = findMirrorLink(doc);
        if (!mirrorLink || !isSafeUrl(mirrorLink)) {
          throw new Error("Invalid or missing mirror URL");
        }

        await new Promise((resolve, reject) => {
          GM_xmlhttpRequest({
            method: "GET",
            url: mirrorLink,
            timeout: 10000,
            onload: (response) => {
              try {
                const doc = new DOMParser().parseFromString(
                  response.responseText,
                  "text/html"
                );
                const sourceEl = doc.querySelector("source");
                const cdnUrl = sourceEl?.getAttribute("src");
                if (!cdnUrl) throw new Error("Could not find video source");
                createFloatingPlayer(cdnUrl, postTitle);
                resolve();
              } catch (e) {
                reject(e);
              }
            },
            onerror: reject,
            ontimeout: () => reject(new Error("Request timed out")),
          });
        });
      } catch (e) {
        console.error("Mirror fetch failed:", e);
        btnLink.textContent = `❌ ${e.message || "Failed to load mirror"}`;
      } finally {
        setTimeout(() => {
          if (btnLink.textContent.includes("loading")) {
            btnLink.textContent = originalText;
          }
        }, 1000);
      }
    };

    actions.appendChild(btn);
  }

  // initial posts
  document.querySelectorAll(".thing.link").forEach(addMirrorButton);

  const observeTarget = document.body; // TODO: kinda hacky

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.matches?.(".thing.link")) {
          addMirrorButton(node);
        }
        // Check children but avoid re-scanning the entire tree
        if (node.nodeType === Node.ELEMENT_NODE) {
          node
            .querySelectorAll(".thing.link:not(:has(.mirror-btn))")
            .forEach(addMirrorButton);
        }
      }
    }
  });

  observer.observe(observeTarget, {
    childList: true,
    subtree: true,
  });
})();

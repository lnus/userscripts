// ==UserScript==
// @name        LSF Mirror Player - reddit.com/r/LivestreamFail
// @namespace   Violentmonkey Scripts
// @match       https://www.reddit.com/r/LivestreamFail/*
// @grant       GM_xmlhttpRequest
// @version     0.1.0
// @author      lnus
// @description 2025-01-15, 17:37:52, embed arazu mirrors
// ==/UserScript==

// TODO: Implement debouncing for the drag/resize events
(function () {
  "use strict";

  const BOT_USERNAME = "LSFSecondaryMirror";

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
    const style = document.createElement('style');
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
`
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
      startTime: 0
    }

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
        player.style.cursor = 'grabbing';
      }
    }

    function drag(e) {
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
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

        dragState.currentX = Math.max(0, Math.min(dragState.currentX, maxX));
        dragState.currentY = Math.max(0, Math.min(dragState.currentY, maxY));

        player.style.transform = `translate(${dragState.currentX}px, ${dragState.currentY}px)`;
      }

      if (dragState.isResizing) {
        const width = Math.max(200, e.clientX - player.getBoundingClientRect().left);
        player.style.width = `${width}px`;
      }
    }

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
      document.documentElement.classList.remove('lsf-player-dragging');
      player.style.cursor = '';

      // Only update the offset if we've been dragging for more than 100ms
      if (Date.now() - dragState.startTime > 100) {
        dragState.initialX = dragState.currentX;
        dragState.initialY = dragState.currentY;
      }
    }

    header.addEventListener("mousedown", dragStart, { capture: true, passive: false });
    document.addEventListener("mousemove", drag, { capture: true, passive: false });
    document.addEventListener("mouseup", dragEnd, { capture: true, passive: false });
    window.addEventListener('blur', dragEnd, { capture: true, passive: false });

    resizeHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      dragState.isResizing = true;
    }, { capture: true, passive: false });

    minimizeBtn.addEventListener("click", () => {
      video.style.display = video.style.display === "none" ? "block" : "none";
    });

    closeBtn.addEventListener("click", () => {
      // Cleanup
      video.pause();
      video.src = "";
      video.load();

      // Silence the listening
      header.removeEventListener('mousedown', dragStart, { capture: true });
      document.removeEventListener('mousemove', drag, { capture: true });
      document.removeEventListener('mouseup', dragEnd, { capture: true });
      window.removeEventListener('blur', dragEnd, { capture: true });

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

      const postUrl = post.querySelector(".comments")?.href;
      const postTitle = post.querySelector(".title")?.textContent;
      if (!postUrl) {
        btnLink.textContent =
          "❌ this error should never happen, reddit updated their site.";
        return;
      }

      try {
        const response = await fetch(postUrl);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const mirrorLink = findMirrorLink(doc);
        if (!mirrorLink || !isSafeUrl(mirrorLink)) {
          btnLink.textContent = "❌ invalid mirror URL";
          return;
        }

        GM_xmlhttpRequest({
          method: "GET",
          url: mirrorLink,

          onload: function (response) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(
              response.responseText,
              "text/html"
            );
            const sourceEl = doc.querySelector("source");
            const cdnUrl = sourceEl?.getAttribute("src");
            if (cdnUrl) createFloatingPlayer(cdnUrl, postTitle);
          },
        });
      } catch (e) {
        console.error("Mirror fetch failed:", e);
        btnLink.textContent = "❌ mirror fetch failed, try again later.";
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

  // FIXME: I think this is broken with RES
  // Not quite sure how to fix
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.matches?.(".thing.link")) {
          addMirrorButton(node);
        }
      });
    });
  });

  observer.observe(document.querySelector("#siteTable") || document.body, {
    childList: true,
    subtree: true,
  });
})();

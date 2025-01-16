// ==UserScript==
// @name        LSF Mirror Player - reddit.com/r/LivestreamFail
// @namespace   Violentmonkey Scripts
// @match       https://www.reddit.com/r/LivestreamFail/*
// @grant       GM_xmlhttpRequest
// @version     0.1.0
// @author      lnus
// @description 2025-01-15, 17:37:52, embed arazu mirrors
// ==/UserScript==
(function () {
  "use strict";

  const BOT_USERNAME = "LSFSecondaryMirror";

  function findMirrorLink(commentThread) {
    const pinnedComment = commentThread.querySelector(".stickied");
    if (!pinnedComment) return null;

    const author = pinnedComment.querySelector(".author")?.textContent;
    if (author !== BOT_USERNAME) return null;

    const mirrorLink = pinnedComment.querySelector('a[href*="arazu.io"]');
    const href = mirrorLink?.href;
    return href;
  }

  function createFloatingPlayer(videoUrl) {
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
    title.textContent = "LSF Mirror"; // TODO: Make dynamic using post title

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

    // Dragging functionality
    let isDragging = false;
    let isResizing = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 20;
    let yOffset = 20;

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === header) {
        isDragging = true;
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        player.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }

      if (isResizing) {
        e.preventDefault();
        const width = e.clientX - player.getBoundingClientRect().left;
        player.style.width = `${width}px`;
      }
    }

    function dragEnd() {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
      isResizing = false;
    }

    header.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);

    resizeHandle.addEventListener("mousedown", () => {
      isResizing = true;
    });

    minimizeBtn.addEventListener("click", () => {
      video.style.display = video.style.display === "none" ? "block" : "none";
    });

    closeBtn.addEventListener("click", () => {
      player.remove();
      document.removeEventListener("mousemove", drag);
      document.removeEventListener("mouseup", dragEnd);
    });

    return player;
  }

  function addMirrorButton(post) {
    const actions = post.querySelector(".flat-list.buttons");
    if (!actions || post.querySelector(".mirror-btn")) return;

    const btn = document.createElement("li");
    btn.innerHTML = '<a class="mirror-btn">📺 mirror</a>';
    btn.onclick = async () => {
      const postUrl = post.querySelector(".comments")?.href;
      console.log(postUrl);
      if (!postUrl) return;

      const response = await fetch(postUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const mirrorLink = findMirrorLink(doc);

      // TODO: Could probably actually use their API for this /shrug
      if (mirrorLink) {
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
            if (cdnUrl) createFloatingPlayer(cdnUrl);
          },
        });
      }
    };

    actions.appendChild(btn);
  }

  // initial posts
  document.querySelectorAll(".thing.link").forEach(addMirrorButton);

  // TODO: dynamic posts
})();

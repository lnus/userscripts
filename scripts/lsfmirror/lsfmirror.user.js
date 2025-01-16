// ==UserScript==
// @name        LSF Mirror Player - reddit.com/r/LivestreamFail
// @namespace   Violentmonkey Scripts
// @match       https://www.reddit.com/r/LivestreamFail/*
// @grant       GM_xmlhttpRequest
// @version     1.0
// @author      lnus
// @description 2025-01-15, 17:37:52, embed arazu mirrors
// ==/UserScript==
(function () {
	'use strict';

	const BOT_USERNAME = 'LSFSecondaryMirror';

	function findMirrorLink(commentThread) {
		const pinnedComment = commentThread.querySelector('.stickied');
		if (!pinnedComment) return null;

		const author = pinnedComment.querySelector('.author')?.textContent;
		if (author !== BOT_USERNAME) return null;

		const mirrorLink = pinnedComment.querySelector('a[href*="arazu.io"]');
		const href = mirrorLink?.href;
		return href
	}

	function createFloatingPlayer(videoUrl) {
		const container = document.createElement('div');
		Object.assign(container.style, {
			position: 'fixed',
			right: '20px',
			bottom: '20px',
			zIndex: '9999',
			backgroundColor: '#000',
			padding: '8px',
			borderRadius: '4px',
			boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
		});

		const video = document.createElement('video');
		Object.assign(video.style, {
			width: '320px',
			height: '180px'
		});
		video.controls = true;
		video.autoplay = true;
		video.src = videoUrl;

		const closeBtn = document.createElement('button');
		Object.assign(closeBtn.style, {

		});
		closeBtn.textContent = '×';
		closeBtn.onclick = () => document.body.removeChild(container);

		container.append(video, closeBtn);
		document.body.appendChild(container);
	}

	function addMirrorButton(post) {
		const actions = post.querySelector('.flat-list.buttons');
		if (!actions || post.querySelector('.mirror-btn')) return;

		const btn = document.createElement('li');
		btn.innerHTML = '<a class="mirror-btn">📺 mirror</a>';
		btn.onclick = async () => {
			const postUrl = post.querySelector('.comments')?.href;
			console.log(postUrl);
			if (!postUrl) return;

			const response = await fetch(postUrl);
			const html = await response.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');

			const mirrorLink = findMirrorLink(doc);

			// TODO: Could probably actually use their API for this /shrug
			if (mirrorLink) {
				GM_xmlhttpRequest({
					method: "GET",
					url: mirrorLink,

					onload: function (response) {
						const parser = new DOMParser();
						const doc = parser.parseFromString(response.responseText, 'text/html');
						const sourceEl = doc.querySelector('source');
						const cdnUrl = sourceEl?.getAttribute('src');
						if (cdnUrl) createFloatingPlayer(cdnUrl);
					}
				})
			}
		};

		actions.appendChild(btn);
	}

	// initial posts
	document.querySelectorAll('.thing.link').forEach(addMirrorButton);

	// dynamic posts
	new MutationObserver(mutations => {
		mutations.forEach(mutation => {
			mutation.addedNodes.forEach(node => {
				if (node.matches?.('.thing.link')) {
					addMirrorButton(node);
				}
			});
		});
	}).observe(document.body, {
		childList: true,
		subtree: true
	});
})();

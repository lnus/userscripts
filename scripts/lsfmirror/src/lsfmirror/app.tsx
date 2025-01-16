import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { getPanel, showToast } from '@violentmonkey/ui';
// global CSS
import globalCss from './style.css';
// CSS modules
import styles, { stylesheet } from './style.module.css';

function MirrorPlayer() {
  const [getVideoUrl, setVideoUrl] = createSignal<string | null>('');

  (window as any).handleMirrorClick = async (postUrl: string) => {
    try {
      const response = await fetch(postUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const mirrorLink = findMirrorLink(doc);
      if (mirrorLink) {
        // Using GM_xmlhttpRequest through window to satisfy TS
        (window as any).GM_xmlhttpRequest({
          method: 'GET',
          url: mirrorLink,
          onload: function (response: any) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(
              response.responseText,
              'text/html',
            );
            const sourceEl = doc.querySelector('source');
            const cdnUrl = sourceEl?.getAttribute('src');
            if (cdnUrl) setVideoUrl(cdnUrl);
          },
        });
      }
    } catch (error) {
      showToast('Failed to load mirror', { theme: 'dark' });
    }
  };

  return (
    <div>
      {getVideoUrl() ? (
        <>
          <video
            src={getVideoUrl()}
            controls
            autoplay
            style={{ width: '320px', height: '180px' }}
          />
          <button onClick={() => setVideoUrl('')} class={styles.closeBtn}>
            ×
          </button>
        </>
      ) : (
        <p>No video loaded</p>
      )}
    </div>
  );
}

// Helper function to find mirror link
function findMirrorLink(doc: Document) {
  const BOT_USERNAME = 'LSFSecondaryMirror';
  const pinnedComment = doc.querySelector('.stickied');
  if (!pinnedComment) return null;

  const author = pinnedComment.querySelector('.author')?.textContent;
  if (author !== BOT_USERNAME) return null;

  const mirrorLink = pinnedComment.querySelector('a[href*="arazu.io"]');
  return mirrorLink?.getAttribute('href');
}

// Add mirror buttons to posts
function addMirrorButton(post: Element) {
  const actions = post.querySelector('.flat-list.buttons');
  if (!actions || post.querySelector('.mirror-btn')) return;

  const btn = document.createElement('li');
  btn.innerHTML = '<a class="mirror-btn">📺 mirror</a>';
  btn.onclick = () => {
    const postUrl = post.querySelector('.comments')?.getAttribute('href');
    if (!postUrl) return;
    (window as any).handleMirrorClick(postUrl);
  };

  actions.appendChild(btn);
}

// Initialize mirror buttons
function initializeMirrorButtons() {
  // Add to initial posts
  document.querySelectorAll('.thing.link').forEach(addMirrorButton);

  // Watch for new posts
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element && node.matches?.('.thing.link')) {
          addMirrorButton(node);
        }
      });
    });
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Let's create a movable panel using @violentmonkey/ui
const panel = getPanel({
  theme: 'dark',
  style: [globalCss, stylesheet].join('\n'),
});
Object.assign(panel.wrapper.style, {
  top: '10vh',
  left: '10vw',
});
panel.setMovable(true);
panel.show();
render(MirrorPlayer, panel.body);
initializeMirrorButtons();

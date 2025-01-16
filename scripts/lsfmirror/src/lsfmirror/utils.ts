const BOT_USERNAME = 'LSFSecondaryMirror';

export function findMirrorLink(doc: Document): string | null {
  const pinnedComment = doc.querySelector('.stickied');
  if (!pinnedComment) return null;

  const author = pinnedComment.querySelector('.author')?.textContent;
  if (author !== BOT_USERNAME) return null;

  const mirrorLink = pinnedComment.querySelector('a[href*="arazu.io"]');
  return mirrorLink?.getAttribute('href') || null;
}

export function fetchVideoUrl(mirrorLink: string): Promise<string> {
  return new Promise((resolve) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: mirrorLink,
      onload: function (response) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.responseText, 'text/html');
        const sourceEl = doc.querySelector('source');
        const cdnUrl = sourceEl?.getAttribute('src');
        if (cdnUrl) resolve(cdnUrl);
      },
    });
  });
}

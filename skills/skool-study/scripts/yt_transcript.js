// YouTube fallback. yt-dlp is often blocked (subs 429, audio 403), but the
// transcript panel on the watch page works. Open the watch page in Chrome, then
// run this with the javascript tool. Set KEY to the lesson file name (NN_slug).
// Text is stashed in localStorage "yt_transcripts" (on youtube.com) keyed by
// KEY; export it with export_clipboard.js after the last video.
(async () => {
  const KEY = 'REPLACE_WITH_NN_slug';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  document.querySelector('#expand')?.click();
  await sleep(800);
  const btn = [...document.querySelectorAll('button, ytd-button-renderer')]
    .find(b => /show transcript/i.test(b.textContent || b.getAttribute('aria-label') || ''));
  if (!btn) return 'NO TRANSCRIPT BUTTON (video may have no captions)';
  btn.click();
  let segs = [];
  for (let t = 0; t < 20 && !segs.length; t++) {
    await sleep(500);
    segs = [...document.querySelectorAll('ytd-transcript-segment-renderer .segment-text')];
  }
  if (!segs.length) return 'TRANSCRIPT PANEL EMPTY';
  const text = segs.map(s => s.textContent.trim()).filter(Boolean).join(' ');
  const store = JSON.parse(localStorage.getItem('yt_transcripts') || '{}');
  store[KEY] = text;
  localStorage.setItem('yt_transcripts', JSON.stringify(store));
  return `${KEY}: ${text.split(/\s+/).length} words, ${Object.keys(store).length} stored`;
})();

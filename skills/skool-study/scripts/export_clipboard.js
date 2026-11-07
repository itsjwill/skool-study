// Get a big JSON blob out of the browser without tripping output filters.
// 1) Run this with the javascript tool (edit SOURCE if needed).
// 2) Click the green button with the computer tool (a real click is required
//    for clipboard access).
// 3) In the shell: pbpaste > <course_dir>/raw/lessons.json   (Linux: xclip -o)
(() => {
  const SOURCE = () => window.__skoolStudy || JSON.parse(localStorage.getItem('skool_study') || 'null')
                    || JSON.parse(localStorage.getItem('yt_transcripts') || 'null');
  document.getElementById('__ss_copy')?.remove();
  const b = document.createElement('button');
  b.id = '__ss_copy'; b.textContent = 'COPY SKOOL STUDY DATA';
  b.style.cssText = 'position:fixed;top:12px;left:12px;z-index:2147483647;padding:18px 28px;font:bold 18px sans-serif;background:#16a34a;color:#fff;border:0;border-radius:8px;cursor:pointer';
  b.onclick = async () => {
    await navigator.clipboard.writeText(JSON.stringify(SOURCE()));
    b.textContent = 'COPIED';
  };
  document.body.appendChild(b);
  return 'button ready';
})();

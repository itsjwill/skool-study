// Map every lesson in a Skool group's classroom. Run with the Claude in Chrome
// javascript tool while a tab is open on https://www.skool.com/<group>/classroom
// (you must be a logged-in member). Paste the whole file as the script.
//
// Result is stored in window.__skoolStudy and localStorage "skool_study" as
//   {group, lessons:[{i, course, courseSlug, path, id, videoLink, videoLenMs,
//                     mux_pid, mux_tok, mux_min, resources, notes}]}
// The return value is counts only: tool output that contains URLs with query
// strings gets blocked, so export the JSON with export_clipboard.js instead.
//
// Field names are read defensively. If counts come back 0, inspect
// JSON.parse(document.getElementById('__NEXT_DATA__').textContent).props.pageProps
// and adjust pick() below.
(async () => {
  const group = location.pathname.split('/')[1];
  const nextData = async (url) => {
    const html = await (await fetch(url, { credentials: 'include' })).text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    return m ? JSON.parse(m[1]).props.pageProps : {};
  };
  const pick = (o, ...keys) => { for (const k of keys) { const v = k.split('.').reduce((a, p) => a && a[p], o); if (v !== undefined && v !== null && v !== '') return v; } return ''; };

  const home = await nextData(`/${group}/classroom`);
  const all = home.allCourses || home.courses || [];
  const courses = all.map(c => ({
    slug: pick(c, 'name', 'course.name', 'slug'),
    title: pick(c, 'metadata.title', 'course.metadata.title', 'name'),
    locked: !!pick(c, 'metadata.locked', 'locked') || pick(c, 'hasAccess') === false,
  })).filter(c => c.slug);

  const lessons = []; let i = 0; const skipped = [];
  for (const c of courses) {
    const pp = await nextData(`/${group}/classroom/${c.slug}`);
    const root = pp.course;
    if (!root) { skipped.push(c.title); continue; }
    const walk = (node, trail) => {
      const meta = (node.course && node.course.metadata) || node.metadata || {};
      const id = (node.course && node.course.id) || node.id || '';
      const title = meta.title || (node.course && node.course.name) || '';
      const kids = node.children || [];
      const here = node === root ? [] : [...trail, title];
      if (kids.length) { kids.forEach(k => walk(k, here)); return; }
      if (node === root) return;
      lessons.push({
        i: i++, course: c.title, courseSlug: c.slug, path: here.join(' > '), id,
        videoLink: meta.videoLink || '', videoLenMs: meta.videoLenMs || 0,
        mux_pid: '', mux_tok: '', mux_min: 0,
        resources: meta.resources || '[]', notes: '',
      });
    };
    walk(root, []);
  }

  // Lessons without an external videoLink are usually Skool-native (Mux) video.
  for (const l of lessons.filter(x => !x.videoLink)) {
    try {
      const pp = await nextData(`/${group}/classroom/${l.courseSlug}?md=${l.id}`);
      const v = pp.video || {};
      l.mux_pid = v.playbackId || ''; l.mux_tok = v.playbackToken || '';
      l.mux_min = Math.round((v.duration || 0) / 60);
      const desc = pick(pp, 'selectedModule.metadata.desc', 'lesson.metadata.desc');
      if (desc) l.notes = String(desc).slice(0, 20000);
    } catch (e) { /* leave empty; SKILL.md covers the fallback */ }
  }

  const data = { group, lessons };
  window.__skoolStudy = data;
  try { localStorage.setItem('skool_study', JSON.stringify(data)); } catch (e) {}
  const by = (f) => lessons.filter(f).length;
  return JSON.stringify({
    courses: courses.length, skipped, lessons: lessons.length,
    loom: by(l => /loom\.com/.test(l.videoLink)), youtube: by(l => /youtu/.test(l.videoLink)),
    otherLink: by(l => l.videoLink && !/loom\.com|youtu/.test(l.videoLink)),
    mux: by(l => l.mux_pid), noVideo: by(l => !l.videoLink && !l.mux_pid),
  });
})();

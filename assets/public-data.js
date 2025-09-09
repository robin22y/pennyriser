// /assets/public-data.js
(() => {
  if (!window.__FIREBASE_CONFIG__) { console.error('Missing firebase config'); return; }
  if (!firebase.apps.length) { firebase.initializeApp(window.__FIREBASE_CONFIG__); }

  const db = firebase.firestore();

  // NOTICE
  (async ()=>{
    const el = document.getElementById('noticeText');
    if (!el) return;
    try {
      const doc = await db.collection('notices').doc('main').get();
      const d = doc.exists ? doc.data() : null;
      if (d && d.active && d.text) el.textContent = d.text;
    } catch(e){ /* keep default */ }
  })();

  // AD
  (async ()=>{
    const box = document.getElementById('adBox');
    if (!box) return;
    try {
      const doc = await db.collection('ads').doc('sidebar').get();
      const d = doc.exists ? doc.data() : null;
      if (!d || !d.active) return;
      const a = document.createElement('a');
      a.href = d.url || '#';
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'card';
      a.innerHTML = `
        <div class="ad">
          <div class="small" style="color:#64748b">Partner</div>
          <h3 style="margin:6px 0 4px">${d.headline || ''}</h3>
          <p>${d.body || ''}</p>
        </div>`;
      box.innerHTML = '';
      box.appendChild(a);
    } catch(e){ /* silent */ }
  })();
})();

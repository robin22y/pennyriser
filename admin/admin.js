// /admin/admin.js
if (!window.__FIREBASE_CONFIG__) { alert('Missing Firebase config'); }
if (!firebase.apps.length) { firebase.initializeApp(window.__FIREBASE_CONFIG__); }

const auth = firebase.auth();
const db   = firebase.firestore();

const who = document.getElementById('who');

// Auth guards
document.getElementById('logout')?.addEventListener('click', () =>
  auth.signOut().then(()=> location.href='/auth/login.html')
);

document.getElementById('backToLogin')?.addEventListener('click', () =>
  auth.signOut().then(()=> location.href='/auth/login.html')
);

async function requireAdmin(user){
  if (!user) { if (who) who.textContent='Not signed in. Redirecting…'; setTimeout(()=>location.replace('/auth/login.html'),600); return false; }
  const snap = await db.collection('users').doc(user.uid).get();
  const role = snap.exists ? snap.data().role : null;
  if (role !== 'admin') { if (who) who.textContent='Signed in but not admin. Going home…'; setTimeout(()=>location.replace('/'),800); return false; }
  if (who) who.textContent = 'Admin verified: ' + (user.email || user.uid);
  return true;
}

/* -------------------- NOTICE -------------------- */
const noticeTextInput = document.getElementById('noticeTextInput');
const noticePriority  = document.getElementById('noticePriority');
const noticeActive    = document.getElementById('noticeActive');
const noticeMsg       = document.getElementById('noticeMsg');

async function loadNotice(){
  const doc = await db.collection('notices').doc('main').get();
  const d = doc.exists ? doc.data() : {};
  if (noticeTextInput) noticeTextInput.value = d.text || 'Education only — not financial advice.';
  if (noticePriority)  noticePriority.value  = d.priority ?? 10;
  if (noticeActive)    noticeActive.checked  = !!d.active;
}
document.getElementById('saveNotice')?.addEventListener('click', async ()=>{
  try {
    await db.collection('notices').doc('main').set({
      text: (noticeTextInput?.value || '').trim(),
      priority: Number(noticePriority?.value)||10,
      active: !!noticeActive?.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    if (noticeMsg) { noticeMsg.textContent = 'Saved ✔'; setTimeout(()=>noticeMsg.textContent='',1500); }
  } catch(e){ if (noticeMsg) noticeMsg.textContent = e.message; }
});

/* -------------------- ADS (placements + image + preview) -------------------- */
const adPlacement = document.getElementById('adPlacement');   // sidebar | lesson-finance | lesson-trading | lesson-generic
const adHeadline  = document.getElementById('adHeadline');
const adBody      = document.getElementById('adBody');
const adLink      = document.getElementById('adLink');
const adImage     = document.getElementById('adImage');       // NEW
const adActive    = document.getElementById('adActive');
const adMsg       = document.getElementById('adMsg');

// Preview elements (optional)
const adPreview = document.getElementById('adPreview');
const adPrevImg = document.getElementById('adPrevImg');
const adPrevH   = document.getElementById('adPrevH');
const adPrevB   = document.getElementById('adPrevB');

function paintPreview(){
  if (!adPreview) return;
  const h = adHeadline?.value.trim();
  const b = adBody?.value.trim();
  const u = adLink?.value.trim();
  const img = adImage?.value.trim();

  adPreview.style.display = (h || b || img) ? 'block' : 'none';
  adPreview.href = u || '#';
  if (adPrevH) adPrevH.textContent = h || '';
  if (adPrevB) adPrevB.textContent = b || '';
  if (adPrevImg) {
    if (img) { adPrevImg.src = img; adPrevImg.style.display='block'; }
    else { adPrevImg.removeAttribute('src'); adPrevImg.style.display='none'; }
  }
}
[adHeadline, adBody, adLink, adImage].forEach(el=> el?.addEventListener('input', paintPreview));

async function loadAdById(id){
  const doc = await db.collection('ads').doc(id).get();
  const d = doc.exists ? doc.data() : {};
  if (adHeadline) adHeadline.value = d.headline || '';
  if (adBody)     adBody.value     = d.body || '';
  if (adLink)     adLink.value     = d.url || '';
  if (adImage)    adImage.value    = d.imageUrl || '';
  if (adActive)   adActive.checked = !!d.active;
  paintPreview();
}
document.getElementById('loadSelectedAd')?.addEventListener('click', ()=>{
  const id = adPlacement?.value || 'sidebar';
  loadAdById(id);
});

// default load on open (if the controls exist)
async function loadAd(){
  if (!adPlacement) return;
  await loadAdById(adPlacement.value || 'sidebar');
}

document.getElementById('saveAd')?.addEventListener('click', async ()=>{
  try {
    const id = adPlacement?.value || 'sidebar';
    await db.collection('ads').doc(id).set({
      headline: (adHeadline?.value || '').trim(),
      body: (adBody?.value || '').trim(),
      url: (adLink?.value || '').trim(),
      imageUrl: (adImage?.value || '').trim(),
      active: !!adActive?.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    if (adMsg) { adMsg.textContent = 'Saved ✔'; setTimeout(()=>adMsg.textContent='',1500); }
    paintPreview();
  } catch(e){ if (adMsg) adMsg.textContent = e.message; }
});

/* -------------------- LESSONS (with category + filter) -------------------- */
const lessonId       = document.getElementById('lessonId');
const lessonTitle    = document.getElementById('lessonTitle');
const lessonSlug     = document.getElementById('lessonSlug');
const lessonCategory = document.getElementById('lessonCategory');  // NEW
const lessonContent  = document.getElementById('lessonContent');
const lessonStatus   = document.getElementById('lessonStatus');
const lessonsTable   = document.getElementById('lessonsTable');
const lessonMsg      = document.getElementById('lessonMsg');
const filterCategory = document.getElementById('filterCategory');  // NEW

function clearLessonForm(){
  if (lessonId)       lessonId.value='';
  if (lessonTitle)    lessonTitle.value='';
  if (lessonSlug)     lessonSlug.value='';
  if (lessonContent)  lessonContent.value='';
  if (lessonStatus)   lessonStatus.value='draft';
  if (lessonCategory) lessonCategory.value='finance'; // default
  if (lessonMsg)      lessonMsg.textContent='';
}
document.getElementById('newLesson')?.addEventListener('click', clearLessonForm);

function renderLessons(rows){
  if (!lessonsTable) return;
  lessonsTable.innerHTML = '';
  rows.forEach(d=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.title || ''}</td>
      <td>${d.slug || ''}</td>
      <td>${d.category || 'finance'}</td>
      <td>${d.status || ''}</td>
      <td>${d.updatedAt ? (d.updatedAt.toDate ? d.updatedAt.toDate().toLocaleString() : '') : ''}</td>
      <td><button class="btn" data-id="${d.id}">Edit</button></td>`;
    tr.querySelector('button').onclick = ()=> loadLesson(d.id);
    lessonsTable.appendChild(tr);
  });
}

async function listLessons(){
  if (!lessonsTable) return;
  let q = db.collection('lessons');
  const cat = filterCategory?.value || 'all';
  if (cat !== 'all') q = q.where('category','==',cat);
  try {
    const snap = await q.orderBy('updatedAt','desc').limit(100).get();
    const rows = [];
    snap.forEach(doc=> rows.push({ id: doc.id, ...doc.data() }));
    renderLessons(rows);
  } catch (e) {
    // Fallback if composite index not ready
    const snap = await q.limit(100).get();
    const rows = [];
    snap.forEach(doc=> rows.push({ id: doc.id, ...doc.data() }));
    renderLessons(rows);
  }
}
filterCategory?.addEventListener('change', listLessons);

async function loadLesson(id){
  const doc = await db.collection('lessons').doc(id).get();
  const d = doc.data() || {};
  if (lessonId)       lessonId.value   = doc.id;
  if (lessonTitle)    lessonTitle.value= d.title || '';
  if (lessonSlug)     lessonSlug.value = d.slug || '';
  if (lessonCategory) lessonCategory.value = d.category || 'finance';
  if (lessonContent)  lessonContent.value  = d.content || '';
  if (lessonStatus)   lessonStatus.value   = d.status || 'draft';
  if (lessonMsg) { lessonMsg.textContent = 'Loaded'; setTimeout(()=>lessonMsg.textContent='',800); }
}

document.getElementById('saveLesson')?.addEventListener('click', async ()=>{
  try{
    const payload = {
      title: (lessonTitle?.value||'').trim(),
      slug: (lessonSlug?.value||'').trim().toLowerCase(),
      category: (lessonCategory?.value || 'finance'),
      content: (lessonContent?.value || ''),
      status: (lessonStatus?.value || 'draft'),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (!payload.title || !payload.slug) throw new Error('Title and slug are required');

    // Unique slug (global)
    if (!lessonId?.value) {
      const existing = await db.collection('lessons').where('slug','==',payload.slug).limit(1).get();
      if (!existing.empty) throw new Error('Slug already exists');
    }

    let id = lessonId?.value;
    if (id) {
      await db.collection('lessons').doc(id).set(payload, { merge:true });
    } else {
      const newDoc = await db.collection('lessons').add(payload);
      id = newDoc.id;
      if (lessonId) lessonId.value = id;
    }
    if (lessonMsg) { lessonMsg.textContent = 'Saved ✔'; setTimeout(()=>lessonMsg.textContent='',1200); }
    await listLessons();
  } catch(e){
    console.error(e);
    if (lessonMsg) lessonMsg.textContent = e.message;
  }
});

document.getElementById('deleteLesson')?.addEventListener('click', async ()=>{
  if (!lessonId?.value) { if (lessonMsg) lessonMsg.textContent='Nothing to delete'; return; }
  if (!confirm('Delete this lesson?')) return;
  await db.collection('lessons').doc(lessonId.value).delete();
  clearLessonForm();
  await listLessons();
});

// Init after auth
auth.onAuthStateChanged(async (user)=>{
  if (!(await requireAdmin(user))) return;
  await Promise.all([loadNotice(), loadAd()]);
  await listLessons();
});

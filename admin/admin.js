// /admin/admin.js
if (!window.__FIREBASE_CONFIG__) { alert('Missing Firebase config'); }
if (!firebase.apps.length) { firebase.initializeApp(window.__FIREBASE_CONFIG__); }

const auth = firebase.auth();
const db   = firebase.firestore();

const who = document.getElementById('who');

// Auth guards
document.getElementById('logout').onclick = () =>
  auth.signOut().then(()=> location.href='/auth/login.html');

document.getElementById('backToLogin').onclick = () =>
  auth.signOut().then(()=> location.href='/auth/login.html');

async function requireAdmin(user){
  if (!user) { who.textContent='Not signed in. Redirecting…'; setTimeout(()=>location.replace('/auth/login.html'),600); return false; }
  const snap = await db.collection('users').doc(user.uid).get();
  const role = snap.exists ? snap.data().role : null;
  if (role !== 'admin') { who.textContent='Signed in but not admin. Going home…'; setTimeout(()=>location.replace('/'),800); return false; }
  who.textContent = 'Admin verified: ' + (user.email || user.uid);
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
  noticeTextInput.value = d.text || 'Education only — not financial advice.';
  noticePriority.value  = d.priority ?? 10;
  noticeActive.checked  = !!d.active;
}
document.getElementById('saveNotice').onclick = async ()=>{
  try {
    await db.collection('notices').doc('main').set({
      text: noticeTextInput.value.trim(),
      priority: Number(noticePriority.value)||10,
      active: !!noticeActive.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    noticeMsg.textContent = 'Saved ✔'; setTimeout(()=>noticeMsg.textContent='',1500);
  } catch(e){ noticeMsg.textContent = e.message; }
};

/* -------------------- AD -------------------- */
const adHeadline = document.getElementById('adHeadline');
const adBody     = document.getElementById('adBody');
const adLink     = document.getElementById('adLink');
const adActive   = document.getElementById('adActive');
const adMsg      = document.getElementById('adMsg');

async function loadAd(){
  const doc = await db.collection('ads').doc('sidebar').get();
  const d = doc.exists ? doc.data() : {};
  adHeadline.value = d.headline || '';
  adBody.value     = d.body || '';
  adLink.value     = d.url || '';
  adActive.checked = !!d.active;
}
document.getElementById('saveAd').onclick = async ()=>{
  try {
    await db.collection('ads').doc('sidebar').set({
      headline: adHeadline.value.trim(),
      body: adBody.value.trim(),
      url: adLink.value.trim(),
      active: !!adActive.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    adMsg.textContent = 'Saved ✔'; setTimeout(()=>adMsg.textContent='',1500);
  } catch(e){ adMsg.textContent = e.message; }
};

/* -------------------- LESSONS (with categories) -------------------- */
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
  lessonId.value=''; 
  lessonTitle.value=''; 
  lessonSlug.value=''; 
  lessonContent.value='';
  lessonStatus.value='draft'; 
  if (lessonCategory) lessonCategory.value='finance'; // default category
  lessonMsg.textContent='';
}
document.getElementById('newLesson').onclick = clearLessonForm;

function renderLessons(rows){
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
  lessonId.value = doc.id;
  lessonTitle.value = d.title || '';
  lessonSlug.value = d.slug || '';
  if (lessonCategory) lessonCategory.value = d.category || 'finance';
  lessonContent.value = d.content || '';
  lessonStatus.value = d.status || 'draft';
  lessonMsg.textContent = 'Loaded';
  setTimeout(()=>lessonMsg.textContent='',800);
}

document.getElementById('saveLesson').onclick = async ()=>{
  try{
    const payload = {
      title: (lessonTitle.value||'').trim(),
      slug: (lessonSlug.value||'').trim().toLowerCase(),
      category: (lessonCategory?.value || 'finance'),
      content: lessonContent.value || '',
      status: lessonStatus.value || 'draft',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (!payload.title || !payload.slug) throw new Error('Title and slug are required');

    // Unique slug (global)
    if (!lessonId.value) {
      const existing = await db.collection('lessons').where('slug','==',payload.slug).limit(1).get();
      if (!existing.empty) throw new Error('Slug already exists');
    }

    let id = lessonId.value;
    if (id) {
      await db.collection('lessons').doc(id).set(payload, { merge:true });
    } else {
      const newDoc = await db.collection('lessons').add(payload);
      id = newDoc.id; lessonId.value = id;
    }
    lessonMsg.textContent = 'Saved ✔'; setTimeout(()=>lessonMsg.textContent='',1200);
    await listLessons();
  } catch(e){ 
    console.error(e);
    lessonMsg.textContent = e.message; 
  }
};

document.getElementById('deleteLesson').onclick = async ()=>{
  if (!lessonId.value) { lessonMsg.textContent='Nothing to delete'; return; }
  if (!confirm('Delete this lesson?')) return;
  await db.collection('lessons').doc(lessonId.value).delete();
  clearLessonForm();
  await listLessons();
};

/* -------------------- INIT -------------------- */
auth.onAuthStateChanged(async (user)=>{
  if (!(await requireAdmin(user))) return;
  await Promise.all([loadNotice(), loadAd()]);
  await listLessons();
});

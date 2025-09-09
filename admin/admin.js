// /admin/admin.js
if (!window.__FIREBASE_CONFIG__) { alert('Missing Firebase config'); }
if (!firebase.apps.length) { firebase.initializeApp(window.__FIREBASE_CONFIG__); }

const auth = firebase.auth();
const db   = firebase.firestore();

const who = document.getElementById('who');

// Buttons
document.getElementById('logout').onclick = () =>
  auth.signOut().then(()=> location.href='/auth/login.html');

document.getElementById('backToLogin').onclick = () =>
  auth.signOut().then(()=> location.href='/auth/login.html');

// Inputs
const noticeTextInput = document.getElementById('noticeTextInput');
const noticePriority  = document.getElementById('noticePriority');
const noticeActive    = document.getElementById('noticeActive');
const noticeMsg       = document.getElementById('noticeMsg');

const adHeadline = document.getElementById('adHeadline');
const adBody     = document.getElementById('adBody');
const adLink     = document.getElementById('adLink');
const adActive   = document.getElementById('adActive');
const adMsg      = document.getElementById('adMsg');

// Role gate
async function requireAdmin(user){
  if (!user) { who.textContent = 'Not signed in. Redirecting…'; setTimeout(()=>location.replace('/auth/login.html'), 600); return false; }
  const snap = await db.collection('users').doc(user.uid).get();
  const role = snap.exists ? snap.data().role : null;
  if (role !== 'admin') { who.textContent = 'Signed in but not admin. Going home…'; setTimeout(()=>location.replace('/'), 800); return false; }
  who.textContent = 'Admin verified: ' + (user.email || user.uid);
  return true;
}

// Load existing values
async function loadNotice() {
  const doc = await db.collection('notices').doc('main').get();
  const d = doc.exists ? doc.data() : {};
  noticeTextInput.value = d.text || 'Education only — not financial advice.';
  noticePriority.value  = (d.priority ?? 10);
  noticeActive.checked  = !!d.active;
}
async function loadAd() {
  const doc = await db.collection('ads').doc('sidebar').get();
  const d = doc.exists ? doc.data() : {};
  adHeadline.value = d.headline || 'Compare Mortgage Deals';
  adBody.value     = d.body || 'Find a lower rate in minutes.';
  adLink.value     = d.url || '';
  adActive.checked = !!d.active;
}

// Save handlers
document.getElementById('saveNotice').onclick = async ()=>{
  try {
    await db.collection('notices').doc('main').set({
      text: noticeTextInput.value.trim(),
      priority: Number(noticePriority.value) || 10,
      active: !!noticeActive.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    noticeMsg.textContent = 'Saved ✔';
    setTimeout(()=>noticeMsg.textContent='', 1500);
  } catch (e) {
    noticeMsg.textContent = e.message;
  }
};

document.getElementById('saveAd').onclick = async ()=>{
  try {
    await db.collection('ads').doc('sidebar').set({
      headline: adHeadline.value.trim(),
      body: adBody.value.trim(),
      url: adLink.value.trim(),
      active: !!adActive.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    adMsg.textContent = 'Saved ✔';
    setTimeout(()=>adMsg.textContent='', 1500);
  } catch (e) {
    adMsg.textContent = e.message;
  }
};

// Init
auth.onAuthStateChanged(async (user)=>{
  if (!(await requireAdmin(user))) return;
  // Load forms after role verified
  await Promise.all([loadNotice(), loadAd()]);
});

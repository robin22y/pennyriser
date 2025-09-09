// /admin/admin.js
if (!window.__FIREBASE_CONFIG__) { alert('Missing Firebase config'); }
if (!firebase.apps.length) { firebase.initializeApp(window.__FIREBASE_CONFIG__); }

const auth = firebase.auth();
const db   = firebase.firestore();
const who  = document.getElementById('who');

document.getElementById('logout').onclick = () =>
  auth.signOut().then(()=> location.href='/auth/login.html');

document.getElementById('backToLogin')?.addEventListener('click', () =>
  auth.signOut().then(()=> location.href='/auth/login.html'));

async function requireAdmin(user){
  if (!user) {
    who.textContent = 'Not signed in. Redirecting…';
    setTimeout(()=> location.replace('/auth/login.html'), 800);
    return false;
  }
  try {
    const snap = await db.collection('users').doc(user.uid).get();
    const role = snap.exists ? snap.data().role : null;
    if (role !== 'admin') {
      who.textContent = 'Signed in but not admin. Redirecting home…';
      setTimeout(()=> location.replace('/'), 800);
      return false;
    }
    who.textContent = '✅ Admin verified: ' + (user.email || user.uid);
    return true;
  } catch(e){
    who.textContent = 'Error checking role. Redirecting…';
    setTimeout(()=> location.replace('/'), 800);

// /auth/auth.js
if (!window.__FIREBASE_CONFIG__) { alert('Missing Firebase config'); }
if (!firebase.apps.length) { firebase.initializeApp(window.__FIREBASE_CONFIG__); }

const auth   = firebase.auth();
const email  = document.getElementById('email');
const pass   = document.getElementById('password');
const msg    = document.getElementById('msg');
const say    = (t) => { if (msg) msg.textContent = t; };

function goHome() {
  try { window.location.replace('/'); } catch(_) {}
  setTimeout(()=> { window.location.assign('/'); }, 150);
}

document.getElementById('loginBtn')?.addEventListener('click', async (e)=>{
  e.preventDefault();
  try {
    await auth.signInWithEmailAndPassword(email.value.trim(), pass.value);
    say('Logged in. Taking you home…');
    goHome();
  } catch (err) { say(err.message); }
});

document.getElementById('signupBtn')?.addEventListener('click', async (e)=>{
  e.preventDefault();
  try {
    await auth.createUserWithEmailAndPassword(email.value.trim(), pass.value);
    say('Account created. Now click Log in.');
  } catch (err) { say(err.message); }
});

// Optional: if already signed in and they open /auth/login.html → go home
auth.onAuthStateChanged((user)=>{
  if (user) { say('You are already logged in. Going home…'); goHome(); }
});

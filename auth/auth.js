// /auth/auth.js
(function(){
  const say = (t)=>{ const m=document.getElementById('msg'); if(m) m.textContent=t; };

  // Sanity: config + SDK
  if (!window.__FIREBASE_CONFIG__) { say('Missing Firebase config'); return; }
  if (!window.firebase) { say('Firebase SDK not loaded'); return; }

  if (!firebase.apps.length) firebase.initializeApp(window.__FIREBASE_CONFIG__);
  const auth = firebase.auth();

  const email = document.getElementById('email');
  const pass  = document.getElementById('password');
  const loginBtn  = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');

  // Guard against missing elements
  if (!email || !pass || !loginBtn || !signupBtn) {
    console.error('Login elements missing in DOM');
    return;
  }

  loginBtn.addEventListener('click', async (e)=>{
    e.preventDefault();
    try {
      await auth.signInWithEmailAndPassword(email.value.trim(), pass.value);
      say('Logged in. Taking you home…');
      // redirect home, not admin
      try { window.location.replace('/'); } catch(_) {}
      setTimeout(()=>window.location.assign('/'), 150);
    } catch (err) {
      say(err.message);
      console.error(err);
    }
  });

  signupBtn.addEventListener('click', async (e)=>{
    e.preventDefault();
    try {
      await auth.createUserWithEmailAndPassword(email.value.trim(), pass.value);
      say('Account created. Now click Log in.');
    } catch (err) {
      say(err.message);
      console.error(err);
    }
  });

  // If already signed in, go home (optional)
  auth.onAuthStateChanged((user)=>{
    if (user) {
      say('You are already logged in. Taking you home…');
      try { window.location.replace('/'); } catch(_) {}
      setTimeout(()=>window.location.assign('/'), 150);
    }
  });
})();

// /assets/nav.js
(function(){
  const path = location.pathname;

  // Mark active
  document.querySelectorAll('.bottom-nav a[data-match]')
    .forEach(a=>{
      const m = a.getAttribute('data-match');
      if (m === '/' && path === '/') a.classList.add('active');
      else if (m !== '/' && path.startsWith(m)) a.classList.add('active');
    });

  // If Firebase present, toggle Login/Logout/Admin in bottom nav too
  if (window.firebase && window.__FIREBASE_CONFIG__) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.__FIREBASE_CONFIG__);
      const auth = firebase.auth();
      const db = firebase.firestore?.();
      const login = document.getElementById('bn-login');
      const logout = document.getElementById('bn-logout');
      const admin = document.getElementById('bn-admin');

      auth.onAuthStateChanged(async (u)=>{
        if (!u) {
          login?.removeAttribute('hidden');
          logout?.setAttribute('hidden','');
          admin?.setAttribute('hidden','');
          return;
        }
        login?.setAttribute('hidden','');
        logout?.removeAttribute('hidden');

        // show admin if role is admin
        if (db && admin) {
          try {
            const snap = await db.collection('users').doc(u.uid).get();
            const role = snap.exists ? snap.data().role : null;
            if (role === 'admin') admin.removeAttribute('hidden');
            else admin.setAttribute('hidden','');
          } catch(e){ admin.setAttribute('hidden',''); }
        }
      });
    } catch(e){}
  }
})();

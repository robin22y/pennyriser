// firebase.js — init + auth + firestore helpers
let firebaseApp, firebaseAuth, firebaseDb;

document.addEventListener('DOMContentLoaded', () => {
  const check = setInterval(()=>{ if(window.firebase && window.firebase.apps){ clearInterval(check); initFirebase(); } },50);
});

function initFirebase(){
  const firebaseConfig = {
    apiKey: "AIzaSyCYFsmSWqZV583BFoUAOhOHge-iIZMgIuc",
    authDomain: "pennyriser-7c1a9.firebaseapp.com",
    projectId: "pennyriser-7c1a9",
    storageBucket: "pennyriser-7c1a9.appspot.com",
    messagingSenderId: "627254669558",
    appId: "1:627254669558:web:58d185301ef142925c7cd7"
  };
  firebaseApp = firebase.initializeApp(firebaseConfig);
  firebaseAuth = firebase.auth();
  firebaseDb = firebase.firestore();

  // Auth UI
  const E=id=>document.getElementById(id);
  E('googleLogin').onclick = async ()=>{ clearAuthError(); disableAuthButtons(true); try{ const p=new firebase.auth.GoogleAuthProvider(); await firebaseAuth.signInWithPopup(p);}catch(e){ showAuthError(niceFirebaseError(e)); } finally{ disableAuthButtons(false);} };
  E('emailLogin').onclick = async ()=>{ clearAuthError(); const email=E('email').value.trim(); const pwd=E('pwd').value.trim(); if(!email||!pwd) return showAuthError('Please enter email and password.'); disableAuthButtons(true); try{ await firebaseAuth.signInWithEmailAndPassword(email,pwd);}catch(e){ showAuthError(niceFirebaseError(e)); } finally{ disableAuthButtons(false);} };
  E('emailSignup').onclick = async ()=>{ clearAuthError(); const email=E('email').value.trim(); const pwd=E('pwd').value.trim(); if(!email||!pwd) return showAuthError('Please enter email and a password (min 6 chars).'); if(pwd.length<6) return showAuthError('Password must be at least 6 characters.'); disableAuthButtons(true); try{ await firebaseAuth.createUserWithEmailAndPassword(email,pwd);}catch(e){ showAuthError(niceFirebaseError(e)); } finally{ disableAuthButtons(false);} };
  E('btnSignOut').onclick = ()=> firebaseAuth.signOut();

  // Auth state
  firebaseAuth.onAuthStateChanged(async (user)=>{
    if(user){ E('btnSignOut').style.display='inline-block'; const claims=await getClaims(); window.CURRENT_CLAIMS=claims||{}; window.onSignedIn&&window.onSignedIn(user,claims); }
    else { E('btnSignOut').style.display='none'; window.onSignedOut&&window.onSignedOut(); }
  });

  // Password toggle
  document.getElementById('togglePwd')?.addEventListener('click',()=>{ const input=document.getElementById('pwd'); if(!input) return; input.type = input.type==='password' ? 'text':'password'; });
}

async function getClaims(){ const user=firebaseAuth.currentUser; if(!user) return null; const token=await user.getIdTokenResult(true); return token.claims; }

// Firestore helpers
function userCol(path){ const uid=firebaseAuth.currentUser?.uid; if(!uid) throw new Error('Not signed in'); return firebaseDb.collection('users').doc(uid).collection(path); }
async function saveEncrypted(col,id,ciphertext){ const ref=userCol(col).doc(id); await ref.set({data:ciphertext,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); }
async function loadAll(col){ const snap=await userCol(col).orderBy('updatedAt','desc').get(); return snap.docs.map(d=>({id:d.id,data:d.data().data})); }

window.PENNY_FIREBASE = { getClaims, saveEncrypted, loadAll, userCol };

// Auth UI helpers
function disableAuthButtons(disabled){ ['emailLogin','emailSignup','googleLogin'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.disabled=disabled; el.style.opacity=disabled?'0.7':'1'; el.style.pointerEvents=disabled?'none':'auto'; } }); }
function showAuthError(msg){ const box=document.getElementById('authError'); if(!box) return alert(msg); box.textContent=msg; box.classList.remove('hidden'); }
function clearAuthError(){ const box=document.getElementById('authError'); if(!box) return; box.textContent=''; box.classList.add('hidden'); }
function niceFirebaseError(e){ const code=e?.code||''; const map={ 'auth/invalid-email':'That email address looks invalid.', 'auth/user-not-found':'No account found with that email.', 'auth/wrong-password':'Incorrect password.', 'auth/email-already-in-use':'This email is already registered.', 'auth/weak-password':'Password is too weak (min 6 chars).', 'auth/popup-blocked':'Popup blocked. Allow popups for Google sign-in.', 'auth/popup-closed-by-user':'Google sign-in was closed.', 'auth/network-request-failed':'Network error. Check your connection.', 'auth/too-many-requests':'Too many attempts. Try later.' }; return map[code] || (e?.message || 'Something went wrong.'); }

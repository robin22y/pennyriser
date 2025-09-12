// firebase.js — init + auth + firestore helpers (Google + Email/Password)
let firebaseApp, firebaseAuth, firebaseDb;

document.addEventListener('DOMContentLoaded', () => {
  // Wait for SDK scripts (defer) to load
  const check = setInterval(() => {
    if (window.firebase && window.firebase.apps) {
      clearInterval(check);
      initFirebase();
    }
  }, 50);
});

function initFirebase(){
  // TODO: Replace with your Firebase config from the console
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

  // Auth UI wiring
  document.getElementById('googleLogin').onclick = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    await firebaseAuth.signInWithPopup(provider);
  };
  document.getElementById('emailLogin').onclick = async () => {
    const email = document.getElementById('email').value.trim();
    const pwd = document.getElementById('pwd').value.trim();
    await firebaseAuth.signInWithEmailAndPassword(email, pwd);
  };
  document.getElementById('emailSignup').onclick = async () => {
    const email = document.getElementById('email').value.trim();
    const pwd = document.getElementById('pwd').value.trim();
    await firebaseAuth.createUserWithEmailAndPassword(email, pwd);
  };
  document.getElementById('btnSignOut').onclick = () => firebaseAuth.signOut();

  // Auth state
  firebaseAuth.onAuthStateChanged(async (user) => {
    if (user) {
      document.getElementById('btnSignOut').style.display = 'inline-block';
      const claims = await getClaims();
      window.CURRENT_CLAIMS = claims || {};
      if (window.onSignedIn) window.onSignedIn(user, claims);
    } else {
      document.getElementById('btnSignOut').style.display = 'none';
      if (window.onSignedOut) window.onSignedOut();
    }
  });
}

async function getClaims(){
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  const token = await user.getIdTokenResult(true);
  return token.claims; // { role, permissions: { ... } }
}

// Firestore helpers (per-user path)
function userCol(path){
  const uid = firebaseAuth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return firebaseDb.collection('users').doc(uid).collection(path);
}

// Read/write encrypted blobs
async function saveEncrypted(col, id, ciphertext){
  const ref = userCol(col).doc(id);
  await ref.set({ data: ciphertext, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
}
async function loadAll(col){
  const snap = await userCol(col).orderBy('updatedAt','desc').get();
  return snap.docs.map(d=> ({ id: d.id, data: d.data().data }));
}

window.PENNY_FIREBASE = { getClaims, saveEncrypted, loadAll, userCol };

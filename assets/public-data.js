import { app } from '/firebase-config.js';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

(async function(){
  try {
    const db = getFirestore(app);

    async function loadNotice(){
      const el = document.querySelector('#noticeText');
      if(!el) return;
      const q = query(collection(db, 'notices'), where('active','==',true), orderBy('priority','desc'), limit(1));
      const snap = await getDocs(q);
      if(!snap.empty){ el.textContent = snap.docs[0].data().text || 'Education only — not financial advice.'; }
    }

    async function loadAd(){
      const box = document.querySelector('#adBox');
      if(!box) return;
      const q = query(collection(db, 'ads'), where('active','==',true), limit(1));
      const snap = await getDocs(q);
      if(!snap.empty){
        const ad = snap.docs[0].data();
        box.innerHTML = `
          <div class="ad">
            <div class="badge">Partner</div>
            <h4>${ad.headline || 'Partner Offer'}</h4>
            <p>${ad.body || ''}</p>
            ${ad.link ? `<a class="btn" href="${ad.link}" rel="nofollow noopener">Learn more →</a>`:''}
          </div>`;
      }
    }

    document.addEventListener('DOMContentLoaded', ()=>{ loadNotice(); loadAd(); });
  } catch(e) {
    console.error("Firebase public data failed to load:", e);
  }
})();

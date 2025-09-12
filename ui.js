// ui.js — site-wide UI: announcements, seasonal effects, ads
const UI = (function(){
  const db = ()=> firebase.firestore();

  async function loadSiteConfig(){
    const doc = await db().collection('site').doc('config').get();
    return doc.exists ? doc.data() : { announcements: [], seasonal: { theme:'none' }, ads: [] };
  }
  async function saveSiteConfig(patch){
    await db().collection('site').doc('config').set(patch, { merge: true });
  }

  function renderAnnouncements(list){
    const bar = document.getElementById('announcementBar');
    if(!list || !list.length){ bar.classList.add('hidden'); bar.innerHTML=''; return; }
    bar.classList.remove('hidden');
    bar.innerHTML = `<div class="pill">${list.map(a=>{
      const img = a.image ? `<img src="${a.image}" alt="">` : '';
      const linkOpen = a.link ? `<a href="${a.link}" target="_blank" rel="noopener">` : '';
      const linkClose = a.link ? `</a>` : '';
      return `${img}${linkOpen}<strong>${escapeHtml(a.title||'Announcement')}</strong>${linkClose}<span class="muted">${escapeHtml(a.text||'')}</span>`;
    }).join('<span style="margin:0 8px">•</span>')}</div>`;
  }

  function isDateInRange(nowISO, startISO, endISO){
    if(!startISO && !endISO) return true;
    const n = new Date(nowISO).getTime();
    if(startISO && n < new Date(startISO).getTime()) return false;
    if(endISO && n > new Date(endISO).getTime()) return false;
    return true;
  }

  function applySeasonal(seasonal){
    const host = document.getElementById('seasonalCanvas');
    host.innerHTML = '';
    host.classList.add('hidden');
    if(!seasonal || seasonal.theme==='none') return;
    const nowISO = new Date().toISOString().slice(0,10);
    if(!isDateInRange(nowISO, seasonal.start, seasonal.end)) return;

    if(seasonal.theme==='christmas'){
      host.classList.remove('hidden');
      startSnow(host);
      // Optional Santa gif (CSP-safe if hosted on same origin)
      if(seasonal.santa){
        const santa = document.createElement('img');
        santa.src = seasonal.santa; santa.alt='Santa';
        santa.style.position='fixed'; santa.style.top='20%'; santa.style.left='-200px'; santa.style.height='80px'; santa.style.opacity='.9'; santa.style.zIndex='6';
        host.appendChild(santa);
        // simple fly-by
        let x=-200; const timer=setInterval(()=>{ x+=3; santa.style.left=x+'px'; if(x>window.innerWidth+200){ clearInterval(timer); santa.remove(); } },16);
      }
      if(seasonal.message){ renderAnnouncements([{ title: seasonal.message }]); }
    }
    if(seasonal.theme==='newyear'){
      host.classList.remove('hidden');
      startFireworks(host);
      if(seasonal.message){ renderAnnouncements([{ title: seasonal.message }]); }
    }
  }

  function renderAds(ads){
    const bar = document.getElementById('adsBar');
    if(!ads || !ads.length){ bar.classList.add('hidden'); bar.innerHTML=''; return; }
    bar.classList.remove('hidden');
    bar.innerHTML = ads.map(ad=>{
      if(ad.html){ return `<div class="card">${ad.html}</div>`; }
      const img = ad.image ? `<img src="${ad.image}" alt="ad" style="max-width:100%">` : '';
      const aOpen = ad.link ? `<a href="${ad.link}" target="_blank" rel="noopener">` : '';
      const aClose = ad.link ? `</a>` : '';
      return `<div class="card">${aOpen}${img}${aClose}${ad.caption?`<div class=\"muted\">${escapeHtml(ad.caption)}</div>`:''}</div>`;
    }).join('');
  }

  // Simple snow using CSS drops
  function startSnow(host){
    for(let i=0;i<80;i++){
      const flake=document.createElement('div');
      flake.style.position='fixed';
      flake.style.top='-10px';
      flake.style.left=Math.random()*100+'%';
      flake.style.width=flake.style.height=(Math.random()*4+2)+'px';
      flake.style.borderRadius='50%';
      flake.style.background='white';
      flake.style.opacity=.85;
      flake.style.zIndex='5';
      const duration=5+Math.random()*8; const offset = Math.random()*50-25;
      flake.animate([
        { transform:`translate(0,0)` },
        { transform:`translate(${offset}px, ${window.innerHeight+20}px)` }
      ],{ duration: duration*1000, iterations: Infinity, easing:'linear', delay: Math.random()*5000 });
      host.appendChild(flake);
    }
  }
  // Simple fireworks particles
  function startFireworks(host){
    function burst(){
      const cx = Math.random()*window.innerWidth;
      const cy = Math.random()*window.innerHeight*0.5 + 40;
      for(let i=0;i<40;i++){
        const p=document.createElement('div');
        p.style.position='fixed'; p.style.left=cx+'px'; p.style.top=cy+'px'; p.style.width=p.style.height='3px'; p.style.background='currentColor'; p.style.color='#f59e0b'; p.style.borderRadius='50%'; p.style.zIndex='5';
        const ang=Math.random()*Math.PI*2, dist=40+Math.random()*120, dur=600+Math.random()*600;
        p.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${Math.cos(ang)*dist}px, ${Math.sin(ang)*dist}px)`,opacity:0}],{duration:dur,easing:'ease-out'});
        host.appendChild(p); setTimeout(()=>p.remove(), dur+50);
      }
    }
    const loop=setInterval(burst, 800);
    host.dataset.fireworksLoop = loop;
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }

  return { loadSiteConfig, saveSiteConfig, renderAnnouncements, applySeasonal, renderAds };
})();

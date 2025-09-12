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

  // Date window check (admin sets these)
  const nowISO = new Date().toISOString().slice(0,10);
  const inRange = (start, end) => {
    const n = new Date(nowISO).getTime();
    if (start && n < new Date(start).getTime()) return false;
    if (end && n > new Date(end).getTime()) return false;
    return true;
  };
  if(!inRange(seasonal.start, seasonal.end)) return;

  // Activate overlay
  host.classList.remove('hidden');

  // Effects per theme
  const t = seasonal.theme;
  if (t === 'christmas') {
    startSnow(host);
    if (seasonal.santa) {
      const santa = document.createElement('img');
      santa.src = seasonal.santa; santa.alt='Santa';
      santa.style.position='fixed'; santa.style.top='20%'; santa.style.left='-200px';
      santa.style.height='80px'; santa.style.opacity='.9'; santa.style.zIndex='6';
      host.appendChild(santa);
      let x=-200; const timer=setInterval(()=>{ x+=3; santa.style.left=x+'px'; if(x>window.innerWidth+200){ clearInterval(timer); santa.remove(); } },16);
    }
  }
  else if (t === 'newyear') {
    startFireworks(host);
  }
  else if (t === 'diwali') {
    // warm fireworks + diya/lantern emoji float
    startFireworks(host);
    startEmojiRain(host, ["🪔","🏮","✨"], { interval: 600, size: [18, 28] });
  }
  else if (t === 'onam') {
    // marigold petals
    startPetals(host, ["#f59e0b","#fbbf24","#fef08a"], { interval: 220 });
    startEmojiRain(host, ["🌼","🌸"], { interval: 900, size: [18,26] });
  }
  else if (t === 'stpatricks') {
    startEmojiRain(host, ["☘️","🍀"], { interval: 300, size: [18,28] });
  }
  else if (t === 'mayday') {
    startConfetti(host, ["#ef4444"], { interval: 140, countPerBurst: 7 });
  }
  else if (t === 'mothersday') {
    startEmojiRain(host, ["🌷","💖","💐"], { interval: 320, size: [18,30] });
  }
  else if (t === 'fathersday') {
    startEmojiRain(host, ["🎩","🧰","💙"], { interval: 360, size: [18,30] });
  }
  else if (t === 'teachersday') {
    startEmojiRain(host, ["✏️","📚","🧑‍🏫"], { interval: 340, size: [18,28] });
  }
  else if (t === 'doctorsday') {
    startEmojiRain(host, ["⚕️","🩺","❤️‍🩹"], { interval: 340, size: [18,28] });
  }
  else if (t === 'nursesday') {
    startEmojiRain(host, ["🩺","💟","💉"], { interval: 340, size: [18,28] });
  }

  // Optional banner message
  if (seasonal.message) {
    UI.renderAnnouncements([{ title: seasonal.message }]);
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
// Emoji rain (generic)
function startEmojiRain(host, emojis = ["✨"], opts = {}) {
  const { interval = 400, lifetime = 6000, size = [20, 30] } = opts;
  const timer = setInterval(() => {
    const span = document.createElement("span");
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    span.style.position = "fixed";
    span.style.left = Math.random() * 100 + "vw";
    span.style.top = "-40px";
    span.style.fontSize = (size[0] + Math.random() * (size[1] - size[0])) + "px";
    span.style.filter = "drop-shadow(0 2px 2px rgba(0,0,0,.15))";
    span.style.zIndex = "5";
    host.appendChild(span);
    const drift = (Math.random() * 80) - 40;
    const dur = lifetime + Math.random() * 2000;
    span.animate(
      [{ transform: "translate(0,0)", opacity: 1 },
       { transform: `translate(${drift}px, ${window.innerHeight + 80}px)`, opacity: 0.9 }],
      { duration: dur, easing: "linear" }
    );
    setTimeout(() => span.remove(), dur + 50);
  }, interval);
  host.dataset.emojiTimer = timer;
}

// Confetti (colored squares/strips)
function startConfetti(host, colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"], opts = {}) {
  const { interval = 120, countPerBurst = 6 } = opts;
  const timer = setInterval(() => {
    for (let i = 0; i < countPerBurst; i++) {
      const d = document.createElement("div");
      d.style.position = "fixed";
      d.style.left = Math.random() * 100 + "vw";
      d.style.top = "-12px";
      const size = 6 + Math.random() * 6;
      d.style.width = size + "px";
      d.style.height = (Math.random() < 0.5 ? size : size * 2) + "px";
      d.style.background = colors[Math.floor(Math.random() * colors.length)];
      d.style.borderRadius = Math.random() < 0.2 ? "50%" : "4px";
      d.style.opacity = "0.95";
      d.style.zIndex = "5";
      host.appendChild(d);
      const drift = (Math.random() * 120) - 60;
      const dur = 3000 + Math.random() * 3000;
      d.animate(
        [
          { transform: `translate(0,0) rotate(0deg)` },
          { transform: `translate(${drift}px, ${window.innerHeight + 40}px) rotate(${Math.random()*360}deg)` }
        ],
        { duration: dur, easing: "ease-in" }
      );
      setTimeout(() => d.remove(), dur + 50);
    }
  }, interval);
  host.dataset.confettiTimer = timer;
}

// Petal/flower fall (Onam vibe)
function startPetals(host, colors = ["#fbbf24", "#f59e0b", "#fde68a"], opts = {}) {
  const { interval = 250 } = opts;
  const timer = setInterval(() => {
    const petal = document.createElement("div");
    const w = 6 + Math.random() * 8, h = 10 + Math.random() * 12;
    petal.style.position = "fixed";
    petal.style.left = Math.random() * 100 + "vw";
    petal.style.top = "-20px";
    petal.style.width = w + "px";
    petal.style.height = h + "px";
    petal.style.background = colors[Math.floor(Math.random() * colors.length)];
    petal.style.borderRadius = "50% 50% 50% 50% / 60% 60% 40% 40%";
    petal.style.boxShadow = "0 1px 2px rgba(0,0,0,.15)";
    petal.style.opacity = "0.95";
    petal.style.zIndex = "5";
    host.appendChild(petal);
    const drift = (Math.random() * 80) - 40;
    const dur = 5000 + Math.random() * 3000;
    petal.animate(
      [
        { transform: "translate(0,0) rotate(0deg)" },
        { transform: `translate(${drift}px, ${window.innerHeight + 20}px) rotate(${(Math.random()*2-1)*180}deg)` }
      ],
      { duration: dur, easing: "ease-in" }
    );
    setTimeout(() => petal.remove(), dur + 50);
  }, interval);
  host.dataset.petalTimer = timer;
}

// data.js — AES-GCM encryption, quotes, utils
const DTT = (()=>{

  let key = null; // CryptoKey (in-memory only)
  let encBadgeEl = null, lockBtnEl = null;

  async function deriveKey(userId, passphrase){
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', enc.encode(userId + '|' + passphrase), 'PBKDF2', false, ['deriveKey']);
    const salt = enc.encode('dtt_salt_v1');
    return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:100000, hash:'SHA-256'}, baseKey, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
  }
  function toB64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }
  function fromB64(b64){ return Uint8Array.from(atob(b64), c=>c.charCodeAt(0)); }

  async function encSave(name, value){
    if (!key){ localStorage.setItem(name, JSON.stringify(value)); return; }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(value));
    const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, data);
    localStorage.setItem('enc_'+name, JSON.stringify({v:1, iv: toB64(iv), ct: toB64(ct)}));
    localStorage.removeItem(name);
    sessionStorage.setItem(name+'_cache', JSON.stringify(value));
  }
  async function encLoad(name, fallback){
    const cached = sessionStorage.getItem(name+'_cache');
    if (cached) try{ return JSON.parse(cached); }catch{}
    const raw = localStorage.getItem('enc_'+name);
    if (raw && key){
      try{
        const {iv, ct} = JSON.parse(raw);
        const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv: fromB64(iv)}, key, fromB64(ct));
        const obj = JSON.parse(new TextDecoder().decode(pt));
        sessionStorage.setItem(name+'_cache', JSON.stringify(obj));
        return obj;
      }catch{ return fallback; }
    }
    const legacy = localStorage.getItem(name);
    if (legacy) try{ return JSON.parse(legacy); }catch{}
    return fallback;
  }

  function setBadge(){
    if (!encBadgeEl || !lockBtnEl) return;
    if (!key){ encBadgeEl.textContent='Locked'; lockBtnEl.textContent='Unlock / Enable'; }
    else { encBadgeEl.textContent='Encrypted'; lockBtnEl.textContent='Lock'; }
  }

  async function unlock(userId, passphrase){
    if (!userId) throw new Error('Sign in first');
    if (!passphrase) throw new Error('Passphrase required');
    key = await deriveKey(userId, passphrase);
    setBadge();
    return true;
  }
  function lock(){ key = null; sessionStorage.clear(); setBadge(); }

  async function fetchQuote(symbol){
  try{
    const url = '/.netlify/functions/quote?symbol=' + encodeURIComponent(symbol);
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json(); // {symbol,name,currency,exchange,price}
    if (data && typeof data.price === 'number') return data;
    return null;
  }catch{ return null; }
}
  function yfSymbol(ticker, market){
    if (!ticker) return '';
    if (ticker.includes('.')) return ticker.toUpperCase();
    if (market==='IN') return ticker.toUpperCase()+'.NS';
    return ticker.toUpperCase();
  }
  function uid(){ return Math.random().toString(36).slice(2,9); }

  return { encSave, encLoad, unlock, lock, fetchQuote, yfSymbol, uid, setBadgeRef: (b,btn)=>{encBadgeEl=b; lockBtnEl=btn; setBadge();} };
})();

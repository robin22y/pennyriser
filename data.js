// data.js — AES-GCM encryption, quotes, utils
const DTT = (()=>{
  let key=null; let encBadgeEl=null, lockBtnEl=null;
  function toB64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }
  function fromB64(b64){ return Uint8Array.from(atob(b64), c=>c.charCodeAt(0)); }

  async function deriveKey(userId, passphrase){
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', enc.encode(userId+'|'+passphrase), 'PBKDF2', false, ['deriveKey']);
    const salt = enc.encode('dtt_salt_v2');
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'}, baseKey, {name:'AES-GCM',length:256}, false, ['encrypt','decrypt']);
  }
  async function encSave(name,value){
    if(!key){ localStorage.setItem(name, JSON.stringify(value)); return; }
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const data=new TextEncoder().encode(JSON.stringify(value));
    const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv}, key, data);
    localStorage.setItem('enc_'+name, JSON.stringify({v:2, iv:toB64(iv), ct:toB64(ct)}));
    localStorage.removeItem(name);
    sessionStorage.setItem(name+'_cache', JSON.stringify(value));
  }
  async function encLoad(name,fallback){
    const cached=sessionStorage.getItem(name+'_cache'); if(cached) try{ return JSON.parse(cached);}catch{}
    const raw=localStorage.getItem('enc_'+name);
    if(raw && key){ try{
      const {iv,ct}=JSON.parse(raw);
      const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(iv)}, key, fromB64(ct));
      const obj=JSON.parse(new TextDecoder().decode(pt));
      sessionStorage.setItem(name+'_cache', JSON.stringify(obj));
      return obj;
    }catch{return fallback;} }
    const legacy=localStorage.getItem(name); if(legacy) try{ return JSON.parse(legacy);}catch{}
    return fallback;
  }
  function setBadge(){ if(!encBadgeEl||!lockBtnEl) return; if(!key){encBadgeEl.textContent='Locked'; encBadgeEl.classList.add('locked'); encBadgeEl.classList.remove('encrypted'); lockBtnEl.textContent='Unlock / Enable';} else {encBadgeEl.textContent='Encrypted'; encBadgeEl.classList.remove('locked'); encBadgeEl.classList.add('encrypted'); lockBtnEl.textContent='Lock';} }
  async function unlock(userId, passphrase){ if(!userId) throw new Error('Sign in first'); if(!passphrase) throw new Error('Passphrase required'); key=await deriveKey(userId,passphrase); setBadge(); return true; }
  function lock(){ key=null; sessionStorage.clear(); setBadge(); }

  async function fetchQuote(symbol){
    if(!symbol) return null;
    try{
      const base = (typeof window!=='undefined' && window.FN_BASE) ? window.FN_BASE : '';
      const url = `${base}/.netlify/functions/quote?symbol=${encodeURIComponent(symbol)}`;
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) { console.warn('quote status',symbol,res.status); return null; }
      const data = await res.json();
      if(data && typeof data.price==='number') return data;
      console.warn('quote no price', symbol, data); return null;
    }catch(err){ console.error('quote error',symbol,err); return null; }
  }
  function yfSymbol(ticker, market){ if(!ticker) return ''; if(ticker.includes('.')) return ticker.toUpperCase(); if(market==='IN') return ticker.toUpperCase()+'.NS'; return ticker.toUpperCase(); }
  function uid(){ return Math.random().toString(36).slice(2,9); }
  return { encSave, encLoad, unlock, lock, fetchQuote, yfSymbol, uid, setBadgeRef:(b,btn)=>{encBadgeEl=b; lockBtnEl=btn; setBadge();} };
})();
async function fetchQuote(symbol){
  if (!symbol) return null;
  try{
    const base = (typeof window !== 'undefined' && localStorage.getItem('FN_BASE')) || '';
    const url = `${base}/.netlify/functions/quote?symbol=${encodeURIComponent(symbol)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && typeof data.price === 'number') ? data : null;
  }catch{ return null; }
}

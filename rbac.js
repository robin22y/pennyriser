// rbac.js — RBAC using Firebase custom claims, with client-side fallback to profile doc
const RBAC = (()=>{
  async function current(){
    const claims = window.CURRENT_CLAIMS || {};
    const role = claims.role || 'user';
    const permissions = claims.permissions || { expenses:true, uploads:true, charts:true };
    return { role, permissions };
  }
  return { current };
})();

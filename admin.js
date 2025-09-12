// admin.js — Admin console logic
(async function(){
  document.addEventListener('DOMContentLoaded', ()=>{
    // Buttons
    document.getElementById('annAdd')?.addEventListener('click', addAnnouncementModal);
    document.getElementById('annRefresh')?.addEventListener('click', refreshAdminLists);
    document.getElementById('adAdd')?.addEventListener('click', addAdModal);
    document.getElementById('adRefresh')?.addEventListener('click', refreshAdminLists);
    document.getElementById('seasonSave')?.addEventListener('click', saveSeasonal);
    document.getElementById('seasonPreview')?.addEventListener('click', previewSeasonal);
  });

  async function refreshAdminLists(){
    const cfg = await UI.loadSiteConfig();
    renderAnnList(cfg.announcements||[]);
    renderAdList(cfg.ads||[]);
    hydrateSeasonal(cfg.seasonal||{theme:'none'});
  }

  function renderAnnList(list){
    const box=document.getElementById('annList'); if(!box) return;
    box.innerHTML = (list||[]).map((a,idx)=>`
      <div class="card soft row between">
        <div>
          <div><b>${a.title||'Untitled'}</b> ${a.link?`<a href="${a.link}" target="_blank" rel="noopener">(link)</a>`:''}</div>
          <div class="muted">${a.text||''}</div>
        </div>
        <div class="row gap">
          <button class="btn secondary small" data-ann-edit="${idx}">Edit</button>
          <button class="btn secondary small" data-ann-del="${idx}">Delete</button>
        </div>
      </div>`).join('');
    box.onclick = async (e)=>{
      const edit = e.target.closest('[data-ann-edit]');
      const del = e.target.closest('[data-ann-del]');
      if(edit){ const idx=+edit.dataset.annEdit; await addAnnouncementModal(await getAnn(idx), idx); }
      if(del){ const idx=+del.dataset.annDel; await delAnn(idx); }
    };
  }
  function renderAdList(list){
    const box=document.getElementById('adList'); if(!box) return;
    box.innerHTML = (list||[]).map((a,idx)=>`
      <div class="card soft row between">
        <div>

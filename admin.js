// admin.js — Admin console logic (announcements, seasonal, ads)
(function () {
  // ---------- helpers ----------
  function gid(id) { return document.getElementById(id); }
  function v(id) { const el = gid(id); return el ? String(el.value).trim() : ""; }
  function raw(id) { const el = gid(id); return el ? String(el.value) : ""; }
  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
    }[m]));
  }

  async function getConfig() { return await UI.loadSiteConfig(); }
  async function setConfig(patch) {
    await UI.saveSiteConfig(patch);
    await refreshAdminLists();
    await refreshPublicStrips();
  }

  // ---------- bootstrap ----------
  document.addEventListener("DOMContentLoaded", () => {
    gid("annAdd")?.addEventListener("click", () => addAnnouncementModal());
    gid("annRefresh")?.addEventListener("click", refreshAdminLists);
    gid("adAdd")?.addEventListener("click", () => addAdModal());
    gid("adRefresh")?.addEventListener("click", refreshAdminLists);
    gid("seasonSave")?.addEventListener("click", saveSeasonal);
    gid("seasonPreview")?.addEventListener("click", previewSeasonal);
  });

  // ---------- lists / render ----------
  async function refreshAdminLists() {
    const cfg = await getConfig();
    renderAnnList(cfg.announcements || []);
    renderAdList(cfg.ads || []);
    hydrateSeasonal(cfg.seasonal || { theme: "none" });
  }

  function renderAnnList(list) {
    const box = gid("annList"); if (!box) return;
    box.innerHTML = (list || []).map((a, idx) => {
      const link = a.link ? (' <a href="' + esc(a.link) + '" target="_blank" rel="noopener">(link)</a>') : "";
      return (
        '<div class="card soft row between">' +
          '<div>' +
            '<div><b>' + esc(a.title || "Untitled") + '</b>' + link + '</div>' +
            '<div class="muted">' + esc(a.text || "") + '</div>' +
          '</div>' +
          '<div class="row gap">' +
            '<button class="btn secondary small" data-ann-edit="' + idx + '">Edit</button>' +
            '<button class="btn secondary small" data-ann-del="' + idx + '">Delete</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    box.onclick = async (e) => {
      const edit = e.target.closest("[data-ann-edit]");
      const del  = e.target.closest("[data-ann-del]");
      if (edit) {
        const idx = +edit.dataset.annEdit;
        const cfg = await getConfig();
        const existing = (cfg.announcements || [])[idx];
        await addAnnouncementModal(existing, idx);
      }
      if (del) {
        const idx = +del.dataset.annDel;
        const cfg = await getConfig();
        const list = cfg.announcements || [];
        list.splice(idx, 1);
        await setConfig({ announcements: list });
      }
    };
  }

  function renderAdList(list) {
    const box = gid("adList"); if (!box) return;
    box.innerHTML = (list || []).map((a, idx) => {
      const link = a.link ? (' <a href="' + esc(a.link) + '" target="_blank" rel="noopener">(link)</a>') : "";
      const kind = a.image ? "Image" : (a.html ? "HTML snippet" : "Empty");
      return (
        '<div class="card soft row between">' +
          '<div>' +
            '<div><b>' + esc(a.caption || "Ad") + '</b>' + link + '</div>' +
            '<div class="muted">' + kind + '</div>' +
          '</div>' +
          '<div class="row gap">' +
            '<button class="btn secondary small" data-ad-edit="' + idx + '">Edit</button>' +
            '<button class="btn secondary small" data-ad-del="' + idx + '">Delete</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    box.onclick = async (e) => {
      const edit = e.target.closest("[data-ad-edit]");
      const del  = e.target.closest("[data-ad-del]");
      if (edit) {
        const idx = +edit.dataset.adEdit;
        const cfg = await getConfig();
        const existing = (cfg.ads || [])[idx];
        await addAdModal(existing, idx);
      }
      if (del) {
        const idx = +del.dataset.adDel;
        const cfg = await getConfig();
        const list = cfg.ads || [];
        list.splice(idx, 1);
        await setConfig({ ads: list });
      }
    };
  }

  // ---------- modals ----------
  async function addAnnouncementModal(existing = null, idx = null) {
    const html =
      '<div class="grid2">' +
        '<label>Title <input id="ann_title" value="' + esc(existing?.title || "") + '"></label>' +
        '<label>Link <input id="ann_link" value="' + esc(existing?.link || "") + '" placeholder="https://..."></label>' +
        '<label>Text <input id="ann_text" value="' + esc(existing?.text || "") + '"></label>' +
        '<label>Image URL <input id="ann_image" value="' + esc(existing?.image || "") + '" placeholder="https://..."></label>' +
      '</div>';

    modalOpen({
      title: idx == null ? "Add Announcement" : "Edit Announcement",
      body: html,
      onOk: async () => {
        const a = {
          title: v("ann_title"),
          link: v("ann_link"),
          text: v("ann_text"),
          image: v("ann_image")
        };
        const cfg  = await getConfig();
        const list = cfg.announcements || [];
        if (idx == null) list.unshift(a); else list[idx] = a;
        await setConfig({ announcements: list });
      }
    });
  }

  async function addAdModal(existing = null, idx = null) {
    const html =
      '<div class="grid2">' +
        '<label>Caption <input id="ad_caption" value="' + esc(existing?.caption || "") + '"></label>' +
        '<label>Click Link <input id="ad_link" value="' + esc(existing?.link || "") + '" placeholder="https://..."></label>' +
        '<label>Image URL <input id="ad_image" value="' + esc(existing?.image || "") + '" placeholder="https://... (leave empty if using HTML)"></label>' +
        '<label>HTML Snippet <textarea id="ad_html" rows="4" placeholder="Optional raw HTML (CSP must allow)">' + esc(existing?.html || "") + '</textarea></label>' +
      '</div>';

    modalOpen({
      title: idx == null ? "Add Ad" : "Edit Ad",
      body: html,
      onOk: async () => {
        const a = {
          caption: v("ad_caption"),
          link: v("ad_link"),
          image: v("ad_image"),
          html: raw("ad_html") // allow raw HTML here intentionally
        };
        const cfg  = await getConfig();
        const list = cfg.ads || [];
        if (idx == null) list.unshift(a); else list[idx] = a;
        await setConfig({ ads: list });
      }
    });
  }

  // ---------- seasonal ----------
  function hydrateSeasonal(s) {
    const theme = gid("seasonTheme");
    const start = gid("seasonStart");
    const end   = gid("seasonEnd");
    const msg   = gid("seasonMsg");
    if (theme) theme.value = s.theme || "none";
    if (start) start.value = s.start || "";
    if (end)   end.value   = s.end   || "";
    if (msg)   msg.value   = s.message || "";
  }

  async function saveSeasonal() {
    const s = {
      theme: gid("seasonTheme")?.value || "none",
      start: gid("seasonStart")?.value || "",
      end:   gid("seasonEnd")?.value || "",
      message: gid("seasonMsg")?.value || ""
    };
    await setConfig({ seasonal: s });
  }

  async function previewSeasonal() {
    const s = {
      theme: gid("seasonTheme")?.value || "none",
      start: gid("seasonStart")?.value || "",
      end:   gid("seasonEnd")?.value || "",
      message: gid("seasonMsg")?.value || ""
    };
    UI.applySeasonal(s);
  }

  // ---------- public strips ----------
  async function refreshPublicStrips() {
    const cfg = await getConfig();
    UI.renderAnnouncements(cfg.announcements || []);
    UI.applySeasonal(cfg.seasonal || { theme: "none" });
    UI.renderAds(cfg.ads || []);
  }

  // Expose for app init
  window.__ADMIN__ = { refreshAdminLists, refreshPublicStrips };
})();

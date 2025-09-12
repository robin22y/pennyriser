const $ = sel => document.querySelector(sel);
await DTT.unlock(user.uid, pass);
$('#authPanel').classList.add('hidden');
$('#userInfo').textContent = `${user.email||'Google account'} — ${currentRBAC.role}`;
await loadAllLocal();
await __ADMIN__.refreshPublicStrips();
render(); showTab('watch');
};
window.onSignedOut = ()=>{ currentUser=null; $('#authPanel').classList.remove('hidden'); showOnly('#authPanel'); };


document.addEventListener('DOMContentLoaded', ()=>{
DTT.setBadgeRef($('#encBadge'), $('#btnLock')); $('#btnLock').onclick=()=> DTT.lock();
$$('.tabs button').forEach(btn=> btn.addEventListener('click', ()=> showTab(btn.dataset.tab)));
$('#homeBtn')?.addEventListener('click', ()=> showTab('watch'));


// actions
$('#btnAddTicker')?.addEventListener('click', addTickerModal);
$('#btnRefreshQuotes')?.addEventListener('click', refreshQuotes);
$('#btnNewEntry')?.addEventListener('click', newJournalEntryModal);
$('#btnImportTrades')?.addEventListener('click', ()=> importTrades('journal'));
$('#btnAddExpense')?.addEventListener('click', addExpenseModal);
$('#btnImportExpenses')?.addEventListener('click', ()=> importTrades('expenses'));
});


async function loadAllLocal(){ const p=currentUser.uid; state.tickers=await DTT.encLoad(p+'_tickers',[]); state.journal=await DTT.encLoad(p+'_journal',[]); state.expenses=await DTT.encLoad(p+'_expenses',[]); }
async function saveLocal(kind){ const p=currentUser.uid; if(kind==='tickers') return DTT.encSave(p+'_tickers',state.tickers); if(kind==='journal') return DTT.encSave(p+'_journal',state.journal); if(kind==='expenses') return DTT.encSave(p+'_expenses',state.expenses); }


function showOnly(sel){ $('#authPanel').classList.add('hidden'); ['#tab-watch','#tab-journal','#tab-expenses','#tab-admin'].forEach(id=> $(id)?.classList.add('hidden')); $(sel)?.classList.remove('hidden'); }
function showTab(tab){ if(!currentUser) return; if(tab==='expenses' && !currentRBAC.permissions.expenses) return alert('Access to Expenses is disabled by admin.'); if(tab==='admin' && currentRBAC.role!=='admin') return alert('Admins only.'); showOnly('#tab-'+tab); if(tab==='admin'){ __ADMIN__.refreshAdminLists(); } render(); }


// ===== Watchlist =====
function renderWatch(){ const el=$('#watchTable'); const rows=state.tickers.map(t=>{ const key=t.ticker+'|'+t.market; const q=state.prices[key]; const live=q&&q.price!=null? `${q.price.toFixed(2)} ${q.currency||''}` : '—'; return `<tr>
<td><b>${t.ticker}</b> <small class=muted>(${t.market})</small></td>
<td>${t.theme||''}</td><td>${t.tier||''}</td><td>${t.stage||''}</td>
<td>${live}</td><td>${t.breakout||''}</td><td>${t.stop||''}</td><td>${t.targets||''}</td><td>${t.rs||''}</td><td>${t.notes||''}</td>
<td class="right">
<button class="btn secondary small" data-act="chart" data-ticker="${t.ticker}" data-market="${t.market}">Chart</button>
<button class="btn secondary small" data-act="edit" data-id="${t.id}">Edit</button>
<button class="btn secondary small" data-act="del" data-id="${t.id}">Del</button>
</td>
</tr>`; }).join(''); el.innerHTML = `<table><thead><tr><th>Ticker</th><th>Theme</th><th>Tier</th><th>Stage</th><th>Live</th><th>BO</th><th>Stop</th><th>Targets</th><th>RS</th><th>Notes</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan=11>No tickers</td></tr>'}</tbody></table>`; el.onclick=(e)=>{ const btn=e.target.closest('button[data-act]'); if(!btn) return; const a=btn.dataset.act; if(a==='chart') openChart(btn.dataset.ticker,btn.dataset.market); else if(a==='edit') editTicker(btn.dataset.id); else if(a==='del') delTicker(btn.dataset.id); } }


function addTickerModal(){ modalOpen({ title:'Add Ticker', body:`<div class=grid2>
<label>Ticker <input id=f_ticker placeholder="IONQ / IDEAFORGE.NS"></label>
<label>Market <select id=f_market><option>US</option><option>IN</option></select></label>
<label>Theme <input id=f_theme></label>
<label>Tier <select id=f_tier><option>A</option><option>B</option><option>C</option></select></label>
<label>Stage <input id=f_stage placeholder="Stage 1/2"></label>
<label>Breakout <input id=f_bo></label>
<label>Stop <input id=f_stop></label>
<label>Targets <input id=f_targets></label>
<label>RS <input id=f_rs></label>
<label>Notes <input id=f_notes></label>
</div>`, onOk: async()=>{ const t={ id:DTT.uid(), ticker:$('#f_ticker').value.trim().toUpperCase(), market:$('#f_market').value, theme:$('#f_theme').value, tier:$('#f_tier').value, stage:$('#f_stage').value, breakout:$('#f_bo').value, stop:$('#f_stop').value, targets:$('#f_targets').value, rs:$('#f_rs').value, notes:$('#f_notes').value }; state.tickers.unshift(t); await saveLocal('tickers'); renderWatch(); }}); }
function editTicker(id){ /* TODO */ }
function delTicker(id){ state.tickers=state.tickers.filter(t=>t.id!==id); saveLocal('tickers'); renderWatch(); }


async function refreshQuotes(){ const list=state.tickers.slice(0,50); await Promise.all(list.map(async t=>{ const key=t.ticker+'|'+t.market; const sym=DTT.yfSymbol(t.ticker,t.market); if(!sym) return; const q=await DTT.fetchQuote(sym); if(q) state.prices[key]=q; else console.warn('No quote', t); })); renderWatch(); }
function openChart(ticker,market){ /* unchanged TradingView iframe as before */ const tvSym = market==='IN'? `NSE:${ticker.replace(/\.NS|\.BO/i,'')}` : `NASDAQ:${ticker}`; modalOpen({title:`${ticker} — Chart`, body:`<div class=card><iframe title=tv style="width:100%;height:420px;border:1px solid #e2e8f0;border-radius:12px" src="https://s.tradingview.com/widgetembed/?frameElementId=tv&symbol=${encodeURIComponent(tvSym)}&interval=D&theme=light&hideideas=1"></iframe></div>`, okText:'Close', onOk:()=>{} }); }


// ===== Journal & Expenses (reuse from v1 with your mappers) =====
function renderJournal(){ /* same as v1 */ }
function newJournalEntryModal(){ /* same as v1 */ }
function importTrades(kind){ /* same as v1 + Zerodha mapper you added */ }
function renderExpenses(){ /* same as v1 */ }
function addExpenseModal(){ /* same as v1 */ }


function render(){ renderWatch(); renderJournal(); renderExpenses(); if(currentRBAC.role!=='admin'){ $('#tab-admin')?.classList.add('hidden'); } }


// Modal helper
let modalOpen=(opts)=>{ const dlg=$('#modal'), body=$('#modalContent'), ok=$('#modalOk'), cancel=$('#modalCancel'); body.innerHTML=`<h3>${opts.title||''}</h3>`+(opts.body||''); ok.textContent=opts.okText||'OK'; ok.onclick=()=>{ try{ opts.onOk&&opts.onOk(); dlg.close(); }catch(e){ alert(e.message||'error'); } }; cancel.onclick=()=> dlg.close(); dlg.showModal(); };
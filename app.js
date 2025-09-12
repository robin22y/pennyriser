// app.js — main UI with Firebase Auth + Firestore + RBAC (Google + Email/Password)

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let currentUser = null; // firebase.User
let currentRBAC = { role:'user', permissions:{ expenses:true, uploads:true, charts:true } };
let state = { tickers:[], journal:[], expenses:[], prices:{} };

window.onSignedIn = async (user, claims) => {
  currentUser = user;
  currentRBAC = await RBAC.current();

  // unlock prompt (encryption key)
  const pass = $('#pass').value.trim() || prompt('Enter passphrase to unlock your encrypted data');
  if (!pass){ alert('Passphrase required to unlock. You can sign out and try again.'); return; }
  await DTT.unlock(user.uid, pass);

  // UI tweaks
  $('#authPanel').classList.add('hidden');
  $('#userInfo').textContent = `${user.email || 'Google account'} — ${currentRBAC.role}`;

  // load encrypted docs from local cache first (fast), then merge Firestore if you want (optional)
  await loadAllLocal(); // local cache (best UX)
  render();
  showTab('watch');
};

window.onSignedOut = () => {
  currentUser = null;
  $('#authPanel').classList.remove('hidden');
  showOnly('#authPanel');
};

document.addEventListener('DOMContentLoaded', () => {
  // enc badge
  DTT.setBadgeRef($('#encBadge'), $('#btnLock'));
  $('#btnLock').onclick = () => DTT.lock();

  // tabs
  $$('.tabs button').forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));

  // actions
  $('#btnAddTicker').addEventListener('click', addTickerModal);
  $('#btnRefreshQuotes').addEventListener('click', refreshQuotes);
  $('#btnNewEntry').addEventListener('click', newJournalEntryModal);
  $('#btnImportTrades').addEventListener('click', ()=> importTrades('journal'));
  $('#btnAddExpense').addEventListener('click', addExpenseModal);
  $('#btnImportExpenses').addEventListener('click', ()=> importTrades('expenses'));
});

async function loadAllLocal(){
  const prefix = currentUser.uid;
  state.tickers = await DTT.encLoad(prefix+'_tickers', []);
  state.journal = await DTT.encLoad(prefix+'_journal', []);
  state.expenses = await DTT.encLoad(prefix+'_expenses', []);
}

async function saveLocal(kind){
  const prefix = currentUser.uid;
  if (kind==='tickers') return DTT.encSave(prefix+'_tickers', state.tickers);
  if (kind==='journal') return DTT.encSave(prefix+'_journal', state.journal);
  if (kind==='expenses') return DTT.encSave(prefix+'_expenses', state.expenses);
}

// --- UI helpers ---
function showOnly(sel){
  $('#authPanel').classList.add('hidden');
  ['#tab-watch','#tab-journal','#tab-expenses','#tab-admin'].forEach(id => $(id).classList.add('hidden'));
  $(sel).classList.remove('hidden');
}
function showTab(tab){
  if (!currentUser) return;
  if (tab==='expenses' && !currentRBAC.permissions.expenses) return alert('Access to Expenses is disabled by admin.');
  if (tab==='admin' && currentRBAC.role!=='admin') return alert('Admins only.');
  showOnly('#tab-'+tab);
  render();
}

// ====== WATCHLIST ======
function renderWatch(){
  const el = $('#watchTable');
  const rows = state.tickers.map(t=>{
    const key = t.ticker+'|'+t.market;
    const q = state.prices[key];
    const live = q && q.price!=null ? `${q.price.toFixed(2)} ${q.currency||''}` : '—';
    return `<tr>
      <td><b>${t.ticker}</b> <small class="muted">(${t.market})</small></td>
      <td>${t.theme||''}</td>
      <td>${t.tier||''}</td>
      <td>${t.stage||''}</td>
      <td>${live}</td>
      <td>${t.breakout||''}</td>
      <td>${t.stop||''}</td>
      <td>${t.targets||''}</td>
      <td>${t.rs||''}</td>
      <td>${t.notes||''}</td>
      <td class="right">
        <button class="btn secondary small" onclick="openChart('${t.ticker}','${t.market}')">Chart</button>
        <button class="btn secondary small" onclick="editTicker('${t.id}')">Edit</button>
        <button class="btn secondary small" onclick="delTicker('${t.id}')">Del</button>
      </td>
    </tr>`;
  }).join('');
  el.innerHTML = `<table>
    <thead><tr><th>Ticker</th><th>Theme</th><th>Tier</th><th>Stage</th><th>Live</th><th>BO</th><th>Stop</th><th>Targets</th><th>RS</th><th>Notes</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="11">No tickers</td></tr>'}</tbody>
  </table>`;
}

function addTickerModal(){
  modalOpen({ title:'Add Ticker', body: `
    <div class="grid2">
      <label>Ticker <input id="f_ticker" placeholder="IONQ / IDEAFORGE.NS" /></label>
      <label>Market
        <select id="f_market">
          <option>US</option><option>IN</option>
        </select>
      </label>
      <label>Theme <input id="f_theme" /></label>
      <label>Tier <select id="f_tier"><option>A</option><option>B</option><option>C</option></select></label>
      <label>Stage <input id="f_stage" placeholder="Stage 1/2" /></label>
      <label>Breakout <input id="f_bo" /></label>
      <label>Stop <input id="f_stop" /></label>
      <label>Targets <input id="f_targets" /></label>
      <label>RS <input id="f_rs" /></label>
      <label>Notes <input id="f_notes" /></label>
    </div>
    <small class="muted">India: add <b>.NS</b> or <b>.BO</b> suffix.</small>
  `, onOk: async ()=>{
    const t = {
      id: DTT.uid(),
      ticker: $('#f_ticker').value.trim().toUpperCase(),
      market: $('#f_market').value,
      theme: $('#f_theme').value, tier: $('#f_tier').value, stage: $('#f_stage').value,
      breakout: $('#f_bo').value, stop: $('#f_stop').value, targets: $('#f_targets').value, rs: $('#f_rs').value,
      notes: $('#f_notes').value
    };
    state.tickers.unshift(t); await saveLocal('tickers'); renderWatch();
  }});
}

function editTicker(id){ /* omitted for brevity */ }
function delTicker(id){ state.tickers = state.tickers.filter(t=> t.id!==id); saveLocal('tickers'); renderWatch(); }

async function refreshQuotes(){
  const list = state.tickers.slice(0,50);
  await Promise.all(list.map(async t=>{
    const key = t.ticker+'|'+t.market;
    const sym = DTT.yfSymbol(t.ticker, t.market);
    const q = await DTT.fetchQuote(sym);
    if (q) state.prices[key] = q;
  }));
  renderWatch();
}

function openChart(ticker, market){
  if (!currentRBAC.permissions.charts) return alert('Chart access disabled by admin.');
  const tvSym = market==='IN' ? `NSE:${ticker.replace(/\\.NS|\\.BO/i,'')}` : `NASDAQ:${ticker}`;
  modalOpen({ title: `${ticker} — Chart`, body: `
    <div class="card">
      <iframe title="tv" style="width:100%;height:420px;border:1px solid #e2e8f0;border-radius:12px"
        src="https://s.tradingview.com/widgetembed/?frameElementId=tv&symbol=${encodeURIComponent(tvSym)}&interval=D&theme=light&hideideas=1"></iframe>
    </div>
  `, okText:'Close', onOk: ()=>{} });
}

// ====== JOURNAL ======
function renderJournal(){
  const rows = state.journal.map(j=>`
    <tr>
      <td>${j.date||''}</td>
      <td><b>${j.ticker}</b> <small class="muted">(${j.market})</small></td>
      <td>${j.side}</td>
      <td class="right">${j.qty||''}</td>
      <td class="right">${j.price||''}</td>
      <td class="right">${j.stop||''}</td>
      <td class="right">${j.target||''}</td>
      <td>${j.emotion||''}</td>
      <td>${j.confidence||''}</td>
      <td>${(j.tags||[]).join(', ')}</td>
      <td class="right">${j.realized!=null ? (j.realized>=0?'+':'')+Number(j.realized).toFixed(2) : ''}</td>
    </tr>`).join('');
  $('#journalTable').innerHTML = `<table>
    <thead><tr><th>Date</th><th>Ticker</th><th>Side</th><th>Qty</th><th>Price</th><th>Stop</th><th>Target</th><th>Emotion</th><th>Conf</th><th>Tags</th><th>P&L</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="11">No entries</td></tr>'}</tbody>
  </table>`;
}

function newJournalEntryModal(){
  modalOpen({ title:'New Journal Entry', body:`
    <div class="grid2">
      <label>Ticker <input id="j_ticker" placeholder="IONQ / IDEAFORGE.NS"/></label>
      <label>Market <select id="j_market"><option>US</option><option>IN</option></select></label>
      <label>Side <select id="j_side"><option>BUY</option><option>SELL</option></select></label>
      <label>Qty <input id="j_qty" type="number"/></label>
      <label>Price <input id="j_price" type="number"/></label>
      <label>Stop <input id="j_stop" type="number"/></label>
      <label>Target <input id="j_target" type="number"/></label>
      <label>Emotion <select id="j_emotion"><option>Calm</option><option>FOMO</option><option>Fear</option><option>Greed</option><option>Overconfidence</option><option>Frustration</option></select></label>
      <label>Confidence (1-5) <input id="j_conf" type="number" min="1" max="5" value="3"/></label>
      <label>Tags <input id="j_tags" placeholder="comma separated"/></label>
      <label>Date <input id="j_date" type="date" value="${new Date().toISOString().slice(0,10)}"/></label>
    </div>
  `, onOk: async ()=>{
    const j = {
      id: DTT.uid(), date: $('#j_date').value, ticker: $('#j_ticker').value.toUpperCase(), market: $('#j_market').value,
      side: $('#j_side').value, qty: Number($('#j_qty').value||0), price: Number($('#j_price').value||0),
      stop: $('#j_stop').value, target: $('#j_target').value, emotion: $('#j_emotion').value,
      confidence: Number($('#j_conf').value||3), tags: ($('#j_tags').value||'').split(',').map(s=>s.trim()).filter(Boolean)
    };
    state.journal.unshift(j); await saveLocal('journal'); renderJournal();
  }});
}

function importTrades(kind){
  if (!currentRBAC.permissions.uploads) return alert('Uploads disabled by admin.');
  const input = document.createElement('input');
  input.type='file'; input.accept='.csv,.xlsx,.xls,.txt';
  input.onchange = async (e)=>{
    const file = e.target.files[0]; if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    let text='';
    if (ext==='csv' || ext==='txt'){ text = await file.text(); }
    else if (ext==='xlsx' || ext==='xls'){
      if (!window.XLSX){ alert('XLSX parser not loaded. Export CSV or include SheetJS.'); return; }
      const data = await file.arrayBuffer(); const wb = XLSX.read(data,{type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]]; text = XLSX.utils.sheet_to_csv(ws);
    } else { return alert('Unsupported file type'); }

    const rows = parseCSV(text);
    if (kind==='journal'){
      const mapped = mapIBKR(rows).concat(mapT212(rows));
      if (!mapped.length) return alert('No trades detected');
      state.journal = mapped.concat(state.journal); await saveLocal('journal'); renderJournal();
    }else{
      const exps = mapGenericBank(rows,'Bank');
      if (!exps.length) return alert('No expenses detected');
      state.expenses = exps.concat(state.expenses); await saveLocal('expenses'); renderExpenses();
    }
  };
  input.click();
}

// CSV + mappers (minimal)
function parseCSV(text){
  const lines = text.replace(/\r/g,'').split('\n').filter(Boolean);
  let headerIdx = 0;
  for (let i=0;i<Math.min(10,lines.length);i++){ if ((lines[i].match(/,/g)||[]).length>=2){ headerIdx=i; break; } }
  const headers = lines[headerIdx].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
  const rows=[];
  for (let i=headerIdx+1;i<lines.length;i++){
    const cols = smartSplitCSV(lines[i]);
    if (cols.length < headers.length) continue;
    const row={}; headers.forEach((h,idx)=> row[h]= (cols[idx]||'').trim().replace(/^"|"$/g,''));
    rows.push(row);
  }
  return rows;
}
function smartSplitCSV(line){
  const out=[]; let cur=''; let inQ=false;
  for (let i=0;i<line.length;i++){
    const ch=line[i];
    if (ch=='"'){ inQ = !inQ; cur+=ch; }
    else if (ch===',' && !inQ){ out.push(cur); cur=''; }
    else { cur+=ch; }
  }
  out.push(cur); return out;
}
function mapIBKR(rows){
  const H=s=> s?.toLowerCase?.()||'';
  const entries=[];
  for (const r of rows){
    const keys=Object.keys(r);
    const by=name=> keys.find(k=> H(k).includes(name));
    const sym = r[by('symbol')] || r[by('underlying')] || '';
    if (!sym) continue;
    const qty = Number(r[by('quantity')]||0);
    const price = Number(r[by('t. price')]|| r[by('price')]||0);
    const sideRaw = (r[by('buy/sell')]||'').toUpperCase();
    const side = sideRaw.includes('BUY')? 'BUY' : sideRaw.includes('SELL')? 'SELL' : (qty>0? 'BUY':'SELL');
    const date = (r[by('date/time')]||'').split(' ')[0] || r[by('date')] || '';
    const realized = Number(r[by('realized p')]|| r[by('realized')]|| r[by('p/l')]||0);
    if (!qty||!price) continue;
    entries.push({ id:DTT.uid(), date, ticker: sym.toUpperCase(), market:'US', side, qty: Math.abs(qty), price, realized });
  }
  return entries;
}
function mapT212(rows){
  const entries=[];
  for (const r of rows){
    const action = (r['Action']||'').toUpperCase();
    if (!(action.includes('BUY') || action.includes('SELL'))) continue;
    const ticker = (r['Ticker']||'').toUpperCase();
    const qty = Number(r['No. of shares']|| r['Quantity']||0);
    const price = Number(String(r['Price / share']||'').replace(/[^0-9\.-]/g,''));
    const date = (r['Time']||'').split(' ')[0] || r['Date'] || '';
    let realized=null; if (r['Result']){ const v=Number(String(r['Result']).replace(/[^0-9\.-]/g,'')); if (!isNaN(v)) realized=v; }
    const side = action.includes('BUY')? 'BUY':'SELL';
    if (!qty||!price||!ticker) continue;
    entries.push({ id:DTT.uid(), date, ticker, market:'US', side, qty:Math.abs(qty), price, realized });
  }
  return entries;
}
function mapGenericBank(rows, account){
  const H=s=> s?.toLowerCase?.()||''; const entries=[];
  for (const r of rows){
    const keys=Object.keys(r); const by=name=> keys.find(k=> H(k).includes(name));
    const date = r[by('date')] || r[by('transaction date')] || r[by('posting')] || '';
    const desc = (r[by('description')] || r[by('narration')] || r[by('details')] || r[by('merchant')] || '').toString();
    let amountStr = r[by('amount')]; const debit = r[by('debit')]; const credit = r[by('credit')]; const type = (r[by('type')]||'').toLowerCase();
    let amt=0;
    if (debit || credit){ const d=Number(String(debit).replace(/[^0-9.-]/g,''))||0; const c=Number(String(credit).replace(/[^0-9.-]/g,''))||0; amt = d>0? d : -c; }
    else if (amountStr!=null){ const val=Number(String(amountStr).replace(/[^0-9.-]/g,''))||0; if (type.includes('debit')||type.includes('withdraw')||type.includes('payment')) amt=Math.abs(val); else if (type.includes('credit')||type.includes('refund')||type.includes('salary')) amt=-Math.abs(val); else amt= val>=0? Math.abs(val): val; }
    const merchant = desc.trim()||'Misc';
    const category = guessCategory(merchant);
    const iso = normalizeDate(date);
    entries.push({ id:DTT.uid(), date:iso, merchant, amount:amt, category, account, notes:'' });
  }
  return entries;
}
function normalizeDate(s){
  const t=String(s||'').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const parts=t.replace(/[.]/g,'/').split(/[\/\-]/).filter(Boolean);
  if (parts.length===3){
    let [a,b,c]=parts;
    if (a.length===4) return `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`;
    const dd=Number(a), mm=Number(b), yy=c.length===2? '20'+c : c;
    if (dd>12) return `${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
    return `${yy}-${String(dd).padStart(2,'0')}-${String(mm).padStart(2,'0')}`;
  }
  try{ return new Date(t).toISOString().slice(0,10); }catch{return new Date().toISOString().slice(0,10);}
}
function guessCategory(desc){
  const d = desc.toLowerCase();
  const map = [
    ['Groceries', ['grocery','supermarket','dmart','aldi','tesco','walmart','reliance fresh']],
    ['Dining', ['swiggy','zomato','restaurant','kfc','mcdonald','dominos','cafe','bar']],
    ['Transport', ['uber','ola','fuel','petrol','diesel','metro','train','bus']],
    ['Shopping', ['amazon','flipkart','myntra','target','ikea','best buy']],
    ['Bills', ['electric','water','gas','broadband','jio','airtel','rent']],
    ['Health', ['pharmacy','hospital','clinic','lab']],
    ['Entertainment', ['netflix','prime','hotstar','spotify','cinema']],
    ['Travel', ['airlines','hotel','booking.com','expedia','makemytrip']],
    ['Income', ['salary','refund','reversal','cashback']]
  ];
  for (const [cat,keys] of map){ if (keys.some(k=> d.includes(k))) return cat; }
  return 'Other';
}

// ====== EXPENSES ======
function renderExpenses(){
  const month = new Date().toISOString().slice(0,7);
  const list = state.expenses.filter(e=> (e.date||'').startsWith(month));
  const spent = list.filter(e=> e.amount>=0).reduce((s,e)=> s+e.amount, 0);
  const income = list.filter(e=> e.amount<0).reduce((s,e)=> s-e.amount, 0);
  $('#expenseSummary').innerHTML = `<div class="row gap">
    <div><b>Spent:</b> ${spent.toFixed(2)}</div>
    <div><b>Income:</b> ${income.toFixed(2)}</div>
    <div><b>#:</b> ${list.length}</div>
  </div>`;
  const rows = list.map(e=> `<tr>
    <td>${e.date}</td><td>${e.merchant}</td><td>${e.category}</td><td>${e.account||''}</td>
    <td class="right">${e.amount>=0?'-':''}${Math.abs(e.amount).toFixed(2)}</td>
    <td>${e.notes||''}</td>
  </tr>`).join('');
  $('#expenseTable').innerHTML = `<table>
    <thead><tr><th>Date</th><th>Merchant</th><th>Category</th><th>Account</th><th>Amount</th><th>Notes</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">No expenses this month</td></tr>'}</tbody>
  </table>`;
}

// ====== ADMIN (claims are set server-side; this is read-only display) ======
function renderAdmin(){
  if (currentRBAC.role!=='admin'){ $('#tab-admin').classList.add('hidden'); return; }
  $('#adminUsers').innerHTML = `<p class="muted">Manage claims with <code>functions/assignClaims.js</code>. This UI intentionally avoids write access from the client. Read current claims in console: <code>window.CURRENT_CLAIMS</code>.</p>`;
}

// ====== RENDER ROOT ======
function render(){ renderWatch(); renderJournal(); renderExpenses(); renderAdmin(); }

// ====== MODAL ======
let modalOpen = (opts)=>{
  const dlg = document.getElementById('modal');
  const body = document.getElementById('modalContent');
  const ok = document.getElementById('modalOk');
  const cancel = document.getElementById('modalCancel');
  body.innerHTML = `<h3>${opts.title||''}</h3>` + (opts.body||'');
  ok.textContent = opts.okText || 'OK';
  ok.onclick = ()=>{ try{ opts.onOk&&opts.onOk(); dlg.close(); }catch(e){ alert(e.message||'error'); } };
  cancel.onclick = ()=> dlg.close();
  dlg.showModal();
};

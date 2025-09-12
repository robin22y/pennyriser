exports.handler = async (event)=>{
const symbol=(event.queryStringParameters?.symbol||'').trim();
if(!symbol) return json(400,{error:'Missing symbol'});
try{
const url=`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
const resp=await fetch(url,{ headers:{ 'User-Agent':'Mozilla/5.0' } });
if(!resp.ok) return json(resp.status,{error:`Upstream ${resp.status}`});
const raw=await resp.json(); const r=raw?.quoteResponse?.result?.[0];
if(!r) return json(404,{error:'Symbol not found',symbol});
const payload={ symbol:r.symbol, name:r.shortName||r.longName||r.displayName||r.symbol, currency:r.currency||null, exchange:r.fullExchangeName||r.exchange||null, price:(typeof r.regularMarketPrice==='number'? r.regularMarketPrice : (typeof r.postMarketPrice==='number'? r.postMarketPrice : (typeof r.preMarketPrice==='number'? r.preMarketPrice : null))), ts:r.regularMarketTime||null };
return json(200,payload,{ 'Cache-Control':'public, max-age=30' });
}catch(err){ return json(500,{error:err.message||'Unknown error'}); }
};
function json(statusCode, body, extraHeaders={}){ return { statusCode, body: JSON.stringify(body), headers:{ 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*', ...extraHeaders } }; }
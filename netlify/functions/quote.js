// netlify/functions/quote.js
export async function handler(event) {
  try {
    const symbol = (event.queryStringParameters.symbol || '').trim();
    if (!symbol) return resp(400, { error: 'Missing ?symbol=' });

    const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(symbol);
    const r = await fetch(url);
    if (!r.ok) return resp(r.status, { error: 'Upstream error ' + r.status });
    const data = await r.json();
    const q = data?.quoteResponse?.result?.[0];
    if (!q) return resp(404, { error: 'No quote' });

    const price = q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice ?? null;
    return resp(200, {
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      currency: q.currency || '',
      exchange: q.fullExchangeName || '',
      price
    });
  } catch (e) {
    return resp(500, { error: e.message || String(e) });
  }
}
function resp(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
  };
}

import { createHash } from 'node:crypto';
import { parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

export const BASE_URL = 'http://pandadata.pandaaiquant.com/pandaData';
export const API_PATHS = Object.freeze({
  get_index_daily: '/multi/getIndexDaily',
  get_stock_daily_pre: '/multi/getStockDailyPre',
  get_trade_cal: '/tradeCalendar/getTradeCalendarData',
});
const hash = b => createHash('sha256').update(b).digest('hex');
const plain = value => typeof value === 'bigint' ? Number(value)
  : Array.isArray(value) ? value.map(plain)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k,v]) => [k,plain(v)])) : value;

export async function decodeResponse(bytes, contentType) {
  if (contentType.includes('parquet') || Buffer.from(bytes, 0, 4).toString() === 'PAR1') {
    return plain(await parquetReadObjects({ file: bytes, compressors }));
  }
  const data = JSON.parse(Buffer.from(bytes).toString('utf8'));
  if (data.code !== undefined && String(data.code) !== '200') throw new Error(`Panda Data API error (code ${String(data.code).replace(/[^\w-]/g,'')})`);
  const rows = Array.isArray(data) ? data : data.data;
  if (!Array.isArray(rows)) throw new Error('Panda Data returned a non-tabular response');
  return plain(rows);
}

export async function login({ username, password }, { fetchImpl = fetch, timeoutMs = 20000 } = {}) {
  if (!username || !password) throw new Error('Panda Data local credentials are missing');
  const response = await fetchImpl(`${BASE_URL}/dataUser/login`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: createHash('md5').update(password).digest('hex') }),
  });
  if (!response.ok) throw new Error(`Panda Data login HTTP ${response.status}`);
  const data = await response.json();
  if (String(data.code) !== '200' || typeof data.data !== 'string') {
    throw new Error(`Panda Data login rejected (code ${String(data.code).replace(/[^\w-]/g,'')})`);
  }
  return data.data; // Memory only; never logged or persisted.
}

export function validateQuery(api, params) {
  if (!Object.hasOwn(API_PATHS, api)) throw new Error('API is not on the read-only allowlist');
  const allowed = api === 'get_trade_cal' ? ['startDate','endDate','exchange','isTradingDay','fields'] : ['symbols','startDate','endDate','fields'];
  if (Object.keys(params).some(k => !allowed.includes(k))) throw new Error('Unexpected query field');
  for (const key of ['startDate','endDate']) {
    const v = params[key];
    if (!/^\d{8}$/.test(v || '')) throw new Error('Dates must be YYYYMMDD');
    const date = new Date(`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6)}T00:00:00Z`);
    if (!Number.isFinite(+date) || date.toISOString().slice(0,10).replaceAll('-','') !== v) throw new Error('Invalid calendar date');
  }
  const day = s => Date.parse(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6)}T00:00:00Z`);
  const span = day(params.endDate) - day(params.startDate);
  if (span < 0 || span > 400 * 86400000) throw new Error('Query must span 0–400 calendar days');
  if (api !== 'get_trade_cal' && (!Array.isArray(params.symbols) || !params.symbols.length || params.symbols.length > 5 || params.symbols.some(s => !/^\d{6}\.(SH|SZ)$/.test(s)))) throw new Error('Invalid symbols');
  if (api === 'get_trade_cal' && params.exchange !== 'SH') throw new Error('Only Shanghai calendar is supported');
  if (params.fields !== undefined && (!Array.isArray(params.fields) || params.fields.some(f => typeof f !== 'string'))) throw new Error('Invalid fields');
}

export function createPandaDataClient(credentials, { fetchImpl = fetch, timeoutMs = 30000 } = {}) {
  let token;
  async function queryWithProvenance(api, params) {
    validateQuery(api, params);
    for (let attempt = 0; attempt < 2; attempt++) {
      token ||= await login(credentials, { fetchImpl, timeoutMs });
      const requestedAt = new Date().toISOString();
      const response = await fetchImpl(`${BASE_URL}${API_PATHS[api]}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
        headers: { 'Content-Type': 'application/json', Authorization: token }, body: JSON.stringify(params),
      });
      if (response.status === 401 && attempt === 0) { token = undefined; continue; }
      if (!response.ok) throw new Error(`Panda Data query HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 20 * 1024 * 1024) throw new Error('Panda Data response exceeds size limit');
      const contentType = response.headers.get('content-type') || '';
      const rows = await decodeResponse(bytes, contentType);
      const dateKey = api === 'get_trade_cal' ? 'nature_date' : 'date';
      rows.sort((a,b) => String(a[dateKey]).localeCompare(String(b[dateKey])) || String(a.symbol||'').localeCompare(String(b.symbol||'')));
      return { rows, provenance: { provider:'Panda Data', api, path:API_PATHS[api], query:params, requestedAt, fetchedAt:new Date().toISOString(), contentType, responseBytes:bytes.byteLength, responseSha256:hash(Buffer.from(bytes)), rowsSha256:hash(JSON.stringify(rows)), rowCount:rows.length, fields:rows.length ? Object.keys(rows[0]) : [] } };
    }
    throw new Error('Panda Data authentication retry exhausted');
  }
  return { queryWithProvenance, query:async (api, params) => (await queryWithProvenance(api,params)).rows };
}

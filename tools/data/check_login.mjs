import { readLocalEnv } from '../env.mjs';
import { createPandaDataClient } from './pandadata.mjs';
const env = await readLocalEnv();
const client = createPandaDataClient({ username:env.PANDA_DATA_USERNAME, password:env.PANDA_DATA_PASSWORD });
const date = d => d.toISOString().slice(0,10).replaceAll('-','');
const end = new Date(); const start = new Date(+end - 14*86400000);
try {
  const {rows,provenance} = await client.queryWithProvenance('get_index_daily',{ symbols:['000300.SH'],startDate:date(start),endDate:date(end),fields:[] });
  if (!rows.length) throw new Error('No recent index rows returned');
  console.log(JSON.stringify({ status:'ok', rowCount:rows.length, lastFiveDates:rows.slice(-5).map(r=>r.date), fields:provenance.fields, fetchedAt:provenance.fetchedAt },null,2));
  const cal = await client.queryWithProvenance('get_trade_cal',{startDate:date(start),endDate:date(end),exchange:'SH',isTradingDay:1,fields:[]});
  console.log(JSON.stringify({ calendarStatus:'ok', rowCount:cal.rows.length,fields:cal.provenance.fields,sample:cal.rows.slice(0,2) },null,2));
} catch (error) { console.error(error.message); process.exitCode=1; }

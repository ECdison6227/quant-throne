export const isoDate = value => String(value).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
const mean = list => list.reduce((sum,v)=>sum+v,0)/list.length;
export function maxDrawdown(prices) {
  let peak = prices[0], result=0;
  for (const price of prices) { peak=Math.max(peak,price); result=Math.min(result,price/peak-1); }
  return result;
}
export function buildEpisode(def, rows, calendarRows, provenance) {
  const series = rows.filter(r=>r.symbol===def.symbol).map(r=>({...r,date:isoDate(r.date)}));
  if (new Set(series.map(r=>r.date)).size!==series.length) throw new Error(`${def.id}: duplicate dates`);
  if (series.some(r=>!Number.isFinite(r.close)||r.close<=0||!Number.isFinite(r.volume)||r.volume<0)) throw new Error(`${def.id}: invalid close/volume`);
  const index = series.findLastIndex(r=>r.date<=def.decisionDate);
  if(index<60||series.length-index-1<20) throw new Error(`${def.id}: fewer than 60 prior / 20 subsequent sessions`);
  const raw=series.slice(index-60,index+21).map(r=>({d:r.date,c:r.close,v:r.volume}));
  const calDates=calendarRows.filter(r=>Number(r.is_trade)===1).map(r=>isoDate(r.nature_date));
  const expected=calDates.filter(d=>d>=raw[0].d&&d<=raw.at(-1).d);
  if(JSON.stringify(expected)!==JSON.stringify(raw.map(r=>r.d))) throw new Error(`${def.id}: market rows do not match the trading calendar`);
  const t=raw[60].c, avgVolume=mean(raw.slice(0,60).map(r=>r.v));
  const normalized=raw.map(r=>({d:r.d,c:r.c/t*100,v:avgVolume ? r.v/avgVolume : 0}));
  const returns=raw.slice(1,61).map((r,i)=>r.c/raw[i].c-1), avgReturn=mean(returns);
  const prices=raw.slice(60).map(r=>r.c);
  return {...def,decisionDate:raw[60].d,requestedDecisionDate:def.decisionDate,before:normalized.slice(0,61),after:normalized.slice(61),raw,
    outcome:{ret20:raw[80].c/t-1,maxDD20:maxDrawdown(prices),maxUp20:Math.max(...prices)/t-1},
    hint:{ma20_vs_ma60:mean(raw.slice(41,61).map(r=>r.c))>=mean(raw.slice(1,61).map(r=>r.c))?'above':'below',vol_ratio:avgVolume?raw[60].v/avgVolume:0,ret60:t/raw[0].c-1,volatility60:Math.sqrt(returns.reduce((s,r)=>s+(r-avgReturn)**2,0)/(returns.length-1)),maxDD60:maxDrawdown(raw.slice(0,61).map(r=>r.c))},
    provenance};
}

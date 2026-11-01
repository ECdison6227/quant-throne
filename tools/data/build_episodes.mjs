import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readLocalEnv } from '../env.mjs';
import { createPandaDataClient } from './pandadata.mjs';
import { buildEpisode } from './episode_math.mjs';
const env=await readLocalEnv();
const client=createPandaDataClient({username:env.PANDA_DATA_USERNAME,password:env.PANDA_DATA_PASSWORD});
const defs=JSON.parse(await readFile(new URL('./episodes.json',import.meta.url),'utf8'));
const episodes=[]; const queries=[];
const fromCache=process.argv.includes('--from-cache');
await mkdir('.data-cache',{recursive:true}); await mkdir('src/data',{recursive:true}); await mkdir('docs/data',{recursive:true});
for(const def of defs){
  const base=new Date(`${def.decisionDate}T00:00:00Z`);
  const date=offset=>new Date(+base+offset*86400000).toISOString().slice(0,10).replaceAll('-','');
  const range={startDate:date(-160),endDate:date(55)};
  const cached=fromCache?JSON.parse(await readFile(`.data-cache/${def.id}.json`,'utf8')):null;
  const market=cached?.market||await client.queryWithProvenance(def.assetType==='index'?'get_index_daily':'get_stock_daily_pre',{symbols:[def.symbol],...range,fields:[]});
  const calendar=cached?.calendar||await client.queryWithProvenance('get_trade_cal',{...range,exchange:'SH',isTradingDay:1,fields:[]});
  await writeFile(`.data-cache/${def.id}.json`,JSON.stringify({market,calendar},null,2)+'\n');
  queries.push({id:def.id,market:market.provenance,calendar:calendar.provenance});
  episodes.push(buildEpisode(def,market.rows,calendar.rows,{market:market.provenance,calendar:calendar.provenance}));
  console.log(`${def.id}: ${def.symbol} @ ${episodes.at(-1).decisionDate}; 60 prior + T + 20 subsequent sessions verified`);
}
const caliber='Panda Data 日线；股票前复权、指数原始点位。before=决策日之前60个交易日+决策日T（61点），after=T之后20个交易日。close归一化为close/close[T]*100；量比=volume/前60日平均volume。ret20=close[T+20]/close[T]-1；maxDD20=从T到T+20的收盘价峰谷回撤（含T）；maxUp20=期间最大收盘价/close[T]-1。只用close计算收益，不使用股票未复权pre_close。';
const pack={schema:'quant-throne.episodes.v1',source:{provider:'Panda Data',client:'Node HTTP client; protocol checked against official panda-data 1.0.5 source',fetchedAt:queries.at(-1).calendar.fetchedAt,apis:['get_index_daily','get_stock_daily_pre','get_trade_cal'],sdkSource:'https://pypi.org/project/panda-data/1.0.5/',fixture:false},caliber,episodes};
const json=JSON.stringify(pack,null,2)+'\n'; await writeFile('src/data/episodes.pack.json',json);
await writeFile('docs/data/provenance.json',JSON.stringify({schema:'quant-throne.provenance.v1',packSha256:createHash('sha256').update(json).digest('hex'),caliber,queries},null,2)+'\n');
console.log(`Real data pack written: ${episodes.length} episodes, ${Buffer.byteLength(json)} bytes`);

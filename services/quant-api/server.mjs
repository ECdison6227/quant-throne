import http from 'node:http';
import {randomBytes,createHash} from 'node:crypto';
import {createPandaDataClient} from '../../tools/data/pandadata.mjs';
const SYMBOLS={'000300.SH':{name:'沪深300',type:'index',unit:'点'},'600519.SH':{name:'贵州茅台',type:'stock',unit:'元'},'601088.SH':{name:'中国神华',type:'stock',unit:'元'}};
const PREFIX='/quant-throne/api';
export function createQuantApi(env=process.env,{fetchImpl=fetch,clock=()=>new Date()}={}){
 const panda=createPandaDataClient({username:env.PANDA_DATA_USERNAME,password:env.PANDA_DATA_PASSWORD},{fetchImpl});
 const cache=new Map(),inflight=new Map(),rates=new Map(),transfers=new Map();
 const digest=value=>createHash('sha256').update(value).digest('hex');
 function transfer(input){const p=input?.profile;const rootKeys=['schema','game','version','createdAt','demonstration','dimensions','conflicts','uncertain','persona','recommendations','notRecommended','nextTask','revisions','dataSource','disclaimer'];
  if(!p||p.schema!=='pandaai.profile.v1'||p.game!=='quant-throne'||Object.keys(p).some(k=>!rootKeys.includes(k))||JSON.stringify(p).length>48000||!p.dimensions||Object.keys(p.dimensions).length!==7||typeof p.persona?.name!=='string'||p.persona.name.length>80)throw Object.assign(new Error('只能传送量权结构化画像，不包含原始逐卡日志。'),{status:400});
  const forbidden=value=>value&&typeof value==='object'&&Object.entries(value).some(([key,v])=>/^(?:logs?|decisions|rawLogs|rawEvents|password|apiKey|token|authorization|credentials)$/i.test(key)||forbidden(v));if(forbidden(p))throw Object.assign(new Error('画像含有不允许传送的字段。'),{status:400});
  for(const [key,value]of transfers)if(Date.now()>value.expires)transfers.delete(key);if(transfers.size>=256)throw Object.assign(new Error('传送请求较多，请稍后重试。'),{status:429});
  const token=randomBytes(24).toString('base64url');transfers.set(digest(token),{profile:structuredClone(p),expires:Date.now()+10*60000});return {ok:true,token,expiresIn:600};
 }
 function claim(input){if(!input||typeof input.token!=='string'||!/^[A-Za-z0-9_-]{32}$/.test(input.token)||Object.keys(input).some(k=>k!=='token'))throw Object.assign(new Error('传送编号格式不正确。'),{status:400});const key=digest(input.token),value=transfers.get(key);if(!value||value.expires<Date.now())throw Object.assign(new Error('画像传送已过期或已领取，请从量权重新发送。'),{status:410});transfers.delete(key);return {ok:true,profile:value.profile};}
 async function market(symbol){
  if(!Object.hasOwn(SYMBOLS,symbol))throw Object.assign(new Error('请选择支持的指数或股票。'),{status:400});
  const old=cache.get(symbol);if(old&&Date.now()-old.at<300000)return {...old.value,cached:true};
  if(inflight.has(symbol))return inflight.get(symbol);
  const promise=(async()=>{const end=clock(),start=new Date(+end-180*86400000),date=d=>d.toISOString().slice(0,10).replaceAll('-','');
   const api=SYMBOLS[symbol].type==='index'?'get_index_daily':'get_stock_daily_pre';
   const {rows,provenance}=await panda.queryWithProvenance(api,{symbols:[symbol],startDate:date(start),endDate:date(end),fields:[]});
   const series=rows.filter(r=>r.symbol===symbol&&typeof r.close==='number'&&r.close>0).slice(-60).map(r=>({date:String(r.date).replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3'),close:r.close}));
   if(series.length<21)throw Object.assign(new Error('行情样本不足，暂不能计算20日变化。'),{status:503});
   const last=series.at(-1),value={ok:true,provider:'Panda Data',symbol,name:SYMBOLS[symbol].name,unit:SYMBOLS[symbol].unit,api,path:provenance.path,fetchedAt:provenance.fetchedAt,asOf:last.date,close:last.close,chg20d:last.close/series.at(-21).close-1,series,query:provenance.query,caliber:'最近60个有效交易日收盘价；股票前复权、指数原始点位；20日变化=最近收盘价/20个交易日前收盘价-1。不是实时盘口。',cached:false};
   cache.set(symbol,{at:Date.now(),value});return value;})();
  inflight.set(symbol,promise);try{return await promise;}finally{inflight.delete(symbol);}
 }
 async function coach(input){
  if(!input||typeof input.question!=='string'||!input.question.trim()||input.question.length>800||Object.keys(input).some(k=>!['question','taskId'].includes(k)))throw Object.assign(new Error('请输入800字以内的概念问题。'),{status:400});
  if(!env.DEEPSEEK_API_KEY||env.DEEPSEEK_API_KEY.startsWith('['))throw Object.assign(new Error('在线解读暂不可用，游戏与离线任务仍可继续。'),{status:503});
  const response=await fetchImpl('https://api.deepseek.com/chat/completions',{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${env.DEEPSEEK_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'deepseek-chat',messages:[{role:'system',content:'你是《量权》游戏的数据官。只解释量化入门概念、读图、数据来源与回测局限，不提供个股买卖指令、收益保证或价格预测，不编造行情数字。你不修改用户画像。请用不超过220个汉字回答，必要时引导用户到PandaAI官方课程或QuantSkills验证。若问题无关，温和引回学习任务。当前任务：'+String(input.taskId||'量化入门').slice(0,40)},{role:'user',content:input.question.trim()}],max_tokens:450,temperature:0.3,stream:false}),signal:AbortSignal.timeout(40000)});
  if(!response.ok)throw Object.assign(new Error('在线解读暂不可用，请稍后重试。'),{status:503});
  const data=await response.json(),answer=data.choices?.[0]?.message?.content;
  if(typeof answer!=='string'||!answer.trim())throw Object.assign(new Error('在线服务未返回有效解读。'),{status:503});
  return {ok:true,answer:answer.slice(0,1500),provider:'DeepSeek',model:'deepseek-chat',checkedAt:clock().toISOString(),disclaimer:'AI概念解读，不构成投资建议；不改变确定性画像。'};
 }
 const send=(res,status,data,origin)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{})});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://127.0.0.1');const origin=req.headers.origin;const allowed=['https://edsionc.top','https://vivic.edsionc.top','https://localhost','capacitor://localhost','http://127.0.0.1:5173','http://localhost:5173'];
  if(origin&&!allowed.includes(origin))return send(res,403,{ok:false,error:'请求来源不被支持。'});
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':origin||'https://edsionc.top','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type',Vary:'Origin'});return res.end();}
  const ip=String(req.headers['x-real-ip']||req.socket.remoteAddress||'').slice(0,80),now=Date.now(),rate=rates.get(ip);if(!rate||now-rate.at>60000)rates.set(ip,{at:now,count:1});else if(++rate.count>40)return send(res,429,{ok:false,error:'请求较多，请稍后重试。'},origin);
  if(rates.size>10000)for(const [key,value]of rates)if(now-value.at>60000)rates.delete(key);
  try{
   if(url.pathname===PREFIX+'/health'&&req.method==='GET')return send(res,200,{ok:true,service:'quant-throne-api',pandaConfigured:!!(env.PANDA_DATA_USERNAME&&env.PANDA_DATA_PASSWORD),coachConfigured:!!env.DEEPSEEK_API_KEY},origin);
   if(url.pathname===PREFIX+'/market'&&req.method==='GET'){if([...url.searchParams.keys()].some(k=>k!=='symbol'))return send(res,400,{ok:false,error:'行情接口仅接受symbol参数。'},origin);return send(res,200,await market(url.searchParams.get('symbol')||'000300.SH'),origin);}
   if([PREFIX+'/coach',PREFIX+'/transfer',PREFIX+'/transfer/claim'].includes(url.pathname)&&req.method==='POST'){let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>(url.pathname===PREFIX+'/transfer'?64000:8192))return send(res,413,{ok:false,error:'内容过大。'},origin);chunks.push(chunk);}let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(res,400,{ok:false,error:'JSON格式不正确。'},origin);}const result=url.pathname.endsWith('/transfer/claim')?claim(input):url.pathname.endsWith('/transfer')?transfer(input):await coach(input);return send(res,200,result,origin);}
   send(res,404,{ok:false,error:'没有此接口。'},origin);
  }catch(error){send(res,error.status||503,{ok:false,error:error.status?error.message:'数据服务暂时不可用，离线游戏仍可继续。'},origin);}
 });
 return {server,market,coach};
}

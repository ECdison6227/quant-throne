import seedResources from '../data/resources.json';
import type {Profile,Recommendation,Recommendations,Resource,Task} from './types';
export const resources:Resource[]=seedResources.items;
const tasks:Record<string,Task>={
 value:{id:'T-value',title:'为竹林挑一段更稳的旅程',minutes:10,data:['e3','e4','e6'],resourceId:'skill-dividend-yield-scan'},
 trend:{id:'T-trend',title:'亲手调一组均线参数',minutes:10,data:['e1','e5','e7'],resourceId:'skill-ma-crossover-signal'},
 reversal:{id:'T-reversal',title:'跌得多，是否就能买？',minutes:10,data:['e3','e4'],resourceId:'skill-oversold-rebound'},
 starter:{id:'T-starter',title:'用三道题迈出第一步',minutes:10,data:[],resourceId:'pandaai-course'},
};
export function recommend(profile:Profile,list:Resource[]=resources):Recommendations{
 const style=profile.dimensions.style.uncertain?null:profile.dimensions.style.score;
 const market=profile.dimensions.market.uncertain?null:profile.dimensions.market.score;
 const level=profile.level;
 const evidence=[...profile.dimensions.style.evidence.slice(-1),...profile.dimensions.market.evidence.slice(-1)].map(e=>e.text).join('；');
 const ranked:Recommendation[]=list.filter(r=>r.minLevel<=level+1).map(r=>{
  const styleMatch=typeof style==='string'&&r.styles.includes(style),marketMatch=typeof market==='string'&&r.markets.includes(market);
  const raw=(styleMatch?3:0)+(marketMatch?2:0)+(r.styles.includes('any')?0.5:0)+(r.markets.includes('any')?0.5:0)+(r.minLevel===0&&profile.uncertain.length>=4?3:0);
  const advanced=r.minLevel===level+1;
  return {...r,score:raw*(advanced?0.6:1),advanced,reason:`${evidence||'当前证据较少，先推荐门槛较低的通用资源。'} ${styleMatch?'研究风格匹配；':''}${marketMatch?'市场偏好匹配；':''}${r.summary}。基础 L${r.minLevel}，约 ${r.minutes} 分钟${advanced?'；这是进阶资源，可先完成下方任务。':'。'}`};
 }).sort((a,b)=>b.score-a.score||a.minLevel-b.minLevel||a.id.localeCompare(b.id));
 const chosen:Recommendation[]=[];
 const skill=ranked.find(r=>r.type==='skill'),product=ranked.find(r=>r.type!=='skill');
 if(skill)chosen.push(skill);if(product)chosen.push(product);
 for(const r of ranked)if(chosen.length<3&&!chosen.some(c=>c.id===r.id))chosen.push(r);
 chosen.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const excluded=list.filter(r=>r.minLevel>level+1).sort((a,b)=>b.minLevel-a.minLevel||a.id.localeCompare(b.id));
 const taskKey=profile.dimensions.literacy.uncertain||profile.level===0?'starter':typeof style==='string'&&style in tasks?style:'starter';
 return {items:chosen,notRecommended:excluded.slice(0,1).map(r=>({id:r.id,reason:`${r.name}需要 L${r.minLevel}，本局知识表现约为 L${level}，先完成入门任务再探索。`})),nextTask:tasks[taskKey]};
}

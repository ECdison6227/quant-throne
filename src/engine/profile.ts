import type {Decision,Dimension,DimKey,Evidence,Profile,SelfReport} from './types';
import {styleNames} from '../content/cards';
const clamp=(v:number)=>Math.round(Math.max(0,Math.min(100,v)));
function dimension(kind:Dimension['kind'],label:string,score:Dimension['score'],evidence:Evidence[],minimum=3):Dimension{
 const n=evidence.length;
 return {kind,label,score:n<minimum?null:score,confidence:n<3?'low':n<=5?'mid':'high',uncertain:n<minimum,evidence};
}
const evidence=(d:Decision,text:string):Evidence=>({cardId:d.cardId,choice:d.label,effect:text,text:`第 ${d.sequence+1} 张 · ${d.cardId}：${d.label}${d.kind==='market'?`，信心 ${Math.round(d.confidence*100)}%`:''}。${text}`});
const winner=(values:string[])=>Object.entries(values.reduce<Record<string,number>>((r,k)=>(r[k]=(r[k]||0)+1,r),{})).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||null;
export function buildProfile(log:Decision[],self:SelfReport):Profile{
 const active=log.filter(d=>d.kind!=='tutorial');
 const risks=active.filter(d=>d.risk!==undefined), markets=active.filter(d=>d.market), styles=active.filter(d=>d.style);
 const marketDecisions=active.filter(d=>d.kind==='market'); const questions=active.filter(d=>d.kind==='knowledge');
 const marketWinner=winner(markets.map(d=>d.market!)), styleWinner=winner(styles.map(d=>d.style!));
 const risk=50+(risks.length?risks.reduce((s,d)=>s+(d.risk||0),0)/risks.length*28:0);
 // Brier score on the binary direction forecast, rather than confidence-weighted win counts.
 const forecasts=marketDecisions.filter(d=>d.choice!=='up');
 const brier=forecasts.length?forecasts.reduce((s,d)=>s+(d.confidence-(d.correct?1:0))**2,0)/forecasts.length:1;
 const disciplineEvidence:Evidence[]=[]; let stable=0;
 for(let i=1;i<marketDecisions.length;i++){const prev=marketDecisions[i-1],cur=marketDecisions[i];if(prev.loss){const changed=prev.choice!==cur.choice&&cur.confidence>prev.confidence;stable+=changed?0:1;disciplineEvidence.push(evidence(cur,changed?'亏损后改变方向并提高信心；需要继续观察':'亏损后没有同时改变方向并提高信心'));}}
 for(const d of active.filter(d=>d.discipline!==undefined)){stable+=d.discipline!>0?1:0;disciplineEvidence.push(evidence(d,d.discipline!>0?'遵守既定流程':'为当前机会偏离流程'));}
 const reportDecisions=active.filter(d=>d.kind==='market'||d.reportAvailable);
 const reports=reportDecisions.filter(d=>d.reports.length);
 const infoCategory=winner(reports.flatMap(d=>d.reports));
 const infoNames:Record<string,string>={technical:'技术报告',fundamental:'价格风险报告',flow:'成交量报告'};
 const correct=questions.filter(d=>d.correct).length;
 const knowledgeBand=questions.length>=3?Math.min(3,Math.floor(correct/questions.length*3)):0;
 // Multiple choice questions do not demonstrate programming skills. Self-report caps tool prerequisites.
 const testedLevel=Math.min(knowledgeBand,self.level);
 const literacyEvidence=questions.map(d=>evidence(d,d.correct?'知识题回答正确':'知识题回答需要补充基础'));
 literacyEvidence.unshift({cardId:'self',choice:`L${self.level}`,effect:'自述，单独列示',text:`开局自述基础 L${self.level}，作为工具门槛上限；知识题表现不等于编程能力`});
 const dimensions:Record<DimKey,Dimension>={
  risk:dimension('preference','风险偏好',clamp(risk),risks.map(d=>evidence(d,(d.risk||0)>0?'偏向承担风险':'偏向控制风险'))),
  market:dimension('preference','市场偏好',marketWinner,markets.map(d=>evidence(d,`选择 ${d.market}`))),
  style:dimension('preference','研究风格',styleWinner,styles.map(d=>evidence(d,`偏向${styleNames[d.style!]||d.style}`))),
  info:dimension('preference','信息习惯',infoCategory?infoNames[infoCategory]:'直接判断',reportDecisions.map(d=>evidence(d,d.reports.length?`调阅 ${d.reports.map(r=>infoNames[r]).join('、')}`:'未调阅报告'))),
  judgement:dimension('ability','读数与校准',clamp((1-brier)*100),forecasts.map(d=>evidence(d,d.correct?'方向与随后20日涨跌一致':'方向与随后20日涨跌相反')),4),
  discipline:dimension('ability','纪律一致性',disciplineEvidence.length?clamp(stable/disciplineEvidence.length*100):null,disciplineEvidence),
  literacy:dimension('ability','量化基础',questions.length?correct/questions.length*100:0,literacyEvidence,4),
 };
 const conflicts:Profile['conflicts']=[];
 if(self.risk==='cautious'&&marketDecisions.length>=4&&marketDecisions.filter(d=>d.choice==='right').length/marketDecisions.length>=0.6)conflicts.push({dims:['risk'],text:'你自述偏保守，但多数行情回合选择加仓；两条线索同时保留，不用其中一条覆盖另一条。'});
 if(questions.length>=3&&Math.abs(self.level-knowledgeBand)>=2)conflicts.push({dims:['literacy'],text:`自述为 L${self.level}，本局知识题表现对应基础带 L${knowledgeBand}；题目样本有限，不代表编程或完整研究能力。`});
 const uncertain=(Object.keys(dimensions)as DimKey[]).filter(k=>dimensions[k].uncertain);
 let persona={id:'bamboo',name:'未定形的竹笋',description:'先留下更多线索，再为你的研究方向命名。'};
 if(!dimensions.style.uncertain){
  if(styleWinner==='value')persona={id:'night-watch',name:'竹林守夜人',description:'愿意等待价值，也记得为明天留一盏灯。'};
  else if(styleWinner==='trend')persona={id:'trend-rider',name:'风口骑手',description:'你会追问风往哪里走，然后决定何时扬帆。'};
  else if(styleWinner==='reversal')persona={id:'reverse-angler',name:'逆风钓手',description:'别人离场时，你愿意重新检查水下的机会。'};
  else if(styleWinner==='event')persona={id:'news-falcon',name:'消息猎鹰',description:'你留意变化，也需要分清消息与证据。'};
  else persona={id:'alchemist',name:'数据炼金师',description:'让想法进入检验，让规则能够重复。'};
 }
 return {dimensions,conflicts,uncertain,persona,level:testedLevel};
}

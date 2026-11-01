import type {Card,Decision,Gauges} from './types';
export const initialGauges=():Gauges=>({nav:50,trust:50,risk:50,research:50});
export const gaugeNames:Record<keyof Gauges,string>={nav:'净值',trust:'信任',risk:'风控',research:'研究'};
export function applyDecision(gauges:Gauges,card:Card,decision:Decision):Gauges{
 const option=decision.choice==='left'?card.left:card.right;
 const delta:Partial<Gauges>=decision.kind==='market'?{nav:Math.round((decision.choice==='right'?1:decision.choice==='left'?-1:0)*(decision.ret20||0)*35),risk:decision.choice==='right'?-2:decision.choice==='left'?2:0,research:decision.reports.length?2:0}:option.delta;
 return Object.fromEntries(Object.entries(gauges).map(([k,v])=>[k,Math.max(0,Math.min(100,v+(delta[k as keyof Gauges]||0)))])) as Gauges;
}
export function ending(gauges:Gauges):string|null{
 const entry=Object.entries(gauges).find(([,v])=>v===0||v===100);if(!entry)return null;
 const [key,value]=entry;const names:Record<string,[string,string]>={nav:['资本耗尽，暂别掌舵席','收益压倒一切，团队失去平衡'],trust:['出资人撤回信任','唯命是从，失去独立判断'],risk:['风险失控，触及底线','过度防守，工作室停摆'],research:['研究枯竭，判断失去依据','沉迷研究，错过经营']};return names[key][value===0?0:1];
}

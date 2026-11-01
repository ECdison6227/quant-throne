import type {Point} from './types';
export function simulateMA(points:Point[],fast:number,slow:number){
 if(fast<5||fast>30||slow<20||slow>60||fast>=slow)throw new Error('快线必须小于慢线');
 const average=(end:number,n:number)=>points.slice(end-n+1,end+1).reduce((s,p)=>s+p.c,0)/n;
 let equity=1,trades=0,previous=0; const values:number[]=[];
 // Yesterday's close determines today's position. Never use today's signal for today's return.
 for(let i=0;i<points.length;i++){
  const position=i>=slow?+(average(i-1,fast)>average(i-1,slow)):0;
  if(i>0)equity*=1+position*(points[i].c/points[i-1].c-1);
  if(position!==previous)trades++;previous=position;values.push(equity*100);
 }
 return {ret:equity-1,trades,values};
}
export function rsi(points:Point[],period=14){const last=points.slice(-period-1);let up=0,down=0;for(let i=1;i<last.length;i++){const change=last[i].c-last[i-1].c;up+=Math.max(change,0);down+=Math.max(-change,0);}return down===0?up===0?50:100:100-100/(1+up/down);}

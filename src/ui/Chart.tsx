import type {Point} from '../engine/types';
/** Normalised price path (decision day = 100). `after` is drawn in vermilion once revealed. */
export function Chart({before,after=[],tall=false}:{before:Point[];after?:Point[];tall?:boolean}){
 const H=tall?300:220,top=22,bottom=H-26;
 const all=[...before,...after];const prices=all.map(p=>p.c),lo=Math.min(...prices)*0.985,hi=Math.max(...prices)*1.015;
 const x=(i:number)=>12+i/(all.length-1)*536,y=(v:number)=>bottom-(v-lo)/(hi-lo||1)*(bottom-top);
 const path=(points:Point[],offset=0)=>points.map((p,i)=>`${i?'L':'M'}${x(i+offset).toFixed(1)},${y(p.c).toFixed(1)}`).join(' ');
 const divider=x(before.length-1),last=all.at(-1)!,base=y(100);
 return <div className="chart"><div className="chart-top"><span className="chart-source">Panda Data 日线</span><span>决策日 = 100</span></div>
 <svg viewBox={`0 0 560 ${H}`} role="img" aria-label={`历史走势，${before.length}个交易日${after.length?`，揭晓后${after.length}日`:''}`}>
 <line x1="12" x2="548" y1={base} y2={base} stroke="currentColor" strokeDasharray="2 6" opacity=".35"/>
 <path className="chart-area" d={`${path(before)} L${x(before.length-1)},${bottom} L12,${bottom} Z`} fill="currentColor" opacity=".07"/>
 <path className="chart-line" d={path(before)} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" pathLength={1}/>
 {after.length>0&&<><line x1={divider} x2={divider} y1={top-8} y2={bottom} stroke="currentColor" strokeDasharray="3 5" opacity=".45"/>
  <path className="chart-after" d={path([before.at(-1)!,...after],before.length-1)} fill="none" stroke="#b4543d" strokeWidth="3.6" strokeLinecap="round" pathLength={1}/></>}
 <circle className={after.length?'chart-dot after':'chart-dot'} cx={x(all.length-1)} cy={y(last.c)} r="6" fill={after.length?'#b4543d':'currentColor'}/>
 <text x="12" y={H-6}>60 日前</text><text x={after.length?divider:548} y={H-6} textAnchor={after.length?'middle':'end'}>决策日</text>{after.length>0&&<text x="548" y={H-6} textAnchor="end">20 日后</text>}
 </svg></div>;
}

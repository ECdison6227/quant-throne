import {useEffect,useRef,useState} from 'react';
import type {Gauges as G} from '../engine/types';
import {gaugeNames} from '../engine/state';

// One bold glyph per studio gauge; the glyph itself fills from the bottom to show the level.
const GLYPH:Record<keyof G,string>={
 nav:'M7 12.5C7 8.4 9.2 5.5 12 5.5s5 2.9 5 7zM2.5 11.5c1.6 0 3 .5 4 1.3H2.5zM21.5 11.5c-1.6 0-3 .5-4 1.3h4zM3 13.6h18l-2.6 5.9H5.6z',
 trust:'M9 11a3.6 3.6 0 1 0 0-7.2A3.6 3.6 0 0 0 9 11zM2 20.2c0-3.9 3.1-7.1 7-7.1s7 3.2 7 7.1zM16.6 10.8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17.4 12.9c2.7.4 4.6 3.3 4.6 7.3h-4.3c0-2.7-.9-5.1-2.6-6.8.7-.3 1.5-.5 2.3-.5z',
 risk:'M12 2.2l8.2 3.1v6.1c0 5.2-3.4 9.4-8.2 11-4.8-1.6-8.2-5.8-8.2-11V5.3z',
 research:'M2.8 5.2c3.1-1.1 6.2-1 8.5.6v14.5c-2.3-1.4-5.4-1.5-8.5-.4zM21.2 5.2c-3.1-1.1-6.2-1-8.5.6v14.5c2.3-1.4 5.4-1.5 8.5-.4z',
};

/** Four studio gauges. Each change pops a +n/−n delta on the affected gauge; a held preview pulses it. */
export function Gauges({gauges,affected}:{gauges:G;affected:Set<string>}){
 const prev=useRef(gauges),[deltas,setDeltas]=useState<Partial<Record<keyof G,{v:number;k:number}>>>({});
 useEffect(()=>{
  const next:typeof deltas={};let any=false;
  (Object.keys(gauges) as (keyof G)[]).forEach(k=>{const v=gauges[k]-prev.current[k];if(v){next[k]={v,k:Date.now()+Math.random()};any=true;}});
  prev.current=gauges;if(!any)return;
  setDeltas(next);const t=setTimeout(()=>setDeltas({}),1100);return()=>clearTimeout(t);
 },[gauges]);
 return <div className="gauges">{(Object.keys(gauges) as (keyof G)[]).map(key=>{
  const v=gauges[key],danger=v<=15||v>=85,dl=deltas[key],cut=24-24*v/100;
  return <div className={`gauge${affected.has(key)?' affected':''}${danger?' danger':''}${dl?(dl.v>0?' up':' down'):''}`} key={key} aria-label={`${gaugeNames[key]} ${v}`}>
   <svg className="gauge-icon" viewBox="0 0 24 24" aria-hidden="true">
    <defs><clipPath id={`gclip-${key}`}><rect className="gauge-level" x="0" y={cut} width="24" height={24-cut}/></clipPath></defs>
    <path d={GLYPH[key]} className="gauge-empty"/>
    <path d={GLYPH[key]} className="gauge-fill" clipPath={`url(#gclip-${key})`}/>
   </svg>
   <span>{gaugeNames[key]}</span>
   {affected.has(key)&&<b className="change-dot"/>}
   {dl&&<em key={dl.k} className="gauge-delta">{dl.v>0?'+':'−'}{Math.abs(dl.v)}</em>}
  </div>;})}</div>;
}

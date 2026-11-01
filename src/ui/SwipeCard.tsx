import {forwardRef,useEffect,useImperativeHandle,useRef,useState,type ReactNode} from 'react';
import type {Direction} from '../engine/types';

export type SwipeHandle={fling:(d:Direction)=>void};
type Props={children:ReactNode;onChoice:(d:Direction)=>void;onHold:(d:Direction|null)=>void;disabled?:boolean;market?:boolean;
 labels:{left:string;right:string;up?:string};held?:Direction|null};

const COMMIT_X=90,COMMIT_UP=80,FLICK=0.55; // px, px, px/ms
const reduced=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Direct-manipulation card: follows the finger 1:1, commits on distance or flick, flies out, springs back on cancel. */
export const SwipeCard=forwardRef<SwipeHandle,Props>(function SwipeCard({children,onChoice,onHold,disabled=false,market=false,labels,held=null},ref){
 const start=useRef<{x:number;y:number}|null>(null);const samples=useRef<{x:number;t:number}[]>([]);
 const [drag,setDrag]=useState({x:0,y:0}),[phase,setPhase]=useState<'idle'|'drag'|'fly'|'back'>('idle');
 const leaving=useRef(false);
 const dirOf=(x:number,y:number):Direction|null=>market&&y<-40&&Math.abs(y)>Math.abs(x)?'up':Math.abs(x)>24?(x>0?'right':'left'):null;

 function fly(d:Direction){
  if(leaving.current||disabled)return;leaving.current=true;onHold(null);
  try{navigator.vibrate?.(8);}catch{}
  // Market cards wait at a held position for the confidence pick; others leave the table.
  if(market){setPhase('back');setDrag(d==='up'?{x:0,y:-60}:{x:d==='right'?70:-70,y:0});onChoice(d);leaving.current=false;return;}
  setPhase('fly');setDrag({x:d==='up'?0:(d==='right'?1:-1)*520,y:d==='up'?-700:-30});
  setTimeout(()=>onChoice(d),reduced?0:200);
 }
 useImperativeHandle(ref,()=>({fling:fly}));
 // When a held market card is released without a decision, spring back to centre.
 useEffect(()=>{if(!held&&!start.current&&!leaving.current)setDrag(d=>d.x||d.y?{x:0,y:0}:d);},[held]);

 function finish(cancel=false){
  const s=start.current;if(!s)return;start.current=null;
  const now=performance.now(),recent=samples.current.filter(p=>now-p.t<120),first=recent[0],lastS=recent.at(-1);const velocity=first&&lastS&&lastS.t>first.t?(lastS.x-first.x)/(lastS.t-first.t):0;samples.current=[];const {x,y}=drag;
  if(!cancel&&!disabled){
   if(market&&(y<-COMMIT_UP)&&Math.abs(y)>Math.abs(x))return fly('up');
   if(Math.abs(x)>COMMIT_X||(Math.abs(velocity)>FLICK&&Math.abs(x)>30&&Math.sign(velocity)===Math.sign(x)))return fly(x>0?'right':'left');
  }
  onHold(null);setPhase('back');setDrag({x:0,y:0});
 }
 const d=dirOf(drag.x,drag.y),power=Math.min(1,Math.max(Math.abs(drag.x)/COMMIT_X,-drag.y/COMMIT_UP));
 const label=d==='up'?labels.up||'观望':d==='left'?labels.left:d==='right'?labels.right:'';
 return <div className={`swipe-card phase-${phase}`}
  style={{transform:`translate3d(${drag.x}px,${drag.y}px,0) rotate(${drag.x/18}deg)`}}
  onTransitionEnd={()=>{if(phase==='back'&&!held)setPhase('idle');}}
  onPointerDown={e=>{if(disabled||leaving.current||(e.target as HTMLElement).closest('button,a,input'))return;start.current={x:e.clientX-drag.x,y:e.clientY-drag.y};samples.current=[{x:e.clientX,t:performance.now()}];e.currentTarget.setPointerCapture(e.pointerId);setPhase('drag');}}
  onPointerMove={e=>{const s=start.current;if(!s)return;const x=e.clientX-s.x,y=Math.min(0,e.clientY-s.y)*(market?1:.35);
   samples.current.push({x:e.clientX,t:performance.now()});if(samples.current.length>8)samples.current.shift();
   setDrag({x,y});onHold(dirOf(x,y));}}
  onPointerUp={()=>finish()} onPointerCancel={()=>finish(true)}>
  {label&&<div className={`swipe-stamp ${d}`} style={{opacity:Math.min(1,.25+power)}}>{label}</div>}
  {children}
 </div>;
});

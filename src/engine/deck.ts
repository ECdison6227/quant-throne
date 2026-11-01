import {cards,tutorials} from '../content/cards';
import type {Card,Decision,Profile} from './types';
export function seeded(seed:string){let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
// A stateless, deterministic selector: same seed + evidence always chooses the same card.
export function nextCard(log:Decision[],profile:Profile,seed:string):Card|null{
 if(log.length>=24)return null;
 if(log.length<3)return tutorials[log.length];
 const used=new Set(log.map(d=>d.cardId)); const remaining=cards.filter(c=>c.kind!=='tutorial'&&!used.has(c.id));
 const markets=log.filter(d=>d.kind==='market').length,knowledge=log.filter(d=>d.kind==='knowledge').length;
 const last=log.at(-1)?.kind,turn=log.length;
 let kind:Card['kind']='story';
 if(last!=='market'&&markets<6&&(turn%3===0||24-turn<=(6-markets)*2+Math.max(0,3-knowledge)))kind='market';
 else if(knowledge<3&&turn%4===1)kind='knowledge';
 let pool=remaining.filter(c=>c.kind===kind);if(!pool.length)pool=remaining.filter(c=>last!=='market'||c.kind!=='market');
 const random=seeded(`${seed}/${log.map(d=>`${d.cardId}:${d.choice}`).join(',')}`);
 const score=(c:Card)=>c.probes.reduce((s,k)=>s+(profile.dimensions[k].uncertain?6:profile.dimensions[k].confidence==='mid'?2:1),0);
 const ranked=pool.map(c=>({c,score:score(c)+random()})).sort((a,b)=>b.score-a.score||a.c.id.localeCompare(b.c.id));
 return ranked[0]?.c||null;
}

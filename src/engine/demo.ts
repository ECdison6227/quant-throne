import type {Card,Direction,Decision,Episode,SelfReport} from './types';
import {buildProfile} from './profile';
import {nextCard} from './deck';
import {makeDecision} from './evidence';
import {recommend} from './recommend';
import pack from '../data/episodes.pack.json';
export function demoChoice(card:Card,path:'A'|'B'):Direction{
 if(card.kind==='knowledge'){
  const right=card.right.correct?'right':'left';
  // A deliberately misses one knowledge question; both paths still receive usable first tasks.
  return path==='A'&&card.id==='k3'?(right==='right'?'left':'right'):right;
 }
 if(card.kind==='market'){
  if(path==='A')return ['e3','e6'].includes(card.id)?'right':'left';
  return ['e1','e5','e7'].includes(card.id)?'right':'up';
 }
 return path==='A'?'left':'right';
}
export function runDemo(path:'A'|'B',seed='review'){
 const log:Decision[]=[],self:SelfReport={risk:path==='B'?'open':'cautious',level:path==='B'?2:1};
 while(log.length<24){const profile=buildProfile(log,self),card=nextCard(log,profile,seed);if(!card)break;log.push(makeDecision(card,demoChoice(card,path),log.length,path==='A'?0.65:0.9,path==='B'&&card.report?['technical']:[],pack.episodes.find(e=>e.id===card.episodeId)as Episode|undefined));}
 const profile=buildProfile(log,self);return {log,profile,recommendations:recommend(profile)};
}

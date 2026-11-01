import {describe,it,expect} from 'vitest';
import {buildProfile} from './profile';
import {nextCard} from './deck';
import {makeDecision} from './evidence';
import {recommend} from './recommend';
import {exportProfile,shareSummary,sendToVivic,VIVIC_ORIGIN} from './export';
import {runDemo} from './demo';
import {simulateMA} from './tasks';
import {parseSession} from './storage';
import type {Decision,Episode,SelfReport} from './types';
import pack from '../data/episodes.pack.json';
const self:SelfReport={risk:'cautious',level:1};
describe('deterministic evidence and recommendations',()=>{
 it('reproduces both complete paths with six spaced market cards and three knowledge cards',()=>{
  for(const path of ['A','B']as const){const a=runDemo(path),b=runDemo(path);expect(a).toEqual(b);expect(a.log).toHaveLength(24);expect(a.log.filter(d=>d.kind==='market').length).toBeGreaterThanOrEqual(5);expect(a.log.filter(d=>d.kind==='knowledge').length).toBeGreaterThanOrEqual(3);expect(a.log.some((d,i)=>d.kind==='market'&&a.log[i-1]?.kind==='market')).toBe(false);}
 });
 it('keeps deck quotas and spacing across a range of random seeds',()=>{for(let i=0;i<120;i++){const {log}=runDemo(i%2?'A':'B',`seed-${i}`);expect(log.filter(d=>d.kind==='market').length).toBeGreaterThanOrEqual(5);expect(log.filter(d=>d.kind==='knowledge').length).toBeGreaterThanOrEqual(3);expect(log.some((d,n)=>d.kind==='market'&&log[n-1]?.kind==='market')).toBe(false);}});
 it('produces different personas, recommendations and playable tasks from A/B evidence',()=>{
  const a=runDemo('A'),b=runDemo('B');expect(a.profile.persona.name).toBe('竹林守夜人');expect(b.profile.persona.name).toBe('风口骑手');expect(a.recommendations.nextTask.id).toBe('T-value');expect(b.recommendations.nextTask.id).toBe('T-trend');expect(a.recommendations.items.map(r=>r.id)).not.toEqual(b.recommendations.items.map(r=>r.id));
 });
 it('leaves abilities unknown without enough evidence, retains conflicting self reports',()=>{
  const empty=buildProfile([],self);expect(empty.dimensions.judgement.score).toBeNull();expect(empty.dimensions.literacy.uncertain).toBe(true);
  const decisions:Decision[]=Array.from({length:5},(_,i)=>({cardId:`e${i}`,kind:'market',choice:'right',label:'加仓',sequence:i,confidence:0.9,reports:[],correct:false,risk:2}));
  const result=buildProfile(decisions,self);expect(result.conflicts.some(c=>c.dims.includes('risk'))).toBe(true);expect(result.dimensions.judgement.score).toBe(19);
 });
 it('does not mutate evidence and excludes raw logs from all outbound payloads',()=>{
  const {log,profile,recommendations}=runDemo('B'),snapshot=JSON.stringify(log);buildProfile(log,self);expect(JSON.stringify(log)).toBe(snapshot);
  const output=exportProfile(profile,recommendations,[],'2026-11-01T00:00:00Z');expect(output).not.toHaveProperty('log');expect(output).not.toHaveProperty('decisions');expect(JSON.stringify(shareSummary(profile,recommendations))).not.toContain('cardId');
  const calls:unknown[][]=[];sendToVivic(output,{postMessage:(...args:unknown[])=>calls.push(args)} as never);expect(calls[0][1]).toBe(VIVIC_ORIGIN);
 });
 it('includes a skill and a product/course and respects ability gates',()=>{for(const path of ['A','B']as const){const {profile,recommendations:r}=runDemo(path);expect(r.items.some(x=>x.type==='skill')).toBe(true);expect(r.items.some(x=>x.type!=='skill')).toBe(true);expect(r.items.every(x=>x.minLevel<=profile.level+1)).toBe(true);}});
 it('MA simulation waits for a previous-day signal and handles flat prices',()=>{const points=Array.from({length:81},(_,i)=>({d:String(i),c:100,v:1}));expect(simulateMA(points,10,30).ret).toBe(0);expect(()=>simulateMA(points,30,20)).toThrow();const jump=points.map((p,i)=>({...p,c:i===80?200:100}));expect(simulateMA(jump,5,20).ret).toBe(0);});
 it('rejects corrupt local progress instead of offering a resume that crashes',()=>{for(const text of [null,'broken','{}','{"version":1,"log":[]}'])expect(parseSession(text)).toBeNull();const {log}=runDemo('A');const valid={version:1,log,self,gauges:{nav:50,trust:50,risk:50,research:50},term:1,revisions:[],createdAt:'2026-11-01T00:00:00Z',complete:true};expect(parseSession(JSON.stringify(valid))?.log).toHaveLength(24);expect(parseSession(JSON.stringify({...valid,self:{risk:'cautious',level:9}}))).toBeNull();});
 it('does not infer coding prerequisites solely from correct multiple-choice answers',()=>{const {log}=runDemo('B');expect(buildProfile(log,{risk:'unknown',level:0}).level).toBe(0);});
});

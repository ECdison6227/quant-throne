import {describe,it,expect} from 'vitest';
import {validateQuery,createPandaDataClient} from './pandadata.mjs';
import {maxDrawdown} from './episode_math.mjs';
describe('data integrity boundaries',()=>{
 it('rejects arbitrary API paths and malformed or excessive ranges before network access',()=>{
  expect(()=>validateQuery('https://other.invalid',{})).toThrow();
  for(const params of [{symbols:['000300xSH'],startDate:'20240101',endDate:'20240201'},{symbols:['000300.SH'],startDate:'20240230',endDate:'20240301'},{symbols:['000300.SH'],startDate:'20200101',endDate:'20260101'}])expect(()=>validateQuery('get_index_daily',params)).toThrow();
 });
 it('retries one 401 with a fresh in-memory login and returns ascending plain rows',async()=>{
  let logins=0,queries=0;
  const fetchImpl=async url=>{
   if(url.endsWith('/login')){logins++;return new Response(JSON.stringify({code:'200',data:`ephemeral-${logins}`}));}
   if(queries++===0)return new Response('',{status:401});
   return new Response(JSON.stringify({code:'200',data:[{date:'20240103',close:102},{date:'20240102',close:100}]}),{headers:{'content-type':'application/json'}});
  };
  const client=createPandaDataClient({username:'test-user',password:'test-secret'},{fetchImpl});
  const result=await client.queryWithProvenance('get_index_daily',{symbols:['000300.SH'],startDate:'20240101',endDate:'20240104',fields:[]});
  expect(logins).toBe(2);expect(result.rows.map(r=>r.date)).toEqual(['20240102','20240103']);expect(JSON.stringify(result)).not.toContain('ephemeral-');
 });
 it('measures peak-to-trough drawdown rather than return from the initial point',()=>{expect(maxDrawdown([100,120,90,110])).toBe(-0.25);});
});

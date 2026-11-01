import {describe,it,expect} from 'vitest';
import {createQuantApi} from './server.mjs';
import {readFile} from 'node:fs/promises';
const profile=JSON.parse(await readFile('docs/demo/path-A.profile.json','utf8'));
describe('public API privacy boundaries',()=>{
 it('rejects raw logs and gives a one-time, bounded structured-profile transfer',async()=>{
  const api=createQuantApi({});await new Promise(res=>api.server.listen(0,'127.0.0.1',res));const port=api.server.address().port;
  const post=async(path,body)=>fetch(`http://127.0.0.1:${port}/quant-throne/api${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{const bad=await post('/transfer',{profile:{...profile,log:[{private:'raw'}]}});expect(bad.status).toBe(400);
   const response=await post('/transfer',{profile});expect(response.status).toBe(200);const {token}=await response.json();expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
   const claimed=await post('/transfer/claim',{token});expect(claimed.status).toBe(200);expect((await claimed.json()).profile.schema).toBe('pandaai.profile.v1');expect((await post('/transfer/claim',{token})).status).toBe(410);
  }finally{await new Promise(res=>api.server.close(res));}
 });
 it('rejects unsupported market symbols without making any outbound request',async()=>{const api=createQuantApi({},{fetchImpl:()=>{throw Error('No network expected');}});await expect(api.market('https://untrusted.invalid')).rejects.toMatchObject({status:400});});
});

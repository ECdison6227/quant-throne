import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {readLocalEnv} from './env.mjs';
const env=await readLocalEnv();
// Hosts and user names are public metadata; only secret-bearing field values are scanned.
const secrets=Object.entries(env).filter(([k,v])=>/(PASSWORD|TOKEN|API_KEY|SECRET|PANDA_DATA_USERNAME)/.test(k)&&v.length>=4);
const excluded=new Set(['secrets','.git','node_modules','.work','.data-cache','.gradle','build']);
let count=0; const hits=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=resolve(dir,entry.name); if(excluded.has(entry.name)||entry.isSymbolicLink())continue;
  if(entry.isDirectory())await walk(path);
  else if((await stat(path)).size<30*1024*1024){const data=await readFile(path);count++;for(const [key,value]of secrets)if(data.includes(Buffer.from(value)))hits.push({file:relative(process.cwd(),path),field:key});}
}}
await walk(process.cwd());
if(hits.length){console.error(JSON.stringify({status:'FAIL',hits},null,2));process.exitCode=1;}
else console.log(`Secret scan passed: ${count} source, document and build files; ${secrets.length} secret values; no matches.`);

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildEpisode} from './episode_math.mjs';
const json=await readFile('src/data/episodes.pack.json','utf8');
const pack=JSON.parse(json), provenance=JSON.parse(await readFile('docs/data/provenance.json','utf8'));
const defs=JSON.parse(await readFile('tools/data/episodes.json','utf8'));
assert.equal(createHash('sha256').update(json).digest('hex'),provenance.packSha256);
assert.equal(pack.source.fixture,false); assert.ok(pack.episodes.length>=5);
for(const episode of pack.episodes){
  const cached=JSON.parse(await readFile(`.data-cache/${episode.id}.json`,'utf8'));
  for(const response of [cached.market,cached.calendar]) assert.equal(createHash('sha256').update(JSON.stringify(response.rows)).digest('hex'),response.provenance.rowsSha256);
  assert.deepEqual(episode,buildEpisode(defs.find(d=>d.id===episode.id),cached.market.rows,cached.calendar.rows,episode.provenance));
  assert.equal(episode.before.length,61); assert.equal(episode.after.length,20); assert.equal(episode.before.at(-1).c,100);
  console.log(`${episode.id}: source hash, calendar, windows and all derived fields verified`);
}
console.log('Verified: real API responses match the published data pack.');

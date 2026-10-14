import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {database} from '../scripts/sqlite.mjs';
import {createWorker} from '../server/worker.mjs';
import {registration} from './name-fixture.mjs';
import {nameAt,NAME_CAPACITY} from '../server/names.mjs';
const digest=async value=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))).toString('hex');
function fixture(db=database()){
  const worker=createWorker('<title>TraceLab</title>');
  const client=()=>{let cookie='';return {get cookie(){return cookie},set cookie(value){cookie=value},async call(path,body){const response=await worker.fetch(new Request('https://site.test'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,...(body===undefined?{}:{Origin:'https://site.test','Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})}),{DB:db});if(response.headers.get('Set-Cookie'))cookie=response.headers.get('Set-Cookie').split(';')[0];return {status:response.status,data:await response.json(),response};}};};
  return {db,client};
}
test('curated names are unique under concurrent signup and remain locked after leveling',async()=>{
  const s=fixture(),a=s.client(),b=s.client();try{
    const body=registration('반짝이는 고래'),other=registration('반짝이는 고래');
    const responses=await Promise.all([a.call('/api/profile',body),b.call('/api/profile',other)]);assert.deepEqual(responses.map(result=>result.status).sort(),[201,409]);
    const winner=responses[0].status===201?a:b,account=responses.find(result=>result.status===201).data.player;
    assert.equal(s.db.raw.prepare('SELECT COUNT(*) n FROM players').get().n,1);assert.equal(s.db.raw.prepare('SELECT COUNT(*) n FROM account_requests').get().n,1);
    const board=(await winner.call('/api/rank/leaderboard?mode=learning')).data;assert.equal(board.rows[0].name,'반짝이는 고래');assert.equal(board.rows[0].xp,0);assert.equal(board.rows[0].level,1);
    s.db.raw.prepare('INSERT INTO completions VALUES (?,?,?,?,?,?)').run(account.id,0,'2026-01-01',100,5,Date.now());
    assert.equal((await winner.call('/api/me')).data.player.level,2);assert.equal((await winner.call('/api/profile',{adjective:'빛나는',noun:'사과'})).status,409);
    const leveled=(await winner.call('/api/rank/leaderboard?mode=learning')).data.rows[0];assert.equal(leveled.level,2);assert.equal(leveled.name,'반짝이는 고래');
    for(const payload of [{adjective:'정치구호',noun:'고래'},registration('<script>x</script>'),{adjective:'반짝이는',noun:'욕설'}])assert.equal((await s.client().call('/api/profile',payload)).status,400);
    assert.equal((await s.client().call('/api/names/availability?adjective=반짝이는&noun=고래')).data.available,false);
  }finally{s.db.close();}
});
test('lost signup responses replay one account and a request ID alone cannot authenticate',async()=>{
  const s=fixture(),a=s.client(),retry=s.client();try{
    const body=registration('빛나는 사과'),made=await a.call('/api/profile',body);
    const result=await retry.call('/api/profile',body);assert.equal(result.status,200);assert.equal(result.data.player.id,made.data.player.id);assert.equal(result.data.replayed,true);
    assert.equal(s.db.raw.prepare('SELECT COUNT(*) n FROM players').get().n,1);
    const attacker=s.client();assert.equal((await attacker.call('/api/profile',{...body,recoveryCode:registration('빛나는 사과').recoveryCode})).status,409);assert.equal(attacker.cookie,'');
    assert.equal((await attacker.call('/api/profile',{...body,nickname:'빛나는 고래'})).status,409);
    const restored=s.client();assert.equal((await restored.call('/api/restore',{code:body.recoveryCode})).data.player.id,made.data.player.id);
    assert.equal((await restored.call('/api/profile',registration('빛나는 고래'))).data.code,'SESSION_CHANGED');
  }finally{s.db.close();}
});
test('same answer receipt cannot duplicate penalties, XP, or daily rank progress across devices',async()=>{
  const s=fixture(),a=s.client(),b=s.client();try{
    const body=registration('차분한 수달'),made=await a.call('/api/profile',body);await b.call('/api/restore',{code:made.data.recoveryCode});
    const run=(await a.call('/api/rank/start',{})).data.run;
    s.db.raw.prepare('UPDATE rank_runs SET mission_ids=? WHERE id=?').run('[21,22,23]',run.id);
    const starts=await Promise.all([a.call('/api/attempts/start',{missionId:21,rankRunId:run.id}),b.call('/api/attempts/start',{missionId:21,rankRunId:run.id})]);
    assert(starts.every(result=>[200,201].includes(result.status)));assert.equal(starts[0].data.attempt.id,starts[1].data.attempt.id);
    const attempt=starts[0].data.attempt;
    const wrong={step:0,answer:{input:'wrong'},requestId:crypto.randomUUID()};
    const bad=await Promise.all([a.call('/api/attempts/'+attempt.id+'/answer',wrong),b.call('/api/attempts/'+attempt.id+'/answer',wrong)]);assert(bad.every(result=>result.status===200));
    assert.equal((await a.call('/api/me')).data.player.hearts,4);assert.equal((await a.call('/api/rank/current')).data.run.mistakes,1);
    const n=100+(attempt.seed>>>0)%800,input=String(n+1);
    for(const [step,answer] of [[0,{input,patch:'none'}],[1,{input,patch:'ownership'}],[2,1]]){
      const request={step,answer,requestId:crypto.randomUUID()};const results=await Promise.all([a.call('/api/attempts/'+attempt.id+'/answer',request),b.call('/api/attempts/'+attempt.id+'/answer',request)]);assert(results.every(result=>result.status===200));
      assert.equal((await b.call('/api/attempts/'+attempt.id+'/answer',request)).data.replayed,true);
      assert.equal((await b.call('/api/attempts/'+attempt.id+'/answer',{...request,answer:0})).status,409);
    }
    assert.equal((await a.call('/api/rank/current')).data.run.position,1);assert.equal((await b.call('/api/me')).data.player.xp,50);
    assert.equal((await b.call('/api/rank/leaderboard?mode=learning')).data.rows[0].name,'차분한 수달');
    assert.equal((await s.client().call('/api/attempts/'+attempt.id)).status,401);
    assert.equal((await a.call('/api/attempts/'+attempt.id)).data.attempt.status,'complete');
  }finally{s.db.close();}
});
test('recovery rotation is retry-safe, blocks a concurrent overwrite and keeps learning identity',async()=>{
  const s=fixture(),a=s.client(),b=s.client();try{
    const body=registration('즐거운 토끼'),made=await a.call('/api/profile',body);await b.call('/api/restore',{code:body.recoveryCode});
    const code=registration('unused').recoveryCode;
    assert.equal((await a.call('/api/identity/recovery',{code,version:0,playerId:crypto.randomUUID()})).data.code,'SESSION_CHANGED');
    const next=await a.call('/api/identity/recovery',{code,version:0,playerId:made.data.player.id});assert.equal(next.status,200);assert.equal(next.data.player.recoveryVersion,1);
    assert.equal((await a.call('/api/identity/recovery',{code,version:0})).data.player.recoveryVersion,1);
    assert.equal((await b.call('/api/identity/recovery',{code:registration('unused').recoveryCode,version:0})).status,409);
    assert.equal((await s.client().call('/api/restore',{code:body.recoveryCode})).status,401);assert.equal((await s.client().call('/api/restore',{code})).data.player.id,made.data.player.id);
    assert.equal((await s.client().call('/api/profile',body)).status,409); // old signup secret cannot bypass rotation
    assert.equal((await b.call('/api/me')).data.player.nickname,'즐거운 토끼');
  }finally{s.db.close();}
});
test('migration preserves duplicate legacy names, accounts, recovery and XP before one-time selection',async()=>{
  const path='/tmp/tracelab-identity-migration-'+crypto.randomUUID()+'.sqlite',raw=new DatabaseSync(path);
  raw.exec(readFileSync(new URL('../migrations/0001_multiplayer.sql',import.meta.url),'utf8'));raw.exec(readFileSync(new URL('../migrations/0002_rank_and_labs.sql',import.meta.url),'utf8'));raw.exec("CREATE TABLE local_migrations(name TEXT PRIMARY KEY);INSERT INTO local_migrations VALUES ('0001_multiplayer.sql'),('0002_rank_and_labs.sql');");
  const id=crypto.randomUUID(),code=registration('unused').recoveryCode;
  raw.prepare('INSERT INTO players VALUES (?,?,?,?,?,?)').run(id,'이전 이름',0,await digest(code),5,Date.now());
  raw.prepare('INSERT INTO players VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(),'이전 이름',0,await digest(registration('unused').recoveryCode),5,Date.now());
  raw.prepare('INSERT INTO players VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(),'반짝이는 고래',0,await digest(registration('unused').recoveryCode),5,Date.now());
  raw.prepare('INSERT INTO completions VALUES (?,?,?,?,?,?)').run(id,0,'2026-01-01',100,5,Date.now());raw.close();
  const s=fixture(database(path)),a=s.client();try{
    const restored=await a.call('/api/restore',{code});assert.equal(restored.status,200);assert.equal(restored.data.player.id,id);assert.equal(restored.data.player.xp,100);assert.equal(restored.data.player.nameLocked,false);
    assert.equal((await a.call('/api/rank/leaderboard?mode=learning')).data.participants,1);
    assert.equal(s.db.raw.prepare('SELECT name_locked FROM players WHERE nickname=?').get('반짝이는 고래').name_locked,1);
    assert.equal((await a.call('/api/rank/start',{})).data.code,'NAME_REQUIRED');
    const selected=await a.call('/api/profile',{adjective:'반짝이는',noun:'사과'});assert.equal(selected.status,200);assert.equal(selected.data.player.id,id);assert.equal(selected.data.player.level,2);
    assert.equal((await a.call('/api/rank/leaderboard?mode=learning')).data.rows[0].name,'반짝이는 사과');assert.equal((await a.call('/api/profile',{adjective:'빛나는',noun:'고래'})).status,409);
  }finally{s.db.close();}
});
test('learning board includes zero XP, all-time levels and the current player beyond top 100; name exhaustion is explicit',async()=>{
  const s=fixture(),a=s.client();try{
    const made=await a.call('/api/profile',registration(nameAt(NAME_CAPACITY-1)));
    s.db.raw.exec('BEGIN');const insert=s.db.raw.prepare('INSERT INTO players(id,nickname,avatar,recovery_hash,hearts,created_at,name_locked) VALUES (?,?,0,?,5,?,1)');
    for(let index=0;index<NAME_CAPACITY-1;index++)insert.run(crypto.randomUUID(),nameAt(index),'test-hash-'+index,index);s.db.raw.exec('COMMIT');
    const board=(await a.call('/api/rank/leaderboard?mode=learning')).data;assert.equal(board.participants,NAME_CAPACITY);assert.equal(board.rows.length,101);assert.equal(board.rows.at(-1).mine,true);assert.equal(board.rows.at(-1).rank,NAME_CAPACITY);assert.equal(board.rows.at(-1).level,1);
    assert.equal((await a.call('/api/names/suggestion')).data.code,'NAME_CAPACITY');assert.equal((await a.call('/api/me')).data.player.id,made.data.player.id);
  }finally{s.db.close();}
});

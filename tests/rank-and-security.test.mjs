import {fixtureName,registration} from './name-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from '../scripts/sqlite.mjs';
import {createWorker} from '../server/worker.mjs';
import {advancedSpec,parseLabRequest} from '../server/advanced.mjs';
import {scenarioSpec} from '../server/rules.mjs';
import {GLOSSARY} from '../server/content.mjs';

function fixture(){
  const db=database(),worker=createWorker('<!doctype html><html><head><script>window.allowed=true;</script></head><body>TraceLab</body></html>');
  const client=()=>{let cookie='';return {async call(path,body,headers={}){const response=await worker.fetch(new Request('https://site.test'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,...(body===undefined?{}:{Origin:'https://site.test','Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})}),{DB:db});if(response.headers.get('Set-Cookie'))cookie=response.headers.get('Set-Cookie').split(';')[0];let data;try{data=await response.clone().json();}catch{data=await response.clone().text();}return {status:response.status,data,response};}};};
  return {db,worker,client};
}
async function join(client,name){assert.equal((await client.call('/api/profile',registration(fixtureName(name)))).status,201);}
async function solveMission(client,id,rankRunId){
  const start=await client.call('/api/attempts/start',{missionId:id,...(rankRunId?{rankRunId}:{})});assert([200,201].includes(start.status));
  const attempt=start.data.attempt;
  for(let step=0;step<3;step++){
    let answer=1;
    if(step<2&&id>=27){const spec=advancedSpec(id,attempt.seed);const result=await client.call('/api/labs/advanced',{attemptId:attempt.id,request:spec.exploit,patch:step===0?'none':spec.patch});assert.equal(result.status,200);answer={request:spec.exploit,patch:step===0?'none':spec.patch,evidenceId:result.data.evidenceId};}
    else if(step<2){const spec=scenarioSpec(id,attempt.seed);answer={input:spec.exploit,patch:step===0?'none':spec.patch};}
    const result=await client.call('/api/attempts/'+attempt.id+'/answer',{step,answer,score:999999});assert.equal(result.status,200);assert.equal(result.data.correct,true);
  }
  return attempt;
}
test('advanced labs use isolated records, real SQL and stored logs; evidence is bound to owner and step',async()=>{
  const s=fixture(),a=s.client(),b=s.client();try{
    await join(a,'실습검증');await join(b,'다른사용자');
    for(const id of [27,28,29,30]){
      const start=await a.call('/api/attempts/start',{missionId:id}),attempt=start.data.attempt,spec=advancedSpec(id,attempt.seed);
      assert.equal((await b.call('/api/labs/advanced',{attemptId:attempt.id,request:spec.exploit,patch:'none'})).status,404);
      const forged=await a.call('/api/attempts/'+attempt.id+'/answer',{step:0,answer:{request:spec.exploit,patch:'none',evidenceId:'not-an-evidence'}});assert.equal(forged.data.correct,false);
      for(const step of [0,1]){
        const patch=step===0?'none':spec.patch,result=await a.call('/api/labs/advanced',{attemptId:attempt.id,request:spec.exploit,patch});assert.equal(result.status,200);
        if(id===28){assert.equal(result.data.source,'server-sql');assert.equal(result.data.rows.length,step===0?3:0);}
        if(id===27)assert.equal(result.data.status,step===0?200:403);
        if(id===30){const events=s.db.raw.prepare('SELECT status FROM lab_login_events WHERE evidence_id=? ORDER BY sequence').all(result.data.evidenceId);assert.deepEqual(events.map(event=>event.status),step===0?[401,401,401,401,401,401]:[401,401,401,429,429,429]);}
        const answer={request:spec.exploit,patch,evidenceId:result.data.evidenceId};
        assert.equal((await a.call('/api/attempts/'+attempt.id+'/answer',{step,answer})).data.correct,true);
        if(step===0)assert.equal((await a.call('/api/attempts/'+attempt.id+'/answer',{step:1,answer})).data.correct,false);
        await a.call('/api/recover',{});
      }
      assert.equal((await a.call('/api/attempts/'+attempt.id+'/answer',{step:2,answer:1})).data.correct,true);
    }
    assert.equal(s.db.raw.prepare('SELECT COUNT(*) n FROM players').get().n,2);
    assert.equal(s.db.raw.prepare('SELECT COUNT(*) n FROM lab_records').get().n,2);
  }finally{s.db.close();}
});
test('rank mode has one server-owned daily run, strict order, real completion scores and no replay rewards',async()=>{
  const s=fixture(),a=s.client(),b=s.client();try{
    await join(a,'랭크첫째');await join(b,'랭크둘째');
    assert.equal((await s.client().call('/api/rank/start',{})).status,401);
    const run=(await a.call('/api/rank/start',{score:999999,missionIds:[0]})).data.run;
    assert.equal(run.missionIds.length,3);assert(run.missionIds.every(id=>id>=21&&id<=30));
    assert.equal((await a.call('/api/rank/start',{})).data.run.id,run.id);
    assert.equal((await b.call('/api/attempts/start',{missionId:run.missionIds[0],rankRunId:run.id})).status,404);
    assert.equal((await a.call('/api/attempts/start',{missionId:run.missionIds[1],rankRunId:run.id})).status,409);
    s.db.raw.prepare('UPDATE rank_runs SET mission_ids=? WHERE id=?').run(JSON.stringify([27,28,30]),run.id);
    const initial=await a.call('/api/attempts/start',{missionId:27,rankRunId:run.id});
    assert.equal((await a.call('/api/attempts/start',{missionId:27,rankRunId:run.id})).data.attempt.id,initial.data.attempt.id);
    await a.call('/api/attempts/'+initial.data.attempt.id+'/answer',{step:0,answer:{score:900}});
    const first=await solveMission(a,27,run.id);await solveMission(a,28,run.id);await solveMission(a,30,run.id);
    const done=(await a.call('/api/rank/current')).data.run;assert.equal(done.status,'complete');assert.equal(done.score,875);assert.equal(done.mistakes,1);assert.equal(done.tier,'Gold');
    await a.call('/api/attempts/'+first.id+'/answer',{step:2,answer:1,score:999999});
    assert.equal((await a.call('/api/rank/current')).data.run.score,875);
    assert.equal((await a.call('/api/attempts/current')).data.attempt,null);
    const board=(await a.call('/api/rank/leaderboard?scope=weekly')).data;assert.equal(board.rows.length,1);assert.equal(board.rows[0].score,875);assert.equal(board.participants,1);
    const other=(await b.call('/api/rank/start',{})).data.run;s.db.raw.prepare('UPDATE rank_runs SET expires_at=? WHERE id=?').run(Date.now()-1,other.id);
    assert.equal((await b.call('/api/rank/current')).data.run.status,'expired');assert.equal((await b.call('/api/rank/start',{})).data.run.id,other.id);
  }finally{s.db.close();}
});
test('concurrent ranked completion cannot advance two rounds or inflate a score',async()=>{
  const s=fixture(),a=s.client();try{
    await join(a,'동시제출');const run=(await a.call('/api/rank/start',{})).data.run;s.db.raw.prepare('UPDATE rank_runs SET mission_ids=? WHERE id=?').run('[21,22,23]',run.id);
    const start=(await a.call('/api/attempts/start',{missionId:21,rankRunId:run.id})).data.attempt,spec=scenarioSpec(21,start.seed);
    await a.call('/api/attempts/'+start.id+'/answer',{step:0,answer:{input:spec.exploit,patch:'none'}});
    await a.call('/api/attempts/'+start.id+'/answer',{step:1,answer:{input:spec.exploit,patch:spec.patch}});
    const results=await Promise.all([a.call('/api/attempts/'+start.id+'/answer',{step:2,answer:1}),a.call('/api/attempts/'+start.id+'/answer',{step:2,answer:1})]);
    assert(results.every(result=>result.status===200));assert.equal((await a.call('/api/rank/current')).data.run.position,1);
  }finally{s.db.close();}
});
test('security headers cover HTML/API/errors, reject oversized/cross-site bodies and restrict lab destinations',async()=>{
  const s=fixture(),a=s.client();try{
    for(const path of ['/','/missing','/api/me']){const {response}=await a.call(path);assert.equal(response.headers.get('X-Frame-Options'),'DENY');assert.equal(response.headers.get('Strict-Transport-Security'),'max-age=31536000');const csp=response.headers.get('Content-Security-Policy');assert.match(csp,/script-src 'self' 'sha256-/);assert(!csp.split('style-src')[0].includes('unsafe-inline'));assert.match(csp,/object-src 'none'/);}
    assert.equal((await a.call('/api/profile',{nickname:'검증','x':'a'.repeat(21000)})).status,413);
    assert.equal((await a.call('/api/profile',{nickname:'검증'},{'Sec-Fetch-Site':'cross-site'})).status,403);
    const joined=await a.call('/api/profile',registration(fixtureName('보안확인')));assert.match(joined.response.headers.get('Set-Cookie'),/HttpOnly; SameSite=Lax; Max-Age=2592000; Secure/);
    assert.equal(parseLabRequest('GET / HTTP/1.1\nHost: real.example'),null);
    assert.equal(parseLabRequest('GET //real.example HTTP/1.1\nHost: lab.local'),null);
    assert.equal(parseLabRequest('GET /admin HTTP/1.1\nHost: lab.local\nAuthorization: Bearer real-token'),null);
    assert.equal(parseLabRequest('GET /admin HTTP/1.1\nHost: lab.local\nCookie: hl_session=real-token'),null);
  }finally{s.db.close();}
});
test('search content is indexable without JavaScript; sitemap, verification and missing pages are correct',async()=>{
  const s=fixture(),a=s.client();try{
    const glossary=await a.call('/glossary');assert.equal(glossary.status,200);assert.match(glossary.data,/쉽게 생각하면|보안·해킹 용어 사전/);
    assert(GLOSSARY.length>=40);
    for(const term of GLOSSARY){const page=await a.call('/glossary/'+term.slug);assert.equal(page.status,200);assert(page.data.includes(term.term));assert(page.data.includes('google-site-verification'));}
    assert.equal((await a.call('/glossary/unknown')).status,404);
    const map=await a.call('/sitemap.xml');assert.match(map.data,/https:\/\/chocolate\.flow-er123\.workers\.dev\/chapters\/http-authorization/);assert(!map.data.includes('dotolit'));
    assert.match((await a.call('/robots.txt')).data,/Sitemap:/);
  }finally{s.db.close();}
});

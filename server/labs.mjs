import {advancedSpec,advancedLab,parseLabRequest} from './advanced.mjs';
const labQuery=(db,sql,...args)=>db.prepare(sql).bind(...args);
function labError(message,status=400){throw Object.assign(new Error(message),{status});}
export async function executeAdvancedLab(db,player,body){
  const attempt=await labQuery(db,"SELECT * FROM attempts WHERE id=? AND player_id=? AND mission_id BETWEEN 27 AND 30 AND status='active' AND expires_at>?",body.attemptId,player.id,Date.now()).first();
  if(!attempt)labError('본인의 진행 중인 전문 실습을 먼저 열어 주세요.',404);
  if(attempt.step>1)labError('요청 실험 단계가 끝났습니다.',409);
  if(attempt.rank_run_id){const rank=await labQuery(db,"SELECT id FROM rank_runs WHERE id=? AND player_id=? AND status='active' AND expires_at>?",attempt.rank_run_id,player.id,Date.now()).first();if(!rank)labError('랭크 시간이 만료되었습니다.',409);}
  const spec=advancedSpec(attempt.mission_id,attempt.seed);
  const result=advancedLab(attempt.mission_id,attempt.seed,body.request,body.patch);
  if(!result)labError('lab.local의 지원하는 요청과 실습 입력을 사용해 주세요.');
  const request=parseLabRequest(body.request);
  const evidenceId=crypto.randomUUID();
  if(attempt.mission_id===27){
    await db.batch([
      labQuery(db,'INSERT INTO lab_records (attempt_id,record_id,owner,content) VALUES (?,?,?,?) ON CONFLICT(attempt_id,record_id) DO NOTHING',attempt.id,spec.number,'viewer','My report (fixture)'),
      labQuery(db,'INSERT INTO lab_records (attempt_id,record_id,owner,content) VALUES (?,?,?,?) ON CONFLICT(attempt_id,record_id) DO NOTHING',attempt.id,spec.number+1,'other','Private incident report (fixture)')
    ]);
    const record=await labQuery(db,'SELECT owner,content FROM lab_records WHERE attempt_id=? AND record_id=?',attempt.id,Number(request.url.pathname.split('/').at(-1))).first();
    result.status=!record?404:body.patch===spec.patch&&record.owner!=='viewer'?403:200;
    result.data=!record?'Document not found':result.status===403?'Forbidden: document owner mismatch':record.content;
  }
  if(attempt.mission_id===28){const rows=await labQuery(db,result.sql.query,...result.sql.params).all();result.rows=rows.results.map(row=>row.name);result.data=JSON.stringify(result.rows);result.trace.push('SQLite executed against isolated read-only CTE');}
  const valid=attempt.step===0?body.patch==='none'&&result.exposed:body.patch===spec.patch&&result.blocked;
  const commands=[labQuery(db,'INSERT INTO lab_evidence (id,attempt_id,step,request,patch,valid,created_at) VALUES (?,?,?,?,?,?,?)',evidenceId,attempt.id,attempt.step,body.request,body.patch,valid?1:0,Date.now())];
  if(attempt.mission_id===30)for(const event of result.events)commands.push(labQuery(db,"INSERT INTO lab_login_events (evidence_id,sequence,status) VALUES (?,?,CASE WHEN ?='rate-limit' AND (SELECT COUNT(*) FROM lab_login_events WHERE evidence_id=?)>=3 THEN 429 ELSE 401 END)",evidenceId,event.sequence,body.patch,evidenceId));
  await db.batch(commands);
  if(attempt.mission_id===30){const {results}=await labQuery(db,'SELECT sequence,status FROM lab_login_events WHERE evidence_id=? ORDER BY sequence',evidenceId).all();result.events=results;result.data=JSON.stringify(results);result.status=results.at(-1).status;result.trace=results.map(event=>`attempt=${event.sequence} POST /login → ${event.status}`);}
  return {...result,evidenceId,request:body.request,patch:body.patch,source:attempt.mission_id===28?'server-sql':attempt.mission_id===27?'server-records':attempt.mission_id===30?'server-log':'server-handler',recorded:false};
}
export async function verifyAdvancedEvidence(db,attempt,answer){
  if(!answer||typeof answer.evidenceId!=='string')return false;
  const evidence=await labQuery(db,'SELECT request,patch,valid FROM lab_evidence WHERE id=? AND attempt_id=? AND step=? AND created_at>=?',answer.evidenceId,attempt.id,attempt.step,attempt.last_step_at).first();
  return !!evidence&&evidence.valid===1&&evidence.request===answer.request&&evidence.patch===answer.patch;
}

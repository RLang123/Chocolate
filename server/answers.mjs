import {STEPS,XP,validateAnswer,packetMetrics} from './rules.mjs';
import {rankAttemptRun,rankCompletionCommands,rankRunInfo} from './rank.mjs';
import {verifyAdvancedEvidence} from './labs.mjs';
const answerQuery=(db,sql,...args)=>db.prepare(sql).bind(...args);
function answerError(message,status=409,code='STEP_CHANGED'){throw Object.assign(new Error(message),{status,code});}
export async function ownedAttemptState(db,player,id){
  const attempt=await answerQuery(db,'SELECT * FROM attempts WHERE id=? AND player_id=?',id,player.id).first();
  if(!attempt)answerError('내 계정의 실습을 확인해 주세요.',404);
  const run=attempt.rank_run_id?await answerQuery(db,'SELECT * FROM rank_runs WHERE id=? AND player_id=?',attempt.rank_run_id,player.id).first():null;
  return {attempt:{id:attempt.id,missionId:attempt.mission_id,seed:attempt.seed,step:attempt.step,status:attempt.status,expiresAt:attempt.expires_at},rank:rankRunInfo(run)};
}
async function answerResult(db,player,attempt,receipt,profile,extra={}){
  const run=attempt.rank_run_id?await answerQuery(db,'SELECT * FROM rank_runs WHERE id=? AND player_id=?',attempt.rank_run_id,player.id).first():null;
  return {correct:!!receipt.correct,complete:!!receipt.complete,rank:rankRunInfo(run),player:await profile(db,player),...extra};
}
export async function processAnswer(db,player,attempt,body,{hash,profile}){
  const requested=body.requestId;
  if(requested!==undefined&&(typeof requested!=='string'||!/^[a-f0-9-]{36}$/i.test(requested)))answerError('제출 요청을 확인해 주세요.',400,'REQUEST_INVALID');
  const requestId=requested||crypto.randomUUID(),fingerprint=await hash(JSON.stringify({step:body.step,answer:body.answer}));
  const existing=await answerQuery(db,'SELECT * FROM answer_receipts WHERE attempt_id=? AND request_id=?',attempt.id,requestId).first();
  if(existing){if(existing.fingerprint!==fingerprint)answerError('같은 제출 요청에 다른 답을 보낼 수 없습니다.',409,'REQUEST_CHANGED');return answerResult(db,player,attempt,existing,profile,{awarded:false,replayed:true});}
  if(attempt.status==='complete')return answerResult(db,player,attempt,{correct:1,complete:1},profile,{alreadyComplete:true,awarded:false});
  const now=Date.now();
  if(attempt.expires_at<=now)answerError('실습 시간이 끝났습니다. 다시 시작해 주세요.',404,'ATTEMPT_EXPIRED');
  if(!Number.isInteger(body.step)||body.step!==attempt.step)answerError('다른 기기에서 진행했을 수 있습니다. 현재 단계를 다시 확인해 주세요.');
  const fresh=await answerQuery(db,'SELECT hearts FROM players WHERE id=?',player.id).first();
  if(!fresh.hearts)answerError('하트를 무료로 회복해 주세요.',409,'HEARTS_EMPTY');
  let run=null;
  if(attempt.rank_run_id){try{run=await rankAttemptRun(db,player.id,attempt.rank_run_id,attempt.mission_id);}catch(exception){const current=await answerQuery(db,'SELECT status FROM attempts WHERE id=?',attempt.id).first();if(current?.status==='complete')return answerResult(db,player,attempt,{correct:1,complete:1},profile,{alreadyComplete:true,awarded:false});throw exception;}}
  const elapsed=now-attempt.last_step_at,metrics=attempt.mission_id===3?packetMetrics(attempt.seed,body.answer,elapsed):null;
  const correct=validateAnswer(attempt.mission_id,attempt.step,body.answer,attempt.seed,elapsed)&&(attempt.mission_id!==3||metrics.errors<fresh.hearts)&&(attempt.mission_id<27||attempt.step===2||await verifyAdvancedEvidence(db,attempt,body.answer));
  const penalty=attempt.mission_id===3&&metrics?Math.max(correct?0:1,metrics.errors):correct?0:1;
  const complete=correct&&attempt.step+1>=STEPS[attempt.mission_id],token=crypto.randomUUID(),day=new Date(now).toISOString().slice(0,10);
  const guard='EXISTS(SELECT 1 FROM answer_receipts WHERE attempt_id=? AND request_id=? AND operation_token=?)',guardArgs=[attempt.id,requestId,token];
  const commands=[answerQuery(db,"INSERT INTO answer_receipts (attempt_id,request_id,fingerprint,operation_token,step,correct,complete,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM attempts WHERE id=? AND step=? AND status='active' AND expires_at>?) ON CONFLICT(attempt_id,request_id) DO NOTHING",attempt.id,requestId,fingerprint,token,attempt.step,correct?1:0,complete?1:0,now,attempt.id,attempt.step,now)];
  let completionIndex=-1;
  if(correct){
    commands.push(answerQuery(db,"UPDATE attempts SET step=step+1,status=?,last_step_at=? WHERE id=? AND step=? AND status='active' AND "+guard,complete?'complete':'active',now,attempt.id,body.step,...guardArgs));
    commands.push(answerQuery(db,'INSERT INTO answers (player_id,day,mission_id,step) SELECT ?,?,?,? WHERE '+guard+' ON CONFLICT(player_id,day,mission_id,step) DO NOTHING',player.id,day,attempt.mission_id,attempt.step,...guardArgs));
    if(complete){
      completionIndex=commands.length;
      commands.push(answerQuery(db,'INSERT INTO completions (player_id,mission_id,day,xp,gems,created_at) SELECT ?,?,?,?,5,? WHERE '+guard+' ON CONFLICT(player_id,mission_id,day) DO NOTHING',player.id,attempt.mission_id,day,XP[attempt.mission_id],now,...guardArgs));
      if(attempt.room_code)commands.push(answerQuery(db,'UPDATE room_members SET score=?,finished_at=? WHERE room_code=? AND player_id=? AND finished_at IS NULL AND '+guard,XP[attempt.mission_id],now,attempt.room_code,player.id,...guardArgs));
      // The run position guard makes advancing the same completed round idempotent.
      commands.push(...rankCompletionCommands(db,attempt,run,now));
    }
  }else{
    if(penalty)commands.push(answerQuery(db,'UPDATE players SET hearts=MAX(0,hearts-?) WHERE id=? AND '+guard,penalty,player.id,...guardArgs));
    if(run)commands.push(answerQuery(db,"UPDATE rank_runs SET mistakes=mistakes+1 WHERE id=? AND status='active' AND "+guard,run.id,...guardArgs));
  }
  const results=await db.batch(commands);
  const saved=await answerQuery(db,'SELECT * FROM answer_receipts WHERE attempt_id=? AND request_id=?',attempt.id,requestId).first();
  if(!saved){const current=await answerQuery(db,'SELECT status FROM attempts WHERE id=?',attempt.id).first();if(current?.status==='complete')return answerResult(db,player,attempt,{correct:1,complete:1},profile,{alreadyComplete:true,awarded:false});answerError('다른 기기에서 먼저 진행했습니다. 현재 단계를 다시 확인해 주세요.');}
  if(saved.fingerprint!==fingerprint)answerError('같은 제출 요청에 다른 답을 보낼 수 없습니다.',409,'REQUEST_CHANGED');
  return answerResult(db,player,attempt,saved,profile,{awarded:completionIndex>=0&&results[completionIndex].meta.changes>0,replayed:!results[0].meta.changes});
}

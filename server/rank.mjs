const rankQuery=(db,sql,...args)=>db.prepare(sql).bind(...args);
const rankDay=()=>new Date().toISOString().slice(0,10);
function rankError(message,status=400){throw Object.assign(new Error(message),{status});}
export function rankTier(score){return score>=750?'Gold':score>=450?'Silver':'Bronze';}
export function rankRunInfo(run){
  if(!run)return null;
  const missionIds=JSON.parse(run.mission_ids);
  return {id:run.id,day:run.day,missionIds,position:run.position,mistakes:run.mistakes,score:run.score,status:run.status,expiresAt:run.expires_at,startedAt:run.started_at,finishedAt:run.finished_at,tier:run.status==='complete'?rankTier(run.score):null};
}
export async function currentRankRun(db,playerId){
  await rankQuery(db,"UPDATE rank_runs SET status='expired' WHERE player_id=? AND status='active' AND expires_at<=?",playerId,Date.now()).run();
  const run=await rankQuery(db,"SELECT * FROM rank_runs WHERE player_id=? AND (day=? OR status='active') ORDER BY CASE WHEN status='active' THEN 0 ELSE 1 END,started_at DESC LIMIT 1",playerId,rankDay()).first();
  return rankRunInfo(run);
}
export async function startRankRun(db,playerId){
  const existing=await currentRankRun(db,playerId);if(existing)return existing;
  const pool=[21,22,23,24,25,26,27,28,29,30];
  for(let i=pool.length-1;i>0;i--){const n=crypto.getRandomValues(new Uint32Array(1))[0];const j=n%(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
  const now=Date.now();
  await rankQuery(db,'INSERT INTO rank_runs (id,player_id,day,mission_ids,started_at,expires_at) VALUES (?,?,?,?,?,?) ON CONFLICT(player_id,day) DO NOTHING',crypto.randomUUID(),playerId,rankDay(),JSON.stringify(pool.slice(0,3)),now,now+30*60000).run();
  return currentRankRun(db,playerId);
}
export async function rankAttemptRun(db,playerId,runId,missionId){
  if(typeof runId!=='string'||!/^[a-f0-9-]{36}$/.test(runId))rankError('랭크 도전을 확인해 주세요.');
  const run=await rankQuery(db,"SELECT * FROM rank_runs WHERE id=? AND player_id=? AND status='active' AND expires_at>?",runId,playerId,Date.now()).first();
  if(!run)rankError('진행할 수 있는 랭크 도전이 없습니다.',404);
  if(JSON.parse(run.mission_ids)[run.position]!==missionId)rankError('현재 랭크 문제부터 완료해 주세요.',409);
  return run;
}
export function rankCompletionCommands(db,attempt,run,now){
  if(!run)return [];
  return [
    rankQuery(db,"UPDATE rank_runs SET position=position+1 WHERE id=? AND position=? AND status='active' AND expires_at>? AND EXISTS(SELECT 1 FROM attempts WHERE id=? AND status='complete')",run.id,run.position,now,attempt.id),
    rankQuery(db,"UPDATE rank_runs SET status='complete',score=MAX(0,900-mistakes*25),finished_at=? WHERE id=? AND position=3 AND status='active'",now,run.id)
  ];
}
export async function rankLeaderboard(db,player,scope='weekly'){
  const since=new Date(Date.now()-6*86400000).toISOString().slice(0,10);
  const sql=`WITH best AS (
    SELECT r.*,ROW_NUMBER() OVER(PARTITION BY player_id ORDER BY score DESC,(finished_at-started_at) ASC,finished_at ASC,id ASC) choice
    FROM rank_runs r WHERE status='complete' ${scope==='weekly'?'AND day>=?':''}
  ), ranked AS (
    SELECT b.*,p.nickname,ROW_NUMBER() OVER(ORDER BY score DESC,(finished_at-started_at) ASC,finished_at ASC,player_id ASC) place
    FROM best b JOIN players p ON p.id=b.player_id WHERE choice=1
  ) SELECT player_id,nickname,score,place,finished_at-started_at duration_ms,COUNT(*) OVER() participants FROM ranked ORDER BY place LIMIT 100`;
  const {results}=await rankQuery(db,sql,...(scope==='weekly'?[since]:[])).all();
  return {scope,rows:results.map(row=>({rank:row.place,name:row.nickname,score:row.score,tier:rankTier(row.score),durationMs:row.duration_ms,mine:row.player_id===player?.id})),participants:results[0]?.participants||0,updatedAt:Date.now()};
}

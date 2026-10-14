import {NAME_CAPACITY,nameAt,composedName} from './names.mjs';
const identityQuery=(db,sql,...args)=>db.prepare(sql).bind(...args);
function identityError(message,status=400,code='IDENTITY_ERROR'){throw Object.assign(new Error(message),{status,code});}
const identityUUID=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const identityConstraint=exception=>/UNIQUE constraint failed/i.test(String(exception.message)+' '+String(exception.cause?.message));
export async function nameAvailability(db,body,player){
  const name=composedName(body);
  const found=await identityQuery(db,'SELECT id FROM players WHERE nickname=? AND name_locked=1',name.nickname).first();
  return {...name,available:!found||found.id===player?.id,owned:!!found&&found.id===player?.id};
}
export async function suggestName(db){
  const {results}=await identityQuery(db,'SELECT nickname FROM players WHERE name_locked=1').all();
  const used=new Set(results.map(row=>row.nickname)),start=crypto.getRandomValues(new Uint32Array(1))[0]%NAME_CAPACITY;
  for(let offset=0;offset<NAME_CAPACITY;offset++){const nickname=nameAt((start+offset)%NAME_CAPACITY);if(!used.has(nickname)){const [adjective,noun]=nickname.split(' ');return {nickname,adjective,noun,capacity:NAME_CAPACITY};}}
  identityError('지금은 선택 가능한 별명이 모두 사용 중입니다. 잠시 후 다시 확인해 주세요.',503,'NAME_CAPACITY');
}
export async function saveIdentity(db,player,body,hash){
  const name=composedName(body).nickname,avatar=Number.isInteger(body.avatar)&&body.avatar>=0&&body.avatar<6?body.avatar:0;
  let keyHash=null,requestHash=null,recoveryHash=null,code=null;
  if(body.registrationId!==undefined){
    if(!identityUUID(body.registrationId)||typeof body.recoveryCode!=='string'||!/^HL-[A-F0-9]{24}$/i.test(body.recoveryCode))identityError('가입 요청과 복구 코드를 확인해 주세요.');
    code=body.recoveryCode.toUpperCase();keyHash=await hash(body.registrationId.toLowerCase());recoveryHash=await hash(code);requestHash=await hash(JSON.stringify([name,avatar,recoveryHash]));
    const existing=await identityQuery(db,'SELECT r.request_hash,p.* FROM account_requests r JOIN players p ON p.id=r.player_id WHERE r.key_hash=?',keyHash).first();
    if(existing){
      if(existing.request_hash!==requestHash||existing.recovery_hash!==recoveryHash||player&&player.id!==existing.id)identityError('기존 가입 요청과 정보가 다릅니다. 보관한 복구 코드로 기존 계정을 확인해 주세요.',409,'REGISTRATION_MISMATCH');
      return {player:existing,recoveryCode:code,status:200,session:true,replayed:true};
    }
  }
  if(player){
    if(keyHash)identityError('이 기기에 이미 계정이 접속돼 있습니다. 현재 계정을 먼저 확인해 주세요.',409,'SESSION_CHANGED');
    const fresh=await identityQuery(db,'SELECT * FROM players WHERE id=?',player.id).first();
    if(fresh.name_locked){
      if(fresh.nickname!==name)identityError('처음 정한 별명은 계속 사용합니다. 레벨과 기록도 이 계정에 유지됩니다.',409,'NAME_LOCKED');
      return {player:fresh,status:200,session:false};
    }
    try{const changed=await identityQuery(db,'UPDATE players SET nickname=?,name_locked=1 WHERE id=? AND name_locked=0',name,player.id).run();
      const saved=await identityQuery(db,'SELECT * FROM players WHERE id=?',player.id).first();
      if(!changed.meta.changes&&saved.nickname!==name)identityError('다른 기기에서 이미 별명을 확정했습니다. 계정 정보를 다시 확인해 주세요.',409,'NAME_LOCKED');
      return {player:saved,status:200,session:false};
    }catch(exception){if(identityConstraint(exception))identityError('이미 사용 중인 별명입니다. 다른 단어 조합을 골라 주세요.',409,'NAME_TAKEN');throw exception;}
  }
  if(!keyHash)identityError('가입 요청이 준비되지 않았습니다. 새로고침한 뒤 다시 시작해 주세요.');
  const id=crypto.randomUUID(),now=Date.now();
  try{
    await db.batch([
      identityQuery(db,'INSERT INTO players (id,nickname,avatar,recovery_hash,created_at,name_locked) VALUES (?,?,?,?,?,1)',id,name,avatar,recoveryHash,now),
      identityQuery(db,'INSERT INTO account_requests (key_hash,player_id,request_hash,created_at) VALUES (?,?,?,?)',keyHash,id,requestHash,now)
    ]);
    return {player:{id,nickname:name,avatar,hearts:5,name_locked:1},recoveryCode:code,status:201,session:true,replayed:false};
  }catch(exception){
    if(identityConstraint(exception)){
      const existing=await identityQuery(db,'SELECT r.request_hash,p.* FROM account_requests r JOIN players p ON p.id=r.player_id WHERE r.key_hash=?',keyHash).first();
      if(existing){if(existing.request_hash===requestHash&&existing.recovery_hash===recoveryHash)return {player:existing,recoveryCode:code,status:200,session:true,replayed:true};identityError('가입 요청의 정보가 변경됐습니다. 같은 요청으로 다시 확인해 주세요.',409,'REGISTRATION_MISMATCH');}
      const taken=await identityQuery(db,'SELECT id FROM players WHERE nickname=? AND name_locked=1',name).first();
      if(taken)identityError('이미 사용 중인 별명입니다. 다른 단어 조합을 골라 주세요.',409,'NAME_TAKEN');
      identityError('복구 코드가 이미 사용 중입니다. 새 가입을 준비해 주세요.',409,'RECOVERY_USED');
    }
    throw exception;
  }
}
export async function rotateRecovery(db,player,body,hash){
  if(body.playerId!==undefined&&body.playerId!==player.id)identityError('이 기기의 접속 계정이 바뀌었습니다. 현재 계정을 다시 확인해 주세요.',409,'SESSION_CHANGED');
  if(typeof body.code!=='string'||!/^HL-[A-F0-9]{24}$/i.test(body.code)||!Number.isInteger(body.version)||body.version<0)identityError('새 복구 코드와 계정 상태를 확인해 주세요.');
  const code=body.code.toUpperCase(),digest=await hash(code);
  try{
    await identityQuery(db,'UPDATE players SET recovery_version=recovery_version+CASE WHEN recovery_hash=? THEN 0 ELSE 1 END,recovery_hash=? WHERE id=? AND (recovery_version=? OR recovery_hash=?)',digest,digest,player.id,body.version,digest).run();
    const fresh=await identityQuery(db,'SELECT * FROM players WHERE id=?',player.id).first();
    if(fresh.recovery_hash!==digest)identityError('다른 기기에서 먼저 복구 코드를 변경했습니다. 계정 정보를 새로 확인해 주세요.',409,'RECOVERY_CHANGED');
    return {player:fresh,recoveryCode:code};
  }catch(exception){if(identityConstraint(exception))identityError('이 코드는 사용할 수 없습니다. 새 복구 코드를 준비해 주세요.',409,'RECOVERY_USED');throw exception;}
}

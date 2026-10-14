export const ADVANCED_CHAPTERS = [
  {id:27,slug:'http-authorization',title:'HTTP 요청과 문서 접근 권한',category:'web',term:'authorization',goal:'HTTP 요청을 읽고 객체마다 접근 권한을 확인합니다.',patch:'ownership',patchLabel:'서버에서 문서 소유자 검사',steps:['정상 요청을 보낸 뒤 문서 번호를 바꾸고 응답 차이를 확인합니다.','소유자 검사를 적용하고 같은 요청을 다시 보냅니다.','관찰한 원인에 맞는 방어 방법을 선택합니다.'],cause:'문서 번호로 데이터를 찾았지만 로그인한 사용자의 권한을 검사하지 않았습니다.',defense:'서버가 요청마다 문서 소유자와 세션 사용자를 비교해야 합니다.'},
  {id:28,slug:'sql-parameter-binding',title:'SQL 검색 조건과 매개변수',category:'defense',term:'sql-injection',goal:'격리된 SQL 테이블에서 문자열 결합과 매개변수 바인딩의 차이를 확인합니다.',patch:'parameter',patchLabel:'SQL 매개변수로 입력 전달',steps:['정상 검색과 제공된 OR 입력을 비교하고 SQL 결과를 읽습니다.','매개변수를 적용해 같은 입력을 검색하고 결과 개수를 비교합니다.','입력 검사를 넘어 필요한 데이터베이스 방어를 선택합니다.'],cause:'검색어를 SQL 문자열에 붙여 사용자가 검색 조건까지 바꿀 수 있었습니다.',defense:'매개변수로 값과 명령을 분리하고 데이터베이스 계정 권한을 제한합니다.'},
  {id:29,slug:'server-trust-boundary',title:'요청 헤더와 서버의 신뢰 경계',category:'account',term:'trust-boundary',goal:'사용자가 보낸 역할 표시와 서버가 확인한 권한을 구별합니다.',patch:'server-role',patchLabel:'서버에 저장한 역할로 판정',steps:['X-Role 헤더를 바꿔 관리자 응답이 달라지는지 확인합니다.','서버의 역할 검사를 적용하고 같은 요청을 다시 보냅니다.','사용자 입력을 신뢰하면 안 되는 이유를 선택합니다.'],cause:'브라우저가 보낸 X-Role 값을 실제 관리자 권한으로 사용했습니다.',defense:'서버가 인증한 사용자와 저장된 역할을 사용해 권한을 판정합니다.'},
  {id:30,slug:'login-rate-limiting',title:'로그인 기록과 요청 제한',category:'defense',term:'rate-limit',goal:'반복 로그인 요청과 차단 로그를 읽고 요청 제한의 효과를 확인합니다.',patch:'rate-limit',patchLabel:'실습 계정에 3회 요청 제한',steps:['한 번의 요청과 여섯 번의 반복 요청에서 상태 코드를 비교합니다.','요청 제한을 적용하고 429 응답이 나타나는지 확인합니다.','한 가지 제한에만 의존하지 않는 계정 보호 방법을 선택합니다.'],cause:'틀린 비밀번호를 반복해서 보내도 시도 횟수를 제한하지 않았습니다.',defense:'계정·네트워크별 시도 제한, 추가 인증과 이상 로그인 탐지를 함께 사용합니다.'}
];

export function advancedSpec(id,seed=1) {
  const chapter=ADVANCED_CHAPTERS.find(item=>item.id===id);if(!chapter)return null;
  const number=1000+(seed>>>0)%700;
  const requests={
    27:[`GET /records/${number} HTTP/1.1\nHost: lab.local\nCookie: demo-session=viewer`,`GET /records/${number+1} HTTP/1.1\nHost: lab.local\nCookie: demo-session=viewer`],
    28:['GET /search?name=Byte HTTP/1.1\nHost: lab.local',"GET /search?name=%27%20OR%20%271%27%3D%271 HTTP/1.1\nHost: lab.local"],
    29:['GET /admin HTTP/1.1\nHost: lab.local\nX-Role: viewer','GET /admin HTTP/1.1\nHost: lab.local\nX-Role: admin'],
    30:['POST /login HTTP/1.1\nHost: lab.local\nX-Lab-Burst: 1\nContent-Type: application/json\n\n{"user":"viewer","password":"wrong-demo"}','POST /login HTTP/1.1\nHost: lab.local\nX-Lab-Burst: 6\nContent-Type: application/json\n\n{"user":"viewer","password":"wrong-demo"}']
  }[id];
  return {...chapter,number,normal:requests[0],exploit:requests[1],context:id===27?`실습 사용자 viewer · 내 문서 ${number} · 다른 사용자의 문서 ${number+1}`:id===28?'실습 테이블: Byte, Nori, Coco · 실제 계정 테이블과 분리됨':id===29?'인증된 실습 사용자의 서버 역할: viewer · 관리자만 /admin 접근 가능':'실습 계정 viewer · 비밀번호는 모두 연습용 · 실제 로그인 요청을 보내지 않음'};
}

export function parseLabRequest(raw) {
  if(typeof raw!=='string'||raw.length>1800)return null;
  const lines=raw.replaceAll('\r\n','\n').split('\n'),match=lines.shift()?.match(/^(GET|POST) (\/[\x21-\x7e]{1,500}) HTTP\/1\.1$/);
  if(!match||match[2].startsWith('//'))return null;
  const headers={};let body='';
  for(let i=0;i<lines.length;i++){if(lines[i]===''){body=lines.slice(i+1).join('\n');break;}const header=lines[i].match(/^([A-Za-z][A-Za-z0-9-]{0,40}):\s*([^\r\n]{0,250})$/);if(!header)return null;const key=header[1].toLowerCase();if(headers[key]!==undefined)return null;headers[key]=header[2];}
  if(headers.host!=='lab.local')return null;
  if(Object.keys(headers).some(key=>!['host','cookie','x-role','x-lab-burst','content-type'].includes(key)))return null;
  if(headers.cookie&&headers.cookie!=='demo-session=viewer')return null;
  if(headers['x-role']&&!['viewer','admin'].includes(headers['x-role']))return null;
  if(headers['content-type']&&headers['content-type']!=='application/json')return null;
  try{return {method:match[1],url:new URL(match[2],'https://lab.local'),headers,body};}catch{return null;}
}

export function advancedLab(id,seed,raw,patch='none') {
  const spec=advancedSpec(id,seed),request=parseLabRequest(raw);
  if(!spec||!request||!['none','cosmetic',spec.patch].includes(patch))return null;
  const secured=patch===spec.patch;let status=200,data='',trace=[],exposed=false,blocked=false,rows=[],sql=null,events=[];
  if(id===27){const match=request.url.pathname.match(/^\/records\/(\d{1,6})$/);if(request.method!=='GET'||!match)return null;const target=Number(match[1]);if(![spec.number,spec.number+1].includes(target))return {status:404,data:'Document not found',trace:['지정한 문서가 없습니다'],exposed:false,blocked:false};const foreign=target===spec.number+1;blocked=foreign&&secured;exposed=foreign&&!secured;status=blocked?403:200;data=blocked?'Forbidden: document owner mismatch':foreign?'Private incident report (fixture)':'My report (fixture)';trace=[`SELECT record_id, owner FROM lab_records WHERE record_id = ${target}`,'session.user = viewer',`document.owner = ${foreign?'other':'viewer'}`,secured?'문서 소유자와 세션 사용자를 비교':'文書の所有者は未検査'];}
  if(id===28){if(request.method!=='GET'||request.url.pathname!=='/search')return null;const input=request.url.searchParams.get('name')||'';const attack=input==="' OR '1'='1";if(!attack&&!['Byte','Nori','Coco',''].includes(input))return null;rows=secured?['Byte','Nori','Coco'].filter(name=>name===input):attack?['Byte','Nori','Coco']:['Byte','Nori','Coco'].filter(name=>name===input);exposed=attack&&!secured;blocked=attack&&secured;const prefix="WITH demo(name) AS (VALUES ('Byte'),('Nori'),('Coco')) SELECT name FROM demo WHERE name = ";sql={query:prefix+(secured?'?':"'"+input+"'"),params:secured?[input]:[]};data=JSON.stringify(rows);trace=[sql.query,secured?'input is bound as a value':'input is concatenated into SQL',`rows = ${rows.length}`];}
  if(id===29){if(request.method!=='GET'||request.url.pathname!=='/admin')return null;const admin=request.headers['x-role']==='admin';exposed=admin&&!secured;blocked=admin&&secured;status=exposed?200:403;data=exposed?'Admin settings (fixture)':'Forbidden: server role is viewer';trace=[`X-Role: ${request.headers['x-role']||'(missing)'}`,'server session role = viewer',secured?'server role controls access':'request header controls access'];}
  if(id===30){if(request.method!=='POST'||request.url.pathname!=='/login')return null;let body;try{body=JSON.parse(request.body);}catch{return null;}if(body.user!=='viewer'||body.password!=='wrong-demo')return null;const burst=Number(request.headers['x-lab-burst']||1);if(!Number.isInteger(burst)||burst<1||burst>6)return null;events=Array.from({length:burst},(_,i)=>({sequence:i+1,status:secured&&i>=3?429:401}));exposed=burst===6&&!secured;blocked=burst===6&&secured;status=events.at(-1).status;data=JSON.stringify(events);trace=events.map(e=>`attempt=${e.sequence} POST /login → ${e.status}`);}
  return {status,data,trace,exposed,blocked,rows,sql,events,model:true,recorded:false};
}

export function validateAdvancedAnswer(id,step,answer,seed) {
  if(step===2)return answer===1;
  if(!answer||typeof answer!=='object')return false;
  const result=advancedLab(id,seed,answer.request,answer.patch);
  return !!result&&(step===0?answer.patch==='none'&&result.exposed:step===1&&result.blocked);
}

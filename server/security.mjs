export async function scriptHashes(html){
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  return Promise.all(scripts.map(async match=>{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(match[1]));let binary='';for(const byte of new Uint8Array(digest))binary+=String.fromCharCode(byte);return "'sha256-"+btoa(binary)+"'";}));
}
export function secureResponse(req,response,hashes=[]){
  const headers=new Headers(response.headers);
  const secure=new URL(req.url).protocol==='https:';
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('X-Frame-Options','DENY');
  headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('Cross-Origin-Resource-Policy','same-origin');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), usb=(), payment=()');
  headers.set('Content-Security-Policy',`default-src 'none'; script-src 'self' ${hashes.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'${secure?'; upgrade-insecure-requests':''}`);
  if(secure)headers.set('Strict-Transport-Security','max-age=31536000');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export async function boundedJson(req,maxBytes=20000){
  const fail=(message,status)=>{throw Object.assign(new Error(message),{status});};
  const length=req.headers.get('Content-Length');if(length&&Number(length)>maxBytes)fail('요청이 너무 큽니다.',413);
  if(!req.body)return {};
  const reader=req.body.getReader(),decoder=new TextDecoder();let bytes=0,raw='';
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes){await reader.cancel();fail('요청이 너무 큽니다.',413);}raw+=decoder.decode(value,{stream:true});}
  raw+=decoder.decode();let body;try{body=JSON.parse(raw);}catch{fail('JSON 요청을 읽을 수 없습니다.',400);}
  if(!body||Array.isArray(body)||typeof body!=='object')fail('요청은 JSON 객체여야 합니다.',400);
  return body;
}

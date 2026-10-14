import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateCloudflareConfig,verifyRemoteDatabase} from './cloudflare-config.mjs';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
function command(args,capture=false){
  const result=spawnSync(process.execPath,args,{encoding:'utf8',stdio:capture?['ignore','pipe','inherit']:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error('Cloudflare build preparation failed. Check the preceding error.');
  return result.stdout;
}
try{
  command(['scripts/build.mjs']);
  // Workers Builds may call Wrangler directly, so prepare the existing schema
  // before upload. Local builds and GitHub verification stay read-only.
  if(process.env.WORKERS_CI==='1'||process.env.WRANGLER_CI_OVERRIDE_NAME){
    const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
    const {accountId,db}=validateCloudflareConfig(config,process.env);
    process.env.CLOUDFLARE_ACCOUNT_ID=accountId;
    const cli=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
    verifyRemoteDatabase(db,JSON.parse(command([cli,'d1','list','--json','--config','wrangler.jsonc'],true)));
    command([cli,'d1','migrations','list','DB','--remote','--config','wrangler.jsonc']);
    command([cli,'d1','migrations','apply','DB','--remote','--config','wrangler.jsonc']);
    console.log('Workers Builds: existing D1 schema prepared before upload.');
  }
}catch(error){console.error(error.message);process.exitCode=1;}

import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {validateCloudflareConfig} from './cloudflare-config.mjs';
validateCloudflareConfig(JSON.parse(readFileSync('wrangler.jsonc','utf8')),process.env,{checkAuth:false});
const source=path=>readFileSync(path,'utf8');
const inlineModule=path=>source(path).replace(/^import [^\n]+;\s*$/gm,'').replaceAll('export ','');
let html=source('index.html');
function block(start,end,contents,before){
  const content=start+'\n<script>\n'+contents+'\n</script>\n'+end;
  if(html.includes(start)){const a=html.indexOf(start),b=html.indexOf(end,a)+end.length;html=html.slice(0,a)+content+html.slice(b);}
  else if(before)html=html.replace(before,content+'\n'+before);
  else html=html.replace('</body>',content+'\n</body>');
}
block('<!-- TRACE_CONTENT -->','<!-- END_TRACE_CONTENT -->',inlineModule('server/content.mjs'),'<!-- SHARED_RULES -->');
block('<!-- SHARED_RULES -->','<!-- END_SHARED_RULES -->',inlineModule('server/advanced.mjs')+'\n'+inlineModule('server/rules.mjs'),"<script>\n'use strict';");
if(source('site/app.mjs').includes('</script>'))throw new Error('Frontend script contains an unsafe HTML closing marker.');
block('<!-- TRACE_APP -->','<!-- END_TRACE_APP -->',source('site/app.mjs'));
writeFileSync('index.html',html);mkdirSync('dist/server',{recursive:true});writeFileSync('dist/index.html',html);
const modules=['advanced','rules','content','security','pages','rank','labs','worker'].map(name=>inlineModule('server/'+name+'.mjs')).join('\n');
writeFileSync('dist/server/index.js',modules+'\nexport default createWorker('+JSON.stringify(html)+');\n');
console.log('Built TraceLab frontend, public learning pages and Cloudflare Worker.');

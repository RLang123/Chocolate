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
const heroStart='<!-- TRACE_HERO -->',heroEnd='<!-- END_TRACE_HERO -->';
const heroMarkup=heroStart+'\n'+source('site/hero.html')+'\n'+heroEnd+'\n';
if(html.includes(heroStart)){const a=html.indexOf(heroStart),b=html.indexOf(heroEnd,a)+heroEnd.length;html=html.slice(0,a)+heroMarkup.trimEnd()+html.slice(b);}
else {
  const a=html.indexOf('<div class="welcome lab-hero editorial-hero">'),b=html.indexOf('<section class="starter-path"',a);
  if(a<0||b<0)throw new Error('Homepage hero placement was not found.');
  html=html.slice(0,a)+heroMarkup+html.slice(b);
}
const app=source('site/app.mjs')+'\n'+source('site/motion.mjs')+'\n'+source('site/hero.mjs');
if(app.includes('</script>'))throw new Error('Frontend script contains an unsafe HTML closing marker.');
block('<!-- TRACE_APP -->','<!-- END_TRACE_APP -->',app);
const styleStart='/* TRACE_MOTION */',styleEnd='/* END_TRACE_MOTION */';
const motionStyles=styleStart+'\n'+source('site/motion.css')+'\n'+source('site/hero.css')+'\n'+styleEnd;
if(html.includes(styleStart)){const a=html.indexOf(styleStart),b=html.indexOf(styleEnd,a)+styleEnd.length;html=html.slice(0,a)+motionStyles+html.slice(b);}
else html=html.replace('</style>',motionStyles+'\n</style>');
writeFileSync('index.html',html);mkdirSync('dist/server',{recursive:true});writeFileSync('dist/index.html',html);
const modules=['advanced','rules','content','security','pages','rank','labs','worker'].map(name=>inlineModule('server/'+name+'.mjs')).join('\n');
writeFileSync('dist/server/index.js',modules+'\nexport default createWorker('+JSON.stringify(html)+');\n');
console.log('Built TraceLab frontend, public learning pages and Cloudflare Worker.');

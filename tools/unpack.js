const fs=require('fs'),zlib=require('zlib'),path=require('path');
const [,,src,outDir]=process.argv;
fs.mkdirSync(outDir,{recursive:true});
const html=fs.readFileSync(src,'utf8');
function tag(t){const m=html.match(new RegExp('<script type="__bundler/'+t+'"[^>]*>([\\s\\S]*?)</script>'));return m?m[1]:null}
const manifest=JSON.parse(tag('manifest'));let template=JSON.parse(tag('template'));
const ext=tag('ext_resources');console.log('ext',ext&&ext.slice(0,300));
const list=[];
for(const [u,e] of Object.entries(manifest)){
  let b=Buffer.from(e.data,'base64'); if(e.compressed) b=zlib.gunzipSync(b);
  const extn=(e.mime||'').split('/')[1]?.replace(/[^a-z0-9]/gi,'').slice(0,6)||'bin';
  const f=u+'.'+extn; fs.writeFileSync(path.join(outDir,f),b); list.push([u,e.mime,b.length]);
  template=template.split(u).join(f);
}
fs.writeFileSync(path.join(outDir,'index.html'),template);
console.log(list.map(x=>x.join(' ')).join('\n')); console.log('template',template.length);

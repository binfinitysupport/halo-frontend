const fs=require('fs');const d=process.argv[2];const h=fs.readFileSync(d+'/index.html','utf8');
const m=h.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);fs.writeFileSync(d+'/logic.js',m[1]);
const rest=h.replace(m[0],'');fs.writeFileSync(d+'/markup.html',rest);
console.log(d,'logic',m[1].length,'markup',rest.length);

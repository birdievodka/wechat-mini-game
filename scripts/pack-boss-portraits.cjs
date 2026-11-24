// Compact local selector/codex portraits. Full animation atlases load per encounter.
const fs=require('node:fs'),crypto=require('node:crypto'),sharp=require('sharp');
const ids=['zhangjiao','lvbu','dongzhuo','yuanshao','caocao','menghuo','simayi'];
(async()=>{const layers=[],sources=[];for(let i=0;i<ids.length;i++){
 const id=ids[i],path=`assets/remote-content/boss-${id}/${id==='lvbu'?'lvbu':'boss-'+id}-actions.png`;
 const atlas=id==='lvbu'?require('../art/runtime-lvbu/manifest.json'):require('../art/runtime-bosses/manifest.json').atlases.find(a=>a.dest===path);
 const frame=await require('./boss-density.cjs').restoreFrame(atlas,id==='lvbu'?12:0);
 layers.push({input:await sharp(frame).resize(144,144).png().toBuffer(),left:i%4*144,top:Math.floor(i/4)*144});
 sources.push({id,path,sha256:crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')});
 }const dest='assets/chronicle-ui/boss-portraits.png';await sharp({create:{width:576,height:288,channels:4,background:'#00000000'}}).composite(layers).png({palette:true,colours:128,dither:0}).toFile(dest);
 if(!fs.existsSync(dest+'.meta')){const m=JSON.parse(fs.readFileSync('assets/remote-content/hidden-heroes/hero-portraits.png.meta'));const old=m.uuid,id=crypto.randomUUID();fs.writeFileSync(dest+'.meta',JSON.stringify(JSON.parse(JSON.stringify(m).replaceAll(old,id).replaceAll('hero-portraits','boss-portraits')),null,2)+'\n');}
 fs.writeFileSync('art/runtime-bosses/portraits-manifest.json',JSON.stringify({sources,dest,width:576,height:288,bytes:fs.statSync(dest).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex')},null,2)+'\n');console.log('Local boss portraits:',fs.statSync(dest).size,'bytes');
})().catch(e=>{console.error(e);process.exitCode=1});

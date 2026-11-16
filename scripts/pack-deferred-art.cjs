// Split the adopted portraits without resizing or changing any RGBA pixel.
const fs=require('node:fs'),crypto=require('node:crypto'),sharp=require('sharp');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{const source='art/runtime-youth/portraits.png',old='assets/results/portraits.png';if(!fs.existsSync(source))fs.copyFileSync(old,source);
 const meta=await sharp(source).metadata(),outputs=[];for(const [dest,top] of [['assets/presentation/hero-hud.png',0],[old,meta.height/2]]){
  const buffer=await sharp(source).extract({left:0,top,width:meta.width,height:meta.height/2}).png({compressionLevel:9}).toBuffer();fs.writeFileSync(dest,buffer);
  if(!fs.existsSync(dest+'.meta')){const m=JSON.parse(fs.readFileSync(old+'.meta')),uuid=crypto.randomUUID();fs.writeFileSync(dest+'.meta',JSON.stringify(JSON.parse(JSON.stringify(m).replaceAll(m.uuid,uuid)),null,2)+'\n');}
  outputs.push({file:dest,width:meta.width,height:meta.height/2,sourceRect:[0,top,meta.width,meta.height/2],bytes:buffer.length,sha256:sha(buffer)});
 }fs.writeFileSync('art/runtime-youth/deferred-manifest.json',JSON.stringify({source,sourceSha256:sha(fs.readFileSync(source)),outputs},null,2)+'\n');
 console.log(outputs.map(x=>[x.file,x.bytes]));})().catch(e=>{console.error(e);process.exitCode=1});

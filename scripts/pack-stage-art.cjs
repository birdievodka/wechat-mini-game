// Crop approved six-theme environment concept into compact UI thumbnails + ground patches.
const sharp=require('sharp'),fs=require('fs'),crypto=require('crypto');
(async()=>{
 const source='art/concepts/stage-challenge-v8/themes.png',layers=[];
 for(let i=0;i<6;i++){
  const left=[18,605,1187][i%3],top=i<3?111:499;
  const thumb=await sharp('art/concepts/stage-challenge-v8/stage-picker.png').extract({left:[316,710,1106][i%3],top:i<3?158:416,width:360,height:126}).resize(320,128).toBuffer();
  const ground=await sharp(source).extract({left:left+65,top:top+130,width:425,height:192}).resize(320,192).toBuffer();
  layers.push({input:thumb,left:i%3*320,top:Math.floor(i/3)*320},{input:ground,left:i%3*320,top:Math.floor(i/3)*320+128});
 }
 const file='assets/chronicle-ui/stage-themes.jpg';await sharp({create:{width:960,height:640,channels:3,background:'#71924e'}}).composite(layers).jpeg({quality:88,chromaSubsampling:'4:4:4'}).toFile(file);
 const meta=file+'.meta';if(!fs.existsSync(meta)){const m=JSON.parse(fs.readFileSync('assets/chronicle-ui/hero-parts.png.meta'));const before=m.uuid,id=crypto.randomUUID();let s=JSON.stringify(m).replaceAll(before,id).replaceAll('hero-parts','stage-themes').replaceAll('.png','.jpg').replace('"hasAlpha":true','"hasAlpha":false');fs.writeFileSync(meta,JSON.stringify(JSON.parse(s),null,2)+'\n');}
 const panel='assets/chronicle-ui/stage-jade.png';await sharp('art/runtime-stage-ui/jade-panel-source.png').extract({left:46,top:58,width:1444,height:904}).resize(480,300).png({palette:true,colours:128,dither:.2}).toFile(panel);if(!fs.existsSync(panel+'.meta')){const m=JSON.parse(fs.readFileSync('assets/chronicle-ui/hero-parts.png.meta'));const old=m.uuid,id=crypto.randomUUID();fs.writeFileSync(panel+'.meta',JSON.stringify(JSON.parse(JSON.stringify(m).replaceAll(old,id).replaceAll('hero-parts','stage-jade')),null,2)+'\n');}
 fs.writeFileSync('art/concepts/stage-challenge-v8/runtime-theme-source.json',JSON.stringify({thumbnailSource:'art/concepts/stage-challenge-v8/stage-picker.png',source,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),output:file,width:960,height:640,decodedBytes:960*640*4,description:'approved source crops, 3x2 cells 320 square: thumbnail top128, ground lower192'},null,2)+'\n');console.log(file,fs.statSync(file).size,'bytes');
})().catch(e=>{console.error(e);process.exitCode=1;});

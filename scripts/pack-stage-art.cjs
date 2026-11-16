// Crop approved six-theme environment concept into compact UI thumbnails + ground patches.
const sharp=require('sharp'),fs=require('fs'),crypto=require('crypto');
(async()=>{
 const source='art/concepts/stage-challenge-v8/themes.png',thumbnailSource='art/runtime-stage-ui/battlefields.png',layers=[];
 const thumbInfo=await sharp(thumbnailSource).metadata();const crops=[];
 for(let i=0;i<6;i++){
  const left=[18,605,1187][i%3],top=i<3?111:499;
  const x=Math.floor(i%2*thumbInfo.width/2),y=Math.floor(Math.floor(i/2)*thumbInfo.height/3);
  const crop={left:x+2,top:y+2,width:Math.floor((i%2+1)*thumbInfo.width/2)-x-4,height:Math.floor((Math.floor(i/2)+1)*thumbInfo.height/3)-y-4};crops.push(crop);
  const thumb=await sharp(thumbnailSource).extract(crop).resize(320,128,{fit:'cover',position:'centre'}).toBuffer();
  const ground=await sharp(source).extract({left:left+65,top:top+130,width:425,height:192}).resize(320,192).toBuffer();
  layers.push({input:thumb,left:i%3*320,top:Math.floor(i/3)*320},{input:ground,left:i%3*320,top:Math.floor(i/3)*320+128});
 }
 const file='assets/chronicle-ui/stage-themes.jpg';await sharp({create:{width:960,height:640,channels:3,background:'#71924e'}}).composite(layers).jpeg({quality:88,chromaSubsampling:'4:4:4'}).toFile(file);
 const meta=file+'.meta';if(!fs.existsSync(meta)){const m=JSON.parse(fs.readFileSync('assets/remote-content/hidden-heroes/hero-parts.png.meta'));const before=m.uuid,id=crypto.randomUUID();let s=JSON.stringify(m).replaceAll(before,id).replaceAll('hero-parts','stage-themes').replaceAll('.png','.jpg').replace('"hasAlpha":true','"hasAlpha":false');fs.writeFileSync(meta,JSON.stringify(JSON.parse(s),null,2)+'\n');}
 const panel='assets/chronicle-ui/stage-jade.png';await sharp('art/runtime-stage-ui/jade-panel-source.png').extract({left:46,top:58,width:1444,height:904}).resize(480,300).png({palette:true,colours:128,dither:.2}).toFile(panel);if(!fs.existsSync(panel+'.meta')){const m=JSON.parse(fs.readFileSync('assets/remote-content/hidden-heroes/hero-parts.png.meta'));const old=m.uuid,id=crypto.randomUUID();fs.writeFileSync(panel+'.meta',JSON.stringify(JSON.parse(JSON.stringify(m).replaceAll(old,id).replaceAll('hero-parts','stage-jade')),null,2)+'\n');}
 const journey='assets/chronicle-ui/stage-journey.png';await sharp('art/runtime-stage-ui/journey-source.png').resize(600,400).png({compressionLevel:9}).toFile(journey);
 if(!fs.existsSync(journey+'.meta')){const m=JSON.parse(fs.readFileSync(panel+'.meta')),old=m.uuid,id=crypto.randomUUID();fs.writeFileSync(journey+'.meta',JSON.stringify(JSON.parse(JSON.stringify(m).replaceAll(old,id).replaceAll('stage-jade','stage-journey')),null,2)+'\n');}
 const gateSource='art/concepts/stage-switch-options/universal.png',gate='assets/chronicle-ui/stage-switch.png';
 await sharp(gateSource).trim({background:'#00000000',threshold:8}).resize(120,120,{fit:'contain',background:'#00000000'}).extend({top:4,bottom:4,left:4,right:4,background:'#00000000'}).png({compressionLevel:9}).toFile(gate);
 if(!fs.existsSync(gate+'.meta')){const m=JSON.parse(fs.readFileSync(panel+'.meta')),old=m.uuid,id=crypto.randomUUID();fs.writeFileSync(gate+'.meta',JSON.stringify(JSON.parse(JSON.stringify(m).replaceAll(old,id).replaceAll('stage-jade','stage-switch')),null,2)+'\n');}
 fs.writeFileSync('art/runtime-stage-ui/switch-icon-source.json',JSON.stringify({source:gateSource,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(gateSource)).digest('hex'),output:gate,outputSha256:crypto.createHash('sha256').update(fs.readFileSync(gate)).digest('hex'),size:[128,128],decodedBytes:128*128*4,processing:'trim transparent margin;120 square contain;4px transparent gutter;lossless PNG, no palette quantization',runtime:'one universal stage switch icon for all six stages, separate from parchment'},null,2)+'\n');
 const journeyRecord='art/runtime-stage-ui/journey-source.json';if(fs.existsSync(journeyRecord)){const record=JSON.parse(fs.readFileSync(journeyRecord));record.sourceSha256=crypto.createHash('sha256').update(fs.readFileSync('art/runtime-stage-ui/journey-source.png')).digest('hex');record.outputSha256=crypto.createHash('sha256').update(fs.readFileSync(journey)).digest('hex');fs.writeFileSync(journeyRecord,JSON.stringify(record,null,2)+'\n');}
 fs.writeFileSync('art/concepts/stage-challenge-v8/runtime-theme-source.json',JSON.stringify({thumbnailSource,thumbnailSourceSha256:crypto.createHash('sha256').update(fs.readFileSync(thumbnailSource)).digest('hex'),thumbnailCrops:crops,source,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),output:file,width:960,height:640,decodedBytes:960*640*4,description:'text-free battlefield atlas thumbs; original ground crops unchanged; runtime 3x2 cells 320 square: thumbnail top128, ground lower192'},null,2)+'\n');console.log(file,fs.statSync(file).size,'bytes');
})().catch(e=>{console.error(e);process.exitCode=1;});

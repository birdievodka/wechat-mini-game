// Pure lossless packing of the adopted 12-frame artwork. Never requantize it.
const fs=require('node:fs'),crypto=require('node:crypto'),zlib=require('node:zlib'),sharp=require('sharp');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{const entries=[];fs.mkdirSync('art/runtime-grunts',{recursive:true});for(const kind of ['sickle','hoe']){
 const original=`assets/battle/characters/soldier-${kind}-actions.png`,source=`art/runtime-grunts/${kind}.png`;
 if(!fs.existsSync(source))fs.copyFileSync(original,source);
 const input=fs.readFileSync(source),{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const palette=new Map();for(let i=0;i<data.length;i+=4){const rgb=data[i]*65536+data[i+1]*256+data[i+2];if(!palette.has(rgb))palette.set(rgb,palette.size);}
 if(palette.size>256)throw Error('Source has more than 256 RGB colors: '+kind);
 const n=info.width*info.height,planes=Buffer.alloc(n*2);let checksum=2166136261;
 for(let p=0;p<n;p++){const i=p*4;planes[p]=palette.get(data[i]*65536+data[i+1]*256+data[i+2]);planes[n+p]=data[i+3];for(let c=0;c<4;c++)checksum=Math.imul(checksum^data[i+c],16777619);}
 const header=Buffer.alloc(16+palette.size*3);header.write('TYI1');header.writeUInt16LE(info.width,4);header.writeUInt16LE(info.height,6);header.writeUInt16LE(palette.size,8);header.writeUInt32LE(checksum>>>0,12);
 for(const [rgb,index] of palette){header[16+index*3]=rgb>>>16;header[17+index*3]=rgb>>>8&255;header[18+index*3]=rgb&255;}
 const output=Buffer.concat([header,zlib.deflateSync(planes,{level:9})]),dest=`assets/battle/characters/soldier-${kind}-actions.bin`;fs.writeFileSync(dest,output);
 if(!fs.existsSync(dest+'.meta'))fs.writeFileSync(dest+'.meta',JSON.stringify({ver:'1.0.2',importer:'buffer',imported:true,uuid:crypto.randomUUID(),files:['.json','.bin'],subMetas:{},userData:{}},null,2)+'\n');
 entries.push({kind,source,sourceSha256:sha(input),dest,sha256:sha(output),width:info.width,height:info.height,columns:4,rows:3,frames:12,rgbaSha256:sha(data),sourceBytes:input.length,bytes:output.length,colors:palette.size});
 console.log(kind+': '+input.length+' -> '+output.length+' bytes (lossless RGBA)');
 }fs.writeFileSync('art/runtime-grunts/manifest.json',JSON.stringify({schema:1,codec:'TYI1 indexed RGB + exact alpha / zlib',entries},null,2)+'\n');})().catch(e=>{console.error(e);process.exitCode=1});

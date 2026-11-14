// Technical extraction/registration only. Artwork is generated with built-in image_gen;
// no soldiers, Bosses, weapons or game rules are rewritten by this packer.
const fs=require('node:fs'),crypto=require('node:crypto'),sharp=require('sharp');
const root='art/runtime-youth',ids=['liubei','guanyu','zhangfei','zhaoyun','kongming'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function pieces(file,columns,rows){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height,seen=new Uint8Array(w*h),q=new Uint32Array(w*h),groups=Array.from({length:columns*rows},()=>[]);
 for(let p=0;p<w*h;p++){
  if(seen[p]||data[p*4+3]<16)continue;let rd=0,wr=1,sx=0,sy=0;q[0]=p;seen[p]=1;
  while(rd<wr){const k=q[rd++],x=k%w,y=Math.floor(k/w);sx+=x;sy+=y;
   for(const n of [x>0?k-1:-1,x<w-1?k+1:-1,y>0?k-w:-1,y<h-1?k+w:-1])if(n>=0&&!seen[n]&&data[n*4+3]>=16){seen[n]=1;q[wr++]=n;}}
  if(wr<12)continue;const col=Math.min(columns-1,Math.floor(sx/wr/w*columns)),row=Math.min(rows-1,Math.floor(sy/wr/h*rows));
  groups[row*columns+col].push(...Array.from(q.subarray(0,wr)));
 }
 return groups.map((pixels,i)=>{
  if(pixels.length<500)throw Error(file+' empty sprite '+i);
  let x=w,y=h,r=0,b=0;for(const p of pixels){x=Math.min(x,p%w);y=Math.min(y,Math.floor(p/w));r=Math.max(r,p%w);b=Math.max(b,Math.floor(p/w));}
  const width=r-x+1,height=b-y+1,buffer=Buffer.alloc(width*height*4);
  for(const p of pixels)data.copy(buffer,((Math.floor(p/w)-y)*width+p%w-x)*4,p*4,p*4+4);
  return {buffer,width,height,source:[x,y,width,height]};
 });
}
async function saveRgba(file,buffer){
 // Quantize RGB only, retaining exact resized alpha and runtime RGBA format.
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const rgb=await sharp(await sharp(buffer).removeAlpha().png({palette:true,colours:256,dither:0,effort:10}).toBuffer()).removeAlpha().raw().toBuffer();
 let error=0,count=0;for(let i=0,j=0;i<data.length;i+=4,j+=3)for(let c=0;c<3;c++){if(data[i+3]>8){error+=(data[i+c]-rgb[j+c])**2;count++;}data[i+c]=data[i+3]===0?0:rgb[j+c];}
 if(Math.sqrt(error/count)>8)throw Error('RGB error '+file);
 const output=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png({compressionLevel:9}).toBuffer();
 fs.writeFileSync(file,output);return {file,width:info.width,height:info.height,bytes:output.length,sha256:sha(output)};
}
async function main(){
 const parts=await pieces(root+'/sources/parts.png',5,3),portraits=await pieces(root+'/sources/portraits.png',5,2),atlases={};
 async function atlas(name,file,columns,rows,cell,entries){
  const layers=[],cells=[];
  for(let i=0;i<entries.length;i++){
   const {part,limit=cell-16,paired}=entries[i];
   // Identical scale for both blink states. Source heads share the same silhouette;
   // fitting the pair to one size avoids breathing/shrinking on a blink.
   const scale=Math.min(limit/Math.max(part.width,paired?.width||0),limit/Math.max(part.height,paired?.height||0));
   const w=Math.round(part.width*scale),h=Math.round(part.height*scale),image=await sharp(part.buffer,{raw:{width:part.width,height:part.height,channels:4}}).resize(w,h).png().toBuffer();
   layers.push({input:image,left:i%columns*cell+Math.round((cell-w)/2),top:Math.floor(i/columns)*cell+Math.round((cell-h)/2)});
   cells.push({source:part.source,rect:[i%columns*cell,Math.floor(i/columns)*cell,cell,cell]});
  }
  const buffer=await sharp({create:{width:columns*cell,height:rows*cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png().toBuffer();
  atlases[name]={...await saveRgba(file,buffer),columns,rows,cell,cells};
 }
 const partEntries=which=>[0,1,2].flatMap(row=>which.map(col=>({part:parts[row*5+col],paired:row<2?parts[(1-row)*5+col]:undefined})));
 await atlas('three-hero-parts','assets/presentation/heroes.png',3,3,256,partEntries([0,1,2]));
 await atlas('hero-parts','assets/chronicle-ui/hero-parts.png',2,3,256,partEntries([3,4]));
 await atlas('three-hero-portraits','assets/results/portraits.png',3,2,384,[0,1].flatMap(row=>[0,1,2].map(col=>({part:portraits[row*5+col]}))));
 await atlas('hero-portraits','assets/chronicle-ui/hero-portraits.png',2,2,384,[0,1].flatMap(row=>[3,4].map(col=>({part:portraits[row*5+col]}))));
 await sharp(root+'/sources/poster.png').resize(1334,750).jpeg({quality:85,mozjpeg:true}).toFile('assets/campaign/poster.jpg');
 await sharp('art/branding/avatar-source.png').resize(512,512).png({compressionLevel:9}).toFile('art/branding/avatar.png');
 const sourceFiles=['parts','portraits','poster'].map(n=>root+'/sources/'+n+'.png').concat('art/branding/avatar-source.png');
 const manifest={version:'youth-heroes-v1',baseCommit:'a848884',ids,source:'built-in image_gen',sources:sourceFiles.map(file=>({file,sha256:sha(fs.readFileSync(file))})),atlases,
  poster:{file:'assets/campaign/poster.jpg',sha256:sha(fs.readFileSync('assets/campaign/poster.jpg')),width:1334,height:750,quality:85},
  avatar:{file:'art/branding/avatar.png',sha256:sha(fs.readFileSync('art/branding/avatar.png')),width:512,height:512}};
 fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 const legacyPath='art/runtime-v4/manifest.json',legacy=JSON.parse(fs.readFileSync(legacyPath));
 for(const name of ['hero-parts','hero-portraits'])legacy.atlases[name]={...atlases[name],source:root+'/sources/'+(name==='hero-parts'?'parts':'portraits')+'.png',supersededBy:root+'/manifest.json'};
 fs.writeFileSync(legacyPath,JSON.stringify(legacy,null,2)+'\n');
 for(const a of Object.values(atlases))console.log(a.file,a.width,a.height,(a.bytes/1024).toFixed(1)+' KiB');
}
main().catch(e=>{console.error(e);process.exitCode=1;});

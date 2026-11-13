// Deterministic extraction and registration of approved artwork, no new drawing.
const fs=require('node:fs'),crypto=require('node:crypto'),sharp=require('sharp');
const sources=['art/runtime-lvbu/source.png','art/runtime-lvbu/trot-source.png'],dest='assets/chronicle-units/lvbu-actions.png',cell=192;
async function extract(source,rows){
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info,n=w*h,seen=new Uint8Array(n),queue=new Uint32Array(n),components=[];
 for(let p=0;p<n;p++){
  if(seen[p]||data[p*4+3]<8)continue;let rd=0,wr=1;queue[0]=p;seen[p]=1;let x=w,y=h,r=0,b=0,sx=0,sy=0;
  while(rd<wr){const k=queue[rd++],xx=k%w,yy=Math.floor(k/w);x=Math.min(x,xx);y=Math.min(y,yy);r=Math.max(r,xx);b=Math.max(b,yy);sx+=xx;sy+=yy;
   for(const next of [xx>0?k-1:-1,xx<w-1?k+1:-1,yy>0?k-w:-1,yy<h-1?k+w:-1])if(next>=0&&!seen[next]&&data[next*4+3]>=8){seen[next]=1;queue[wr++]=next;}}
  if(wr<16)continue;const slot=Math.min(rows-1,Math.floor(sy/wr/h*rows))*4+Math.min(3,Math.floor(sx/wr/w*4));
  components.push({slot,x,y,r,b,pixels:queue.slice(0,wr)});
 }
 const sprites=[];
 for(let i=0;i<rows*4;i++){
  const all=components.filter(c=>c.slot===i),max=Math.max(...all.map(c=>c.pixels.length)),parts=all.filter(c=>c.pixels.length>=Math.max(64,max*.002));
  if(max<500)throw Error('Missing Lu Bu pose '+source+':'+i);
  const x=Math.min(...parts.map(c=>c.x)),y=Math.min(...parts.map(c=>c.y)),r=Math.max(...parts.map(c=>c.r)),b=Math.max(...parts.map(c=>c.b));
  const width=r-x+1,height=b-y+1,buf=Buffer.alloc(width*height*4);
  for(const c of parts)for(const p of c.pixels)data.copy(buf,((Math.floor(p/w)-y)*width+p%w-x)*4,p*4,p*4+4);
  let ax=0,ay=0,weight=0;for(let yy=0;yy<height*.58;yy++)for(let xx=0;xx<width;xx++){const a=buf[(yy*width+xx)*4+3]/255;ax+=xx*a;ay+=yy*a;weight+=a;}
  sprites.push({source,sourceRect:[x,y,width,height],width,height,buf,anchor:[ax/weight,ay/weight]});
 }
 return sprites;
}
(async()=>{
 const actions=await extract(sources[0],3),trot=await extract(sources[1],2),sprites=[...actions,...trot],placements=[];
 const scale=Math.min(...actions.map(a=>(cell-16)/Math.max(a.width,a.height)));
 for(const a of actions)placements.push({scale,left:(cell-a.width*scale)/2,top:cell-12-a.height*scale});
 for(let row=0;row<2;row++){
  const group=trot.slice(row*4,row*4+4),first=group[0];let s=scale*actions[row?6:0].height/first.height,poses;
  // One scale and one registered head/saddle anchor for an entire trot cycle.
  for(let attempt=0;attempt<40;attempt++){
   const anchorX=(cell-first.width*s)/2+first.anchor[0]*s,anchorY=cell-12-first.height*s+first.anchor[1]*s;
   poses=group.map(a=>({scale:s,left:anchorX-a.anchor[0]*s,top:anchorY-a.anchor[1]*s}));
   if(poses.every((p,i)=>p.left>=6&&p.top>=6&&p.left+group[i].width*s<=cell-6&&p.top+group[i].height*s<=cell-6))break;
   s*=.985;
  }placements.push(...poses);
 }
 const layers=[],cells=[];
 for(let i=0;i<20;i++){
  const a=sprites[i],p=placements[i],rw=Math.round(a.width*p.scale),rh=Math.round(a.height*p.scale),left=Math.round(p.left),top=Math.round(p.top);
  if(left<4||top<4||left+rw>cell-4||top+rh>cell-4)throw Error('Lu Bu registration clips '+i);
  const image=await sharp(a.buf,{raw:{width:a.width,height:a.height,channels:4}}).resize(rw,rh).png().toBuffer();
  layers.push({input:image,left:i%4*cell+left,top:Math.floor(i/4)*cell+top});
  cells.push({index:i,source:a.source,sourceRect:a.sourceRect,rect:[i%4*cell,Math.floor(i/4)*cell,cell,cell],content:[left,top,rw,rh],registration:i<12?'action foot baseline':'registered upper body',anchor:[left+a.anchor[0]*p.scale,top+a.anchor[1]*p.scale]});
 }
 await sharp({create:{width:4*cell,height:5*cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png({compressionLevel:9,palette:true,colours:128,dither:0}).toFile(dest);
 if(!fs.existsSync(dest+'.meta')){const meta=JSON.parse(fs.readFileSync('assets/presentation/icons.png.meta'));meta.uuid=crypto.randomUUID();meta.subMetas['6c48a'].uuid=meta.uuid+'@6c48a';meta.subMetas['6c48a'].displayName='lvbu-actions';meta.subMetas['6c48a'].userData.imageUuidOrDatabaseUri=meta.uuid;meta.userData.redirect=meta.uuid+'@6c48a';fs.writeFileSync(dest+'.meta',JSON.stringify(meta,null,2)+'\n');}
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 fs.writeFileSync('art/runtime-lvbu/manifest.json',JSON.stringify({sources:sources.map(path=>({path,sha256:hash(path)})),dest,sha256:hash(dest),width:4*cell,height:5*cell,cell,cells,bytes:fs.statSync(dest).size},null,2)+'\n');
 console.log('吕布动作图集',4*cell,5*cell,fs.statSync(dest).size,'bytes');
})().catch(e=>{console.error(e);process.exitCode=1;});

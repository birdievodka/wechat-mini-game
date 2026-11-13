// Cuts and registers the approved generated alpha artwork. No painted substitutions.
const fs=require('node:fs'),crypto=require('node:crypto'),sharp=require('sharp');
const root='art/runtime-bosses/',actors=['zhangjiao','dongzhuo','yuanshao','caocao','menghuo','simayi'],cell=160;
async function extract(source,cols,rows){
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),{width:w,height:h}=info,n=w*h,seen=new Uint8Array(n),queue=new Uint32Array(n),parts=[];
 for(let p=0;p<n;p++){if(seen[p]||data[p*4+3]<12)continue;let rd=0,wr=1;queue[0]=p;seen[p]=1;let x=w,y=h,r=0,b=0,sx=0,sy=0;
  while(rd<wr){const k=queue[rd++],xx=k%w,yy=Math.floor(k/w);x=Math.min(x,xx);y=Math.min(y,yy);r=Math.max(r,xx);b=Math.max(b,yy);sx+=xx;sy+=yy;
   for(const next of [xx>0?k-1:-1,xx<w-1?k+1:-1,yy>0?k-w:-1,yy<h-1?k+w:-1])if(next>=0&&!seen[next]&&data[next*4+3]>=12){seen[next]=1;queue[wr++]=next;}}
  if(wr<24)continue;const slot=Math.min(rows-1,Math.floor(sy/wr/h*rows))*cols+Math.min(cols-1,Math.floor(sx/wr/w*cols));parts.push({slot,x,y,r,b,pixels:queue.slice(0,wr)});
 }
 const sprites=[];for(let i=0;i<cols*rows;i++){const all=parts.filter(c=>c.slot===i),max=Math.max(...all.map(c=>c.pixels.length)),actor=actors.some(id=>source.endsWith('/'+id+'-source.png')),keep=all.filter(c=>c.pixels.length>=Math.max(64,max*(actor?.25:.002)));if(max<300)throw Error('Missing sprite '+source+':'+i);
  const x=Math.min(...keep.map(c=>c.x)),y=Math.min(...keep.map(c=>c.y)),r=Math.max(...keep.map(c=>c.r)),b=Math.max(...keep.map(c=>c.b)),width=r-x+1,height=b-y+1,buf=Buffer.alloc(width*height*4);
  for(const c of keep)for(const p of c.pixels)data.copy(buf,((Math.floor(p/w)-y)*width+p%w-x)*4,p*4,p*4+4);
  let ax=0,ay=0,weight=0;for(let yy=0;yy<height*.56;yy++)for(let xx=0;xx<width;xx++){const a=buf[(yy*width+xx)*4+3]/255;ax+=xx*a;ay+=yy*a;weight+=a;}
  sprites.push({source,sourceRect:[x,y,width,height],width,height,buf,anchor:[ax/weight,ay/weight]});
 }return sprites;
}
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function pack(name,sprites,cols,rows,groups=[],centered=false,actor=false){
 const placements=sprites.map(a=>{const scale=(cell-16)/Math.max(a.width,a.height);return {scale,left:(cell-a.width*scale)/2,top:centered?(cell-a.height*scale)/2:cell-8-a.height*scale};});
 if(!centered){const groupSize=name==='boss-beasts'?6:sprites.length;for(let start=0;start<sprites.length;start+=groupSize){const scale=Math.min(...placements.slice(start,start+groupSize).map(p=>p.scale));for(let i=start;i<start+groupSize;i++){const a=sprites[i];placements[i]={scale,left:(cell-a.width*scale)/2,top:cell-8-a.height*scale};}}}
 if(actor){const height=Math.min(...sprites.map((a,i)=>sprites[i<8?0:8].height*(cell-16)/Math.max(a.width,a.height)));sprites.forEach((a,i)=>{const scale=height/sprites[i<8?0:8].height;placements[i]={scale,left:(cell-a.width*scale)/2,top:cell-8-a.height*scale};});}
 for(const indices of groups){const group=indices.map(i=>sprites[i]),first=group[0];let scale=Math.min(...indices.map(i=>placements[i].scale));
  for(let k=0;k<60;k++){const ax=(cell-first.width*scale)/2+first.anchor[0]*scale,ay=cell-8-first.height*scale+first.anchor[1]*scale,ps=group.map(a=>({scale,left:ax-a.anchor[0]*scale,top:ay-a.anchor[1]*scale}));if(ps.every((p,j)=>p.left>=5&&p.top>=5&&p.left+group[j].width*scale<=cell-5&&p.top+group[j].height*scale<=cell-5)){indices.forEach((i,j)=>placements[i]=ps[j]);break;}scale*=.985;if(k===59)throw Error('Registration clips '+name);}
 }
 if(actor){const heights=[0,8].map(i=>sprites[i].height*placements[i].scale),target=Math.min(...heights);for(let side=0;side<2;side++){const ratio=target/heights[side];for(let i=side*8;i<side*8+8;i++){const p=placements[i];p.scale*=ratio;p.left=cell/2+(p.left-cell/2)*ratio;p.top=cell-8+(p.top-(cell-8))*ratio;}}}
 const layers=[],cells=[];for(let i=0;i<sprites.length;i++){const a=sprites[i],p=placements[i],w=Math.round(a.width*p.scale),h=Math.round(a.height*p.scale),left=Math.round(p.left),top=Math.round(p.top);if(left<4||top<4||left+w>cell-4||top+h>cell-4)throw Error('Clipped '+name+':'+i);
  layers.push({input:await sharp(a.buf,{raw:{width:a.width,height:a.height,channels:4}}).resize(w,h).png().toBuffer(),left:i%cols*cell+left,top:Math.floor(i/cols)*cell+top});
  cells.push({index:i,source:a.source,sourceRect:a.sourceRect,content:[left,top,w,h],anchor:[left+a.anchor[0]*p.scale,top+a.anchor[1]*p.scale]});
 }
 const dest='assets/chronicle-units/'+name+'.png';await sharp({create:{width:cols*cell,height:rows*cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png({compressionLevel:9,palette:true,colours:128,dither:0}).toFile(dest);
 if(!fs.existsSync(dest+'.meta')){const m=JSON.parse(fs.readFileSync('assets/chronicle-units/lvbu-actions.png.meta'));m.uuid=crypto.randomUUID();const sub=m.subMetas['6c48a'];sub.uuid=m.uuid+'@6c48a';sub.displayName=name;sub.userData.imageUuidOrDatabaseUri=m.uuid;m.userData.redirect=sub.uuid;fs.writeFileSync(dest+'.meta',JSON.stringify(m,null,2)+'\n');}
 return {dest,sha256:hash(dest),width:cols*cell,height:rows*cell,bytes:fs.statSync(dest).size,rgbaMiB:cols*rows*cell*cell*4/1048576,cells};
}
(async()=>{const atlases=[];for(const id of actors)atlases.push(await pack('boss-'+id+'-actions',await extract(root+id+'-source.png',4,4),4,4,[[0,1,2,3,4],[8,9,10,11,12]],false,true));
 const animals=await extract(root+'beasts-source.png',6,4);if(fs.existsSync(root+'rider-source.png'))animals.splice(18,6,...await extract(root+'rider-source.png',6,1));
 atlases.push(await pack('boss-beasts',animals,6,4,[[1,2,3,4],[7,8,9,10],[13,14,15,16],[19,20,21,22]]));atlases.push(await pack('boss-props',await extract(root+'props-source.png',4,4),4,4,[],true));
 const sources=[...new Set(atlases.flatMap(a=>a.cells.map(c=>c.source)))].map(path=>({path,sha256:hash(path)}));fs.writeFileSync(root+'manifest.json',JSON.stringify({cell,sources,atlases,bytes:atlases.reduce((n,a)=>n+a.bytes,0),rgbaMiB:atlases.reduce((n,a)=>n+a.rgbaMiB,0)},null,2)+'\n');console.log(atlases.map(a=>({dest:a.dest,bytes:a.bytes,rgbaMiB:a.rgbaMiB})));})().catch(e=>{console.error(e);process.exitCode=1;});

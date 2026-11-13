// Deterministic extraction/packing of the approved generated sprites. No new artwork is drawn here.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const source='art/runtime-v4/sources',manifest={source,atlases:{}};
const specs=[['hero-portraits',2,2,384,'chronicle-ui'],['hero-parts',2,3,256,'chronicle-ui'],['weapons',5,5,128,'chronicle-ui'],['skills',6,4,96,'chronicle-ui'],...['a','b'].flatMap(g=>['front','back'].map(v=>['troops-'+g+'-'+v,5,4,128,'chronicle-units']))];
const uuid=()=>crypto.randomUUID();
function imageMeta(dest){if(fs.existsSync(dest+'.meta'))return;const x=JSON.parse(fs.readFileSync('assets/presentation/icons.png.meta'));x.uuid=uuid();x.subMetas['6c48a'].uuid=x.uuid+'@6c48a';x.subMetas['6c48a'].displayName=path.basename(dest,'.png');x.subMetas['6c48a'].userData.imageUuidOrDatabaseUri=x.uuid;x.userData.redirect=x.uuid+'@6c48a';fs.writeFileSync(dest+'.meta',JSON.stringify(x,null,2)+'\n');}
(async()=>{for(const [name,cols,rows,cell,bundle] of specs){
 const dest='assets/'+bundle;fs.mkdirSync(dest,{recursive:true});if(!fs.existsSync(dest+'.meta')){const m=JSON.parse(fs.readFileSync('assets/presentation.meta'));m.uuid=uuid();m.userData.bundleName=bundle;fs.writeFileSync(dest+'.meta',JSON.stringify(m,null,2)+'\n');}
 const {data,info}=await sharp(source+'/'+name+'.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});const {width:w,height:h}=info,N=w*h,seen=new Uint8Array(N),queue=new Uint32Array(N),bounds=Array.from({length:cols*rows},()=>({x:w,y:h,r:0,b:0,pixels:0}));
 // Whole connected silhouettes may cross an approximate generated grid line. Assign each silhouette to its nearest slot.
 const components=[];for(let p=0;p<N;p++){if(seen[p]||data[p*4+3]<8)continue;let rd=0,wr=1;queue[0]=p;seen[p]=1;let x=w,y=h,r=0,b=0,sumX=0,sumY=0;
  while(rd<wr){const k=queue[rd++],xx=k%w,yy=Math.floor(k/w);x=Math.min(x,xx);y=Math.min(y,yy);r=Math.max(r,xx);b=Math.max(b,yy);sumX+=xx;sumY+=yy;
   for(const n of [xx>0?k-1:-1,xx<w-1?k+1:-1,yy>0?k-w:-1,yy<h-1?k+w:-1])if(n>=0&&!seen[n]&&data[n*4+3]>=8){seen[n]=1;queue[wr++]=n;}}
  if(wr<3)continue;const col=Math.min(cols-1,Math.floor(sumX/wr/w*cols)),row=Math.min(rows-1,Math.floor(sumY/wr/h*rows)),i=row*cols+col;components.push({i,pixels:Array.from(queue.subarray(0,wr))});const a=bounds[i];a.x=Math.min(a.x,x);a.y=Math.min(a.y,y);a.r=Math.max(a.r,r);a.b=Math.max(a.b,b);a.pixels+=wr;
 }
 const layers=[];const cells=[];
 for(let i=0;i<cols*rows;i++){const a=bounds[i];if(a.pixels<100)throw Error(name+' empty cell '+i);const bw=a.r-a.x+1,bh=a.b-a.y+1,buf=Buffer.alloc(bw*bh*4);
  for(const c of components)if(c.i===i)for(const p of c.pixels){const j=((Math.floor(p/w)-a.y)*bw+p%w-a.x)*4;data.copy(buf,j,p*4,p*4+4);}
  const sprite=await sharp(buf,{raw:{width:bw,height:bh,channels:4}}).resize(cell-12,cell-12,{fit:'inside'}).png().toBuffer();const m=await sharp(sprite).metadata(),left=i%cols*cell+Math.round((cell-m.width)/2),top=Math.floor(i/cols)*cell+Math.round((cell-m.height)/2);layers.push({input:sprite,left,top});cells.push({source:[a.x,a.y,bw,bh],rect:[i%cols*cell,Math.floor(i/cols)*cell,cell,cell]});
 }
 const file=dest+'/'+name+'.png';await sharp({create:{width:cols*cell,height:rows*cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png({compressionLevel:9}).toFile(file);imageMeta(file);manifest.atlases[name]={file,columns:cols,rows,cell,cells,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source+'/'+name+'.png')).digest('hex')};console.log(name,cols*cell,rows*cell,fs.statSync(file).size);
}fs.writeFileSync('art/runtime-v4/manifest.json',JSON.stringify(manifest,null,2)+'\n');})().catch(e=>{console.error(e);process.exitCode=1;});

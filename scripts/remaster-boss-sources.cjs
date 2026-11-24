// Offline tool. Use the upstream 20220424 macOS realesrgan-ncnn-vulkan release with its models directory.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto'),sharp=require('sharp');
const directory='art/runtime-boss-hd';
const masters=[...require('../art/runtime-bosses/manifest.json').sources,...require('../art/runtime-lvbu/manifest.json').sources];
const exe=process.env.REALESRGAN_BIN;
if(!exe)throw Error('Set REALESRGAN_BIN to the upstream binary beside models/');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 fs.mkdirSync(directory,{recursive:true});
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'taoyuan-boss-art-')),records=[];
 try{for(const original of masters){
  const source=original.path, input=fs.readFileSync(source);
  const sourceSha256=hash(input);
  const tag=source.split('/').slice(-2).join('-').replace(/\.png$/,'');
  const target=path.join(directory,tag+'.webp'),sr=path.join(temp,'result.png');
  cp.execFileSync(path.resolve(exe),['-i',path.resolve(source),'-o',sr,'-n','realesr-animevideov3','-s','2','-t','192'],{cwd:path.dirname(path.resolve(exe)),stdio:'ignore'});
  const data=await sharp(sr).webp({quality:98,alphaQuality:100,smartSubsample:true,effort:5}).toBuffer();
  fs.writeFileSync(target,data);
  records.push({source,sourceSha256,file:target,sha256:hash(data)});
  console.log(target,data.length);
 }}finally{fs.rmSync(temp,{recursive:true,force:true})}
 fs.writeFileSync(path.join(directory,'sources.json'),JSON.stringify({model:'realesr-animevideov3-x2',release:'20220424',scale:2,files:records},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1});

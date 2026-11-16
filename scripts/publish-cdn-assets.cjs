// Explicit publishing command; ordinary builds only prepare the immutable release.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
(async()=>{
 const config=JSON.parse(fs.readFileSync(path.join(ROOT,'config/cdn.json'))),m=JSON.parse(fs.readFileSync(path.join(ROOT,'cdn-assets/release.json'))),dir=path.join(ROOT,'cdn-assets/releases',m.version);
 const paths=m.files.map(x=>x.path);if(paths.some(x=>/\.(js|ts|map|meta)$/.test(x)||x.includes('..')))throw Error('Only reviewed static data can be published');
 const log=path.join(ROOT,'local/cdn-publish-'+m.version+'.json');fs.mkdirSync(path.dirname(log),{recursive:true});const fd=fs.openSync(log,'w');
 const result=cp.spawnSync('bytedcli',['--json','cdn','file','upload','--local-dir',dir,'--dir',config.directory+'/'+m.version],{stdio:['ignore',fd,'inherit'],env:process.env});fs.closeSync(fd);if(result.status!==0)throw Error('CDN upload failed; see '+log);
 const report=JSON.parse(fs.readFileSync(log));if(report.status!=='success')throw Error('CDN service rejected upload: '+JSON.stringify(report.error));
 const failed=[];let index=0;
 async function worker(){while(index<m.files.length){const file=m.files[index++];try{const r=await fetch(m.baseUrl+'/'+file.path,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);const b=Buffer.from(await r.arrayBuffer());if(b.length!==file.bytes||crypto.createHash('sha256').update(b).digest('hex')!==file.sha256)throw Error('hash mismatch');}catch(e){failed.push({path:file.path,error:String(e)});}}}
 await Promise.all(Array.from({length:4},worker));if(failed.length)throw Error('CDN verification failed: '+JSON.stringify(failed));
 const remote=await fetch(m.baseUrl+'/manifest.json');if(!remote.ok||(await remote.json()).version!==m.version)throw Error('Remote manifest mismatch');
 fs.writeFileSync(path.join(ROOT,'cdn-assets/published.json'),JSON.stringify({schema:1,version:m.version,baseUrl:m.baseUrl,files:m.files.length,totalBytes:m.totalBytes,verifiedSha256:true},null,2)+'\n');
 console.log(`Uploaded and SHA256 verified ${m.files.length} files (${(m.totalBytes/1048576).toFixed(2)} MiB): ${m.baseUrl}`);
})().catch(e=>{console.error(e);process.exitCode=1});

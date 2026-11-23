// Build-time export: data stays off the mini-game package; all scripts stay local.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function stageCdnAssets(buildRoot=path.join(ROOT,'build/wechatgame')){
 const config=JSON.parse(fs.readFileSync(path.join(ROOT,'config/cdn.json'))),settingsPath=path.join(buildRoot,'src/settings.json'),settings=JSON.parse(fs.readFileSync(settingsPath));
 const actual=settings.assets.remoteBundles||[];for(const name of config.remoteBundles)if(!actual.includes(name))throw Error('CDN bundle not marked remote by Creator: '+name);
 const src=path.join(buildRoot,'remote');if(!fs.existsSync(src))throw Error('Creator did not output remote/');
 const rows=files(src).filter(p=>!p.endsWith('.js')).map(p=>({path:'remote/'+path.relative(src,p).split(path.sep).join('/'),bytes:fs.statSync(p).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')})).sort((a,b)=>a.path.localeCompare(b.path));
 if(rows.some(x=>!/^remote\/[a-z0-9-]+\//.test(x.path)))throw Error('Unexpected remote path');
 const versionFor=list=>'v95-'+crypto.createHash('sha256').update(JSON.stringify(list)).digest('hex').slice(0,16);
 const releasePath=path.join(ROOT,'cdn-assets/release.json');
 const prior=JSON.parse(fs.readFileSync(releasePath)),published=JSON.parse(fs.readFileSync(path.join(ROOT,'cdn-assets/published.json')));
 const required=new Set(actual);
 const reusable=published.verifiedSha256 && prior.version===published.version && prior.version===versionFor(prior.files)
   && prior.baseUrl===published.baseUrl && prior.baseUrl===config.baseUrl+'/'+prior.version
   && JSON.stringify(prior.files.filter(f=>required.has(f.path.split('/')[1])))===JSON.stringify(rows);
 let manifest=prior;
 if(!reusable){
   const version=versionFor(rows),out=path.join(ROOT,'cdn-assets/releases',version);
   fs.mkdirSync(out,{recursive:true});for(const r of rows){const dest=path.join(out,r.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(src,r.path.slice(7)),dest);}
   const baseUrl=config.baseUrl+'/'+version;
   manifest={schema:1,version,baseUrl,requiredDownloadDomain:new URL(baseUrl).origin,bundles:actual,totalBytes:rows.reduce((n,r)=>n+r.bytes,0),files:rows};
   fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(releasePath,JSON.stringify(manifest,null,2)+'\n');
   const parent=path.dirname(out);for(const e of fs.readdirSync(parent))if(e!==version)fs.rmSync(path.join(parent,e),{recursive:true,force:true});
 }
 const {baseUrl,version}=manifest;
 settings.assets.server=baseUrl+'/';settings.assets.downloadMaxConcurrency=4;fs.writeFileSync(settingsPath,JSON.stringify(settings));
 // Mini-game bundle scripts are explicitly local under src/bundle-scripts.
 for(const name of actual){const js=path.join(buildRoot,'src/bundle-scripts',name,'index.js');if(!fs.existsSync(js))throw Error('Missing local script stub for '+name+': '+js);}
 fs.rmSync(src,{recursive:true,force:true});
 console.log(`CDN data exported: ${(manifest.totalBytes/1048576).toFixed(2)} MiB / ${rows.length} files / ${version}`);return manifest;
}
module.exports={stageCdnAssets};if(require.main===module)stageCdnAssets();

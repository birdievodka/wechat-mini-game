// Creator shares its Asset DB and editor state: never launch two project CLI builds together.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
function acquire(root,timeout=180000){
 const lock=path.join(root,'local','cocos-build.lock');fs.mkdirSync(path.dirname(lock),{recursive:true});const wait=new Int32Array(new SharedArrayBuffer(4)),start=Date.now();let announced=false;
 while(true){
  try{fs.mkdirSync(lock);fs.writeFileSync(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid}));break;}
  catch(error){if(error.code!=='EEXIST')throw error;let owner;try{owner=JSON.parse(fs.readFileSync(path.join(lock,'owner.json'))).pid;}catch(_){if(Date.now()-fs.statSync(lock).mtimeMs>2000){fs.rmSync(lock,{recursive:true,force:true});continue;}}
   if(owner){try{process.kill(owner,0);}catch(e){if(e.code==='ESRCH'){fs.rmSync(lock,{recursive:true,force:true});continue;}throw e;}}
   if(Date.now()-start>timeout)throw Error('Another Cocos build still owns '+lock);if(!announced){console.log('Waiting for the existing Cocos build…');announced=true;}Atomics.wait(wait,0,0,200);
  }
 }
 const release=()=>{try{if(JSON.parse(fs.readFileSync(path.join(lock,'owner.json'))).pid===process.pid)fs.rmSync(lock,{recursive:true,force:true});}catch(_){}};process.once('exit',release);
 try{
  // Also cover an older CLI build launched before this guard was installed.
  while(cp.execFileSync('ps',['-Ao','command'],{encoding:'utf8'}).split('\n').some(s=>s.includes('CocosCreator --project '+root+' --build'))){if(Date.now()-start>timeout)throw Error('Existing Creator CLI build did not finish');if(!announced){console.log('Waiting for the existing Creator CLI process…');announced=true;}Atomics.wait(wait,0,0,200);}
 }catch(error){release();throw error;}return release;
}
module.exports={acquire};

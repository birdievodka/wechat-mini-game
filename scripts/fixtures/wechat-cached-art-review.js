// Engineering-only visual pressure fixture for automation_evaluate. Never invoke during an active battle.
function renderPressureFixture(){
 const w=globalThis.__gameContextWindow,c=w.cc,g=c?.director.getScene()?.getChildByName('Game')?.components.find(x=>'buildVersion'in x);
 if(!g||!g.ready||['defeat','victory','menu'].indexOf(g.phase)<0)return {skipped:true,phase:g?.phase};
 if(g.battleSprites?.ready){const coin=g.battleSprites.cells.coin,shadow=g.battleSprites.cells['coin-shadow'];if(coin.width>32||coin.height>32||shadow.width>28||shadow.height>16)return {error:'cached coin alpha bounds invalid',coin:[coin.width,coin.height],shadow:[shadow.width,shadow.height]};}
 if(w.__taoyuanRenderFixture?.running)return {error:'already running'};
 const run=JSON.stringify(g.run),previous={update:g.update,screens:g.screens.root.active,battlefield:g.battlefield.active,world:g.world.active,fx:g.fx.node.active,ground:g.ground.node.active};
 const result=w.__taoyuanRenderFixture={running:true,version:g.buildVersion,frames:0,frameMs:[],draws:[],tris:[],bufferBytes:[],textureBytes:[]};
 let closed=false;function finish(reason){if(closed)return;closed=true;g.update=previous.update;g.clearBattle();g.screens.root.active=previous.screens;g.battlefield.active=previous.battlefield;g.world.active=previous.world;g.fx.node.active=previous.fx;g.ground.node.active=previous.ground;result.running=false;result.reason=reason;result.runUnchanged=JSON.stringify(g.run)===run;for(const key of ['frameMs','draws','tris','bufferBytes','textureBytes']){const a=result[key].sort((a,b)=>a-b);result[key]={median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a[a.length-1],samples:a.length};}}
 g.clearBattle();g.screens.root.active=false;g.battlefield.active=true;g.world.active=true;g.fx.node.active=true;g.ground.node.active=true;g.hero.active=true;
 for(let i=0;i<12;i++){const e=g.spawnNext('soldier','E01');e.x=(i%6-2.5)*180;e.y=130+Math.floor(i/6)*100;e.hp=e.maxHp=1e9;e.born=0;e.direction=i%4;e.node.setPosition(e.x,e.y);g.drawEnemy(e);}
 for(let i=0;i<12;i++)g.dropCoin((i-5.5)*75,-240);
 const ids=['sandal','peach','firecracker','smg','rocket','silver-spear','oil-jar','feather-fan'];for(let i=0;i<ids.length;i++){const x=(i%4-1.5)*210,y=-50-Math.floor(i/4)*120;g.launchProjectile(x,y,.6,{id:ids[i],tier:1,uid:i+1},{range:500,speed:600,damage:1,crit:0,critMultiplier:1,knockback:0,pierce:1,area:0},1);}
 for(let i=0;i<12;i++){const e=g.enemies[i];e.born=.45;e.bornTotal=.9;g.updateEnemy(e,0);}
 g.update=function(dt){try{
  result.frames++;const frame=result.frames;
  if(frame>60){const d=c.director.root.device;result.frameMs.push(dt*1000);result.draws.push(d.numDrawCalls);result.tris.push(d.numTris);result.bufferBytes.push(d.memoryStatus.bufferSize);result.textureBytes.push(d.memoryStatus.textureSize);}
  for(let i=0;i<g.enemies.length;i++){const e=g.enemies[i];e.moving=true;e.walk+=Math.min(dt,.05)*4;g.drawEnemy(e);g.updateEnemy(e,0);}
  if(frame%30===1){for(let i=0;i<280;i++){const p=g.combatFx.particles.slots[i];Object.assign(p,{x:(i%20-9.5)*52,y:(Math.floor(i/20)-6.5)*35,vx:Math.cos(i)*90,vy:Math.sin(i)*90,life:1,duration:1,size:5,angle:i,spin:1,gravity:-30,drag:1,tone:i%16,shape:['spark','petal','bean','dust','chip','star'][i%6],priority:2});}g.combatFx.burst('rocket',-160,0,90);g.combatFx.slash('halberd',160,0,.5,170,130);}
  g.combatFx.update(Math.min(dt,.05));g.updateEffects(Math.min(dt,.05));if(frame>=900)finish('complete');
 }catch(e){result.error=String(e);finish('error');}};
 setTimeout(()=>finish('watchdog'),18000);
 return {started:true,version:g.buildVersion,phase:g.phase,fixture:'12 units + 12 coins + 8 projectile silhouettes + 280 particles + birth effects; visual only'};
}

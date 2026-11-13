#!/usr/bin/env node
'use strict';
// Read-only adapter: inspect literals/AST and hashes, never execute game modules.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {createRequire}=require('node:module');

function options(argv){
 const o={skill:'G03',project:process.cwd()};
 for(let i=0;i<argv.length;i++){
  const a=argv[i];if(a==='--help'||a==='-h'){o.help=true;continue;}
  if(a!=='--project'&&a!=='--skill')throw Error('未知参数：'+a);
  const value=argv[++i];if(!value||value.startsWith('--'))throw Error('缺少参数值：'+a);
  o[a.slice(2)]=value;
 }return o;
}
function findRoot(start){
 let p=fs.realpathSync(path.resolve(start));
 if(!fs.statSync(p).isDirectory())throw Error('--project必须为目录');
 for(;;){if(fs.existsSync(path.join(p,'assets/scripts/GameBootstrap.ts')))return p;const up=path.dirname(p);if(up===p)throw Error('未找到桃园项目：请用--project指定包含assets/scripts/GameBootstrap.ts的仓库');p=up;}
}
function inspect(o){
 const root=findRoot(o.project),ts=createRequire(path.join(root,'package.json'))('typescript'),parsed=new Map();
 function source(relative){
  if(!parsed.has(relative)){
   const text=fs.readFileSync(path.join(root,relative),'utf8');
   parsed.set(relative,ts.createSourceFile(relative,text,ts.ScriptTarget.Latest,true));
  }return parsed.get(relative);
 }
 function literal(n){
  if(!n)throw Error('未找到字面量初始化值');
  if(ts.isParenthesizedExpression(n)||ts.isAsExpression(n)||ts.isTypeAssertionExpression(n)||ts.isSatisfiesExpression(n))return literal(n.expression);
  if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))return n.text;
  if(ts.isNumericLiteral(n))return Number(n.text);
  if(n.kind===ts.SyntaxKind.TrueKeyword)return true;
  if(n.kind===ts.SyntaxKind.FalseKeyword)return false;
  if(n.kind===ts.SyntaxKind.NullKeyword)return null;
  if(ts.isPrefixUnaryExpression(n)&&[ts.SyntaxKind.MinusToken,ts.SyntaxKind.PlusToken].includes(n.operator)){
   const value=literal(n.operand);if(typeof value!=='number')throw Error('一元运算不是数值');return n.operator===ts.SyntaxKind.MinusToken?-value:value;
  }
  if(ts.isArrayLiteralExpression(n))return n.elements.map(literal);
  if(ts.isObjectLiteralExpression(n))return Object.fromEntries(n.properties.map(p=>{
   if(!ts.isPropertyAssignment(p)||!(ts.isIdentifier(p.name)||ts.isStringLiteral(p.name)||ts.isNumericLiteral(p.name)))throw Error('对象出现计算属性/展开：请更新只读适配器');
   return [p.name.text,literal(p.initializer)];
  }));
  throw Error('不支持的静态表达式：'+n.getText().slice(0,120)+'；请读源码更新适配器，不执行模块绕过');
 }
 function named(relative,name){
  let init;function visit(n){if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.name.text===name)init=n.initializer;ts.forEachChild(n,visit);}visit(source(relative));
  if(!init)throw Error(relative+'中缺少'+name);return literal(init);
 }
 function threshold(relative,left){
  const values=new Set();function visit(n){
   if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.GreaterThanEqualsToken&&n.left.getText().replace(/\s/g,'')===left&&ts.isNumericLiteral(n.right))values.add(Number(n.right.text));
   ts.forEachChild(n,visit);
  }visit(source(relative));
  if(values.size!==1)throw Error(relative+'无法唯一识别'+left+'上限，请核对代码和适配器');return [...values][0];
 }
 const skills=named('assets/scripts/chronicles-data.ts','GENERIC_SKILLS');
 const skill=skills.find(s=>s.id===o.skill);if(!skill)throw Error('未知技能'+o.skill+'，当前ID：'+skills.map(s=>s.id).join(','));
 const routes=[
  ['assets/scripts/chronicles-data.ts','GENERIC_SKILLS'],
  ['assets/scripts/common-skills.ts','skillKillRequirement'],
  ['assets/scripts/CommonSkillRuntime.ts','private hit('],
  ['assets/scripts/CommonSkillRuntime.ts','cast(id:'],
  ['assets/scripts/CommonSkillRuntime.ts','update(dt:'],
  ['assets/scripts/CommonSkillEffects.ts','play(id:'],
  ['assets/scripts/CommonSkillEffects.ts','draw(ground:'],
  ['assets/scripts/GameBootstrap.ts','private initCommonSkill'],
  ['assets/scripts/GameBootstrap.ts','private castSkill'],
  ['assets/scripts/GameBootstrap.ts','private animateWalk'],
  ['assets/scripts/GameBootstrap.ts','private updateEffects'],
 ];
 const anchors=routes.map(([file,needle])=>{const lines=source(file).text.split('\n'),index=lines.findIndex(l=>l.includes(needle));return {file,line:index<0?null:index+1,search:needle};});
 const candidates=[...new Set(routes.map(r=>r[0])),
  'assets/scripts/combat-particles.ts','assets/scripts/combat-effects.ts','assets/scripts/sweep-effects.ts','assets/scripts/ParticleSprites.ts','assets/scripts/BattleSpriteAtlas.ts','assets/scripts/survival.ts',
  'scripts/test-common-skills.cjs','scripts/test-performance.cjs','scripts/fixtures/wechat-golden-sweep-review.js',
  'art/concepts/sweep-v5.1/01-golden-cleave.png','art/concepts/sweep-v5.1/prompts.json','docs/golden-sweep-v5.1.md','docs/golden-sweep-v5.1-validation.json',
 ];
 const files=candidates.filter(f=>fs.existsSync(path.join(root,f))).map(file=>{
  const bytes=fs.readFileSync(path.join(root,file));return {file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 });
 return {
  readOnly:true,project:root,parser:'TypeScript AST literals and guards; no game module execution',
  version:named('assets/scripts/survival.ts','SURVIVAL_VERSION'),skillCount:skills.length,selectedSkill:skill,
  budgets:{particlePool:named('assets/scripts/combat-particles.ts','FX_LIMITS'),skillVisuals:threshold('assets/scripts/CommonSkillEffects.ts','this.visuals.length'),skillTasks:threshold('assets/scripts/CommonSkillRuntime.ts','this.tasks.length')},
  anchors,files,
  notVerified:['Runtime命中时点和数值消费','实际绘制/加载是否接入','概念还原程度','微信或手机性能'],
 };
}
function main(){try{
 const o=options(process.argv.slice(2));if(o.help){console.log('用法：node inspect-taoyuan.cjs [--project /path/to/project] [--skill G03]\n只读输出技能定义、实际预算、集成位置和源码哈希，不构建、不启动游戏、不改存档。');return;}
 console.log(JSON.stringify(inspect(o),null,2));
}catch(e){console.error('inspect-taoyuan: '+e.message);process.exitCode=1;}}
module.exports={inspect,options};
if(require.main===module)main();

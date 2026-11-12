const ts = require('typescript');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const exported = new Set();
for (const name of fs.readdirSync(path.join(root, 'build/wechatgame/cocos-js'))) {
  if (!name.endsWith('.js')) continue;
  const ast = ts.createSourceFile(name, fs.readFileSync(path.join(root, 'build/wechatgame/cocos-js', name), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['t', '_export'].includes(node.expression.text)) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg) && node.arguments.length === 2) exported.add(arg.text);
      if (arg && ts.isObjectLiteralExpression(arg)) for (const p of arg.properties) if (p.name) exported.add(p.name.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
for (const file of fs.readdirSync(path.join(root, 'assets/scripts')).filter(f => f.endsWith('.ts'))) {
const ast = ts.createSourceFile(file, fs.readFileSync(path.join(root, 'assets/scripts', file), 'utf8'), ts.ScriptTarget.Latest, true);
const imports = ast.statements.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === 'cc').flatMap(n => n.importClause.namedBindings.elements).map(n => (n.propertyName || n.name).text).filter(n => n !== 'AssetManager');
for (const name of imports) assert.ok(exported.has(name), `裁剪后的引擎缺少运行时导出: ${name}`);
}
console.log('通过：全部脚本运行时依赖均包含于发布引擎');

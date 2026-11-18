/**
 * SeguroCRM - auditoria somente leitura de Contas a Pagar, Contas a Receber e Fluxo de Caixa.
 * Execute da raiz: node .\auditar-financeiro-complementar.cjs
 * Nao altera arquivos. Usa TypeScript ja instalado no projeto para resolver imports.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = process.cwd();
const toPosix = p => p.split(path.sep).join('/');
const relative = p => toPosix(path.relative(root, p));
const targetNames = ['contas-pagar', 'contas-receber', 'fluxo-caixa'];
const base = path.join(root, 'src', 'pages', 'whatsapp');
function fail(msg) { console.error('ERRO:', msg); process.exitCode = 1; }
if (!fs.existsSync(path.join(root, 'package.json'))) { fail('Execute da raiz do crmseguro (package.json ausente).'); return; }
const tsPath = path.join(root, 'node_modules', 'typescript');
let ts;
try { ts = require(tsPath); } catch { fail('TypeScript local nao encontrado. Execute npm install conforme seu projeto antes da auditoria.'); return; }
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules','.git','dist','build','.next'].includes(e.name)) walk(abs,out); }
    else if (e.isFile() && /\.(tsx?|jsx?)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) out.push(abs);
  }
  return out;
}
const modules = targetNames.map(name => ({name, dir:path.join(base,name)}));
for (const m of modules) if (!fs.existsSync(m.dir)) { fail(`Modulo nao encontrado: ${relative(m.dir)}`); return; }
const cfgPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
let compilerOptions = { allowJs: true, jsx: ts.JsxEmit.ReactJSX, moduleResolution: ts.ModuleResolutionKind.Bundler };
if (cfgPath) {
  const config = ts.readConfigFile(cfgPath, ts.sys.readFile);
  if (config.error) { fail(ts.flattenDiagnosticMessageText(config.error.messageText,'\n')); return; }
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(cfgPath));
  if (parsed.errors.length) console.warn('AVISO: tsconfig apresentou erros de leitura.');
  compilerOptions = {...compilerOptions,...parsed.options};
}
const allSrc = walk(path.join(root,'src'));
const targetFiles = new Set(modules.flatMap(m => walk(m.dir).map(p => path.normalize(p))));
const importEdges=[]; const unresolved=[];
function nameOf(file) { return modules.find(m => file === m.dir || file.startsWith(m.dir + path.sep))?.name || 'externo'; }
function imports(source) {
 const items=[];
 function add(node, text) { if (text && typeof text === 'string') items.push({at:node.getStart(source), value:text}); }
 function visit(node) {
   if ((ts.isImportDeclaration(node)||ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) add(node,node.moduleSpecifier.text);
   else if (ts.isCallExpression(node) && node.arguments.length && ts.isStringLiteralLike(node.arguments[0]) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text==='require'))) add(node,node.arguments[0].text);
   ts.forEachChild(node,visit);
 }
 visit(source);return items;
}
const host=ts.createCompilerHost(compilerOptions);
for (const file of allSrc) {
 const text=fs.readFileSync(file,'utf8');
 const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true, /\.(tsx|jsx)$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
 for (const item of imports(source)) {
   const resolved=ts.resolveModuleName(item.value,file,compilerOptions,host).resolvedModule?.resolvedFileName;
   const relevant=targetFiles.has(path.normalize(file)) || (resolved && targetFiles.has(path.normalize(resolved))) || targetNames.some(n => item.value.includes('/'+n+'/'));
   if (!relevant) continue;
   if (resolved) importEdges.push({from:relative(file),to:relative(resolved),fromModule:nameOf(file),toModule:nameOf(path.normalize(resolved)),specifier:item.value});
   else if (item.value.startsWith('.') || item.value.startsWith('@/')) unresolved.push({file:relative(file),specifier:item.value});
 }
}
console.log('\nAUDITORIA FINANCEIRA COMPLEMENTAR - SOMENTE LEITURA');
console.log('Branch:', (()=>{try{return cp.execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim()}catch{return '(indisponivel)'}})());
console.log('');
for (const m of modules) {
 const files=walk(m.dir);
 const counts={};
 for (const file of files) {
   const sub=path.relative(m.dir,file).split(path.sep);
   const category=sub.length===1 ? '(raiz)' : sub[0];
   counts[category]=(counts[category]||0)+1;
 }
 console.log(`MODULO ${m.name}: ${files.length} arquivos`);
 for(const [category,count] of Object.entries(counts).sort()) console.log(`  ${category}: ${count}`);
 const rootFiles=files.filter(f=>path.dirname(f)===m.dir).map(f=>path.basename(f));
 console.log('  Arquivos na raiz:',rootFiles.length ? rootFiles.join(', ') : '(nenhum)');
}
console.log('\nDependencias identificadas:',importEdges.length);
console.log('  entre modulos financeiros:',importEdges.filter(e=>e.fromModule!=='externo'&&e.toModule!=='externo'&&e.fromModule!==e.toModule).length);
console.log('  de fora para os 3 modulos:',importEdges.filter(e=>e.fromModule==='externo'&&e.toModule!=='externo').length);
console.log('  dos modulos para fora:',importEdges.filter(e=>e.fromModule!=='externo'&&e.toModule==='externo').length);
console.log('\nARQUIVOS EXTERNOS QUE IMPORTAM OS 3 MODULOS:');
const incoming=[...new Set(importEdges.filter(e=>e.fromModule==='externo'&&e.toModule!=='externo').map(e=>e.from))].sort();
console.log(incoming.length ? incoming.map(x=>'  '+x).join('\n') : '  (nenhum detectado)');
console.log('\nIMPORTS RELATIVOS NAO RESOLVIDOS:');
console.log(unresolved.length ? unresolved.map(x=>`  ${x.file}: ${x.specifier}`).join('\n') : '  Nenhum detectado.');
console.log('\nCONCLUSAO:');
console.log('  Auditoria concluida. Nenhum arquivo foi alterado.');
console.log('  Pastas pages/, components/, services/, hooks/, types/ ja existentes nao devem ser movidas sem necessidade.');
console.log('  Envie a saida completa para definirmos eventuais ajustes pontuais.');

/**
 * SeguroCRM - reorganizacao integral da raiz do modulo Equipe.
 * Previa: node .\migrar-equipe.cjs
 * Aplicar: node .\migrar-equipe.cjs --apply
 * Requer typescript instalado no projeto; nenhum pacote adicional.
 * Analisa todos os imports de src/ para identificar consumidores externos ao nucleo.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ts = require('typescript');
const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const BASE = path.join(SRC, 'pages', 'whatsapp', 'equipe');
const APPLY = process.argv.includes('--apply');
const MOVES = [
  ['Equipe.tsx', 'pages/Equipe.tsx'],
  ['NovoMembro.tsx', 'pages/NovoMembro.tsx'],
  ['ModalPermissoesUsuario.tsx', 'components/ModalPermissoesUsuario.tsx'],
];
const norm = p => path.normalize(p);
const moves = new Map(MOVES.map(([a,b]) => [norm(path.join(BASE,a)),norm(path.join(BASE,b))]));
const rel = p => path.relative(ROOT,p).split(path.sep).join('/');
const fail = m => { throw new Error(m); };
const existsFile = p => fs.existsSync(p) && fs.statSync(p).isFile();
const extensions = ['', '.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.css','.scss','.svg','.png','.jpg','.jpeg','.webp'];
function resolveRel(importer, spec) {
  const base = path.resolve(path.dirname(importer), spec);
  for (const ext of extensions) if (existsFile(base+ext)) return norm(base+ext);
  for (const ext of extensions.slice(1)) if (existsFile(path.join(base,'index'+ext))) return norm(path.join(base,'index'+ext));
  return null;
}
function rewriteSpecifier(sourceNew, targetNew, original, resolved) {
  let value = path.relative(path.dirname(sourceNew),targetNew).split(path.sep).join('/');
  if (!value.startsWith('.')) value = './'+value;
  const explicitExt = /\.(?:tsx?|jsx?|mjs|cjs|json|css|scss|svg|png|jpe?g|webp)$/i.test(original);
  if (!explicitExt) {
    value = value.replace(/\.(?:tsx?|jsx?|mjs|cjs)$/i,'');
    if (/[/\\]index\.(?:tsx?|jsx?|mjs|cjs)$/i.test(resolved) && !/\/index$/i.test(original)) value = value.replace(/\/index$/,'');
  }
  return value;
}
function walk(dir, result=[]) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir,entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules','dist','.git'].includes(entry.name)) walk(full,result);
    } else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) result.push(norm(full));
  }
  return result;
}
function literals(file, code) {
  const kind = /\.tsx$/.test(file) ? ts.ScriptKind.TSX : /\.jsx$/.test(file) ? ts.ScriptKind.JSX : ts.ScriptKind.TS;
  const ast = ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,kind);
  const out=[];
  function add(x) { if(x&&(ts.isStringLiteral(x)||ts.isNoSubstitutionTemplateLiteral(x)))out.push(x); }
  function visit(n){
    if(ts.isImportDeclaration(n)||ts.isExportDeclaration(n)) add(n.moduleSpecifier);
    if(ts.isCallExpression(n)&&n.arguments.length===1&&(n.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(n.expression)&&n.expression.text==='require')))add(n.arguments[0]);
    if(ts.isImportEqualsDeclaration(n)&&ts.isExternalModuleReference(n.moduleReference))add(n.moduleReference.expression);
    ts.forEachChild(n,visit);
  }
  visit(ast); return out;
}
function checkGit() {
  if(!existsFile(path.join(ROOT,'package.json')))fail('Execute na raiz do projeto SeguroCRM.');
  const branch=cp.execFileSync('git',['branch','--show-current'],{cwd:ROOT,encoding:'utf8'}).trim();
  if(branch!=='refactor/reorganizacao-estrutura')fail('Branch incorreta: '+branch);
  const dirty=cp.execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:ROOT,encoding:'utf8'}).trim();
  if(dirty)fail('Ha alteracoes rastreadas pendentes. Revise/commite antes de continuar:\n'+dirty);
  for(const [from,to] of moves){
    if(!existsFile(from))fail('Origem nao encontrada: '+rel(from));
    if(fs.existsSync(to))fail('Destino ja existe: '+rel(to));
  }
}
function prepare(){
  const updates=[];
  for(const file of walk(SRC)){
    const code=fs.readFileSync(file,'utf8');
    const newFile=moves.get(file)||file;
    const replacements=[];
    for(const node of literals(file,code)){
      const spec=node.text;
      if(!spec.startsWith('.'))continue;
      const target=resolveRel(file,spec);
      if(!target){
        if(moves.has(file))fail('Import relativo nao resolvido em arquivo movido: '+rel(file)+' -> '+spec);
        continue;
      }
      const newTarget=moves.get(target)||target;
      if(file===newFile&&target===newTarget)continue;
      const updated=rewriteSpecifier(newFile,newTarget,spec,target);
      if(updated!==spec)replacements.push({start:node.getStart()+1,end:node.getEnd()-1,old:spec,next:updated});
    }
    replacements.sort((a,b)=>b.start-a.start);
    let text=code;
    for(const r of replacements) text=text.slice(0,r.start)+r.next+text.slice(r.end);
    if(moves.has(file)||replacements.length)updates.push({file,newFile,text,replacements});
  }
  return updates;
}
function apply(updates){
  // Prepara um backup em memoria para restaurar arquivos alterados caso a gravacao falhe.
  const originals=new Map(updates.map(u=>[u.file,fs.readFileSync(u.file)]));
  const created=[];
  try{
    for(const u of updates.filter(x=>x.file!==x.newFile)){
      fs.mkdirSync(path.dirname(u.newFile),{recursive:true});
      fs.writeFileSync(u.newFile,u.text,'utf8');created.push(u.newFile);
    }
    for(const u of updates.filter(x=>x.file===x.newFile))fs.writeFileSync(u.file,u.text,'utf8');
    for(const u of updates.filter(x=>x.file!==x.newFile))fs.unlinkSync(u.file);
  }catch(err){
    for(const [file,buffer] of originals)fs.writeFileSync(file,buffer);
    for(const file of created)if(fs.existsSync(file))fs.unlinkSync(file);
    fail('Falha ao aplicar; arquivos restaurados: '+err.message);
  }
}
try{
  checkGit();
  const updates=prepare();
  console.log('\nMIGRACAO COMPLETA: EQUIPE ('+(APPLY?'APLICACAO':'PREVIA')+')');
  console.log('Branch: refactor/reorganizacao-estrutura');
  console.log('\nMovimentos:');
  for(const [from,to] of moves)console.log(' '+rel(from)+'\n   -> '+rel(to));
  const changes=updates.reduce((a,u)=>a+u.replacements.length,0);
  console.log('\nImports relativos ajustados: '+changes);
  console.log('Arquivos com alteracoes: '+updates.length);
  for(const u of updates.filter(u=>u.replacements.length)){
    console.log('\n'+rel(u.file)+(u.file!==u.newFile?' (movido)':''));
    for(const r of u.replacements)console.log('  '+r.old+' -> '+r.next);
  }
  if(!APPLY){ console.log('\nPREVIA CONCLUIDA. Nada foi alterado.\nPara aplicar: node .\\migrar-equipe.cjs --apply'); }
  else { apply(updates); console.log('\nSUCESSO. Execute npm run build e teste Equipe, Novo Membro e Permissoes no localhost.'); }
}catch(err){console.error('\nERRO: '+(err?.message||err));process.exitCode=1;}

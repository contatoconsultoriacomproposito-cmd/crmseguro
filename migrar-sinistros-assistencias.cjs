#!/usr/bin/env node
/**
 * SeguroCRM — reorganização estrutural Sinistros + Assistências.
 * Prévia por padrão; --apply executa. Usa parser do TypeScript instalado no projeto.
 * Não altera código de negócio e não executa Git/commit/push.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = process.cwd();
const srcRoot = path.join(root, 'src');
const cliApply = process.argv.includes('--apply');
const allowed = new Set(['--apply']);
if (process.argv.slice(2).some(x => !allowed.has(x))) throw new Error('Argumento desconhecido. Use sem opções ou --apply.');
let ts;
try { ts = require(path.join(root, 'node_modules', 'typescript')); }
catch { console.error('ERRO: TypeScript não encontrado em node_modules. Execute na raiz do SeguroCRM.'); process.exit(1); }
function abort(message) { console.error('\nBLOQUEADO: ' + message); process.exit(1); }
function norm(p) { return path.resolve(p).replace(/\\/g, '/'); }
function rel(p) { return path.relative(root, p).replace(/\\/g, '/'); }
function isWithin(file, dir) { return file === dir || file.startsWith(dir + '/'); }
function scan(directory) {
  if (!fs.existsSync(directory)) return [];
  let files = [];
  for (const e of fs.readdirSync(directory, {withFileTypes:true})) {
    if (e.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'coverage'].includes(e.name)) files.push(...scan(path.join(directory, e.name)));
    } else if (e.isFile() && /\.(?:ts|tsx|js|jsx|css|scss|json)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) files.push(norm(path.join(directory, e.name)));
  }
  return files;
}
function git(...args) {
  const r=cp.spawnSync('git', args, {cwd:root, encoding:'utf8'});
  if (r.status !== 0) abort('Git indisponível: ' + (r.stderr || r.stdout || '').trim());
  return r.stdout.trim();
}
const branch = git('branch','--show-current');
if (branch !== 'refactor/reorganizacao-estrutura') abort('Branch incorreta: ' + branch);
if (git('status','--porcelain','--untracked-files=no')) abort('Há alterações rastreadas pendentes. Faça commit/reverta antes.');
const base = norm(path.join(srcRoot, 'pages', 'whatsapp'));
const specs = [
  {key:'sinistros', pages:new Set(['SinistrosLista.tsx', 'SinistroDetalhes.tsx'])},
  {key:'assistencias', pages:new Set(['AssistenciasLista.tsx','AssistenciaDetalhes.tsx'])},
];
const move = new Map();
for(const spec of specs) {
  const from = norm(path.join(base,'pages',spec.key));
  const to = norm(path.join(base,spec.key));
  if(!fs.existsSync(from) || !fs.statSync(from).isDirectory()) abort('Pasta origem não encontrada: '+rel(from));
  if(fs.existsSync(to)) abort('Destino já existe: '+rel(to));
  const files = scan(from);
  if(!files.length) abort('Pasta vazia: '+rel(from));
  for(const file of files) {
    const sub = path.relative(from,file);
    const newFile = norm(path.join(to, spec.pages.has(sub.replace(/\\/g,'/')) ? 'pages' : '',sub));
    if(move.has(file) || fs.existsSync(newFile)) abort('Colisão de arquivo: '+rel(newFile));
    move.set(file,newFile);
  }
  for(const p of spec.pages) if(!move.has(norm(path.join(from,p)))) abort('Página esperada não encontrada: '+spec.key+'/'+p);
}
// Detecta novos arquivos ignorados ou não rastreados sob as pastas de origem.
const untracked = git('ls-files','--others','--exclude-standard','--', 'src/pages/whatsapp/pages/sinistros','src/pages/whatsapp/pages/assistencias');
if(untracked) abort('Há arquivos não rastreados nas pastas de origem:\n'+untracked);
const originals = scan(srcRoot);
const impacted = new Map();
const references = [];
const warnings = [];
const sourceCache = new Map();
for(const f of originals) sourceCache.set(f,fs.readFileSync(f,'utf8'));
const resolveFile = (importer, spec) => {
  const raw = norm(path.resolve(path.dirname(importer),spec));
  const candidates = [raw, raw+'.ts',raw+'.tsx',raw+'.js',raw+'.jsx',raw+'.json',raw+'.css',raw+'.scss',raw+'/index.ts',raw+'/index.tsx',raw+'/index.js',raw+'/index.jsx'];
  return candidates.find(x => fs.existsSync(x) && fs.statSync(x).isFile()) || null;
};
const pathToSpec = (from, target, originalSpec, resolved) => {
  const ext=path.extname(resolved);
  let specSuffix = '';
  // Preserva estilo da importação: sem extensão, com extensão, ou diretório index.
  if(originalSpec.endsWith(ext)) specSuffix=ext;
  let rawTarget=target;
  if(!specSuffix) {
    rawTarget=target.slice(0,-ext.length);
    if(/\/index$/.test(rawTarget) && !/\/index(?:\.[a-z]+)?$/.test(originalSpec)) rawTarget=rawTarget.slice(0,-6);
  }
  let r=path.relative(path.dirname(from),rawTarget).replace(/\\/g,'/');
  if(!r.startsWith('.')) r='./'+r;
  return r;
};
function collectRefs(ast, cb) {
  const visit=(node)=>{
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) cb(node.moduleSpecifier);
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) cb(node.moduleReference.expression);
    if(ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) {
      if(node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) cb(node.arguments[0]);
    }
    ts.forEachChild(node,visit);
  };
  visit(ast);
}
for(const oldFile of originals) {
  if(!/\.(?:ts|tsx|js|jsx)$/.test(oldFile)) continue;
  const data=sourceCache.get(oldFile);
  const kind=oldFile.endsWith('.tsx') || oldFile.endsWith('.jsx') ? ts.ScriptKind.TSX : oldFile.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const ast=ts.createSourceFile(oldFile,data,ts.ScriptTarget.Latest,true,kind);
  const futureImporter=move.get(oldFile) || oldFile;
  const edits=[];
  collectRefs(ast, lit => {
    const spec=lit.text;
    if(!spec.startsWith('.')) {
      if(spec.includes('pages/whatsapp/pages/sinistros') || spec.includes('pages/whatsapp/pages/assistencias')) warnings.push(rel(oldFile)+': alias possivelmente afetado: '+spec);
      return;
    }
    const oldResolved=resolveFile(oldFile,spec);
    if(!oldResolved) {
      if(move.has(oldFile)) warnings.push(rel(oldFile)+': import relativo não resolvido: '+spec);
      return;
    }
    const nextTarget=move.get(oldResolved) || oldResolved;
    if(futureImporter === oldFile && nextTarget === oldResolved) return;
    const nextSpec=pathToSpec(futureImporter,nextTarget,spec,oldResolved);
    if(nextSpec === spec) return;
    const pos=lit.getStart(ast)+1;
    edits.push({pos, end:lit.getEnd()-1, next:nextSpec});
    references.push({file:rel(oldFile), newFile:rel(futureImporter),before:spec,after:nextSpec});
  });
  let result=data;
  for(const e of edits.sort((a,b)=>b.pos-a.pos)) result=result.slice(0,e.pos)+e.next+result.slice(e.end);
  if(edits.length) impacted.set(oldFile,result);
}
// Conteúdo futuro para cada arquivo migrado, inclusive os que não têm mudanças internas.
const newFiles = new Map();
for(const [oldFile,newFile] of move) newFiles.set(newFile,impacted.get(oldFile) || sourceCache.get(oldFile));
const modifiedOutside = [...impacted.keys()].filter(f=>!move.has(f));
console.log('\nMIGRAÇÃO EM LOTE: SINISTROS + ASSISTÊNCIAS');
console.log('Branch: '+branch);
for(const s of specs) console.log('Módulo '+s.key+': '+[...move.keys()].filter(f=>isWithin(f,norm(path.join(base,'pages',s.key)))).length+' arquivos → '+rel(norm(path.join(base,s.key)))+'/');
console.log('Total de arquivos movidos: '+move.size);
console.log('Imports ajustados: '+references.length+' | Arquivos externos ao movimento ajustados: '+modifiedOutside.length);
console.log('\nPáginas reorganizadas:');
for(const [oldFile,newFile] of move) if(/\/pages\/(?:SinistrosLista|SinistroDetalhes|AssistenciasLista|AssistenciaDetalhes)\.tsx$/.test(newFile)) console.log('  '+rel(oldFile)+'\n    -> '+rel(newFile));
console.log('\nReferências corrigidas:');
for(const r of references) console.log('  '+r.file+'\n    '+r.before+' -> '+r.after);
if(warnings.length) { console.log('\nATENÇÃO:');for(const w of warnings) console.log('  '+w); }
// Interrompe se um import relativo de arquivo movido não puder ser resolvido: é possível que ele esteja quebrado antes da migração.
if(warnings.length) abort('Há referências que exigem inspeção manual. Nenhum arquivo foi movido.');
if(!cliApply) {
  console.log('\nPRÉVIA CONCLUÍDA. Nenhum arquivo alterado.');
  console.log('Para aplicar: node .\\migrar-sinistros-assistencias.cjs --apply');
  process.exit(0);
}
// Cópia/remoção de arquivos individuais evita renomear diretórios bloqueados pelo Windows.
const written = [];
const deleted = [];
const touchedOutside=[];
try {
  for(const [destination,content] of newFiles) {
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    if(fs.existsSync(destination)) throw new Error('Destino ocupado: '+rel(destination));
    fs.writeFileSync(destination,content,'utf8');
    written.push(destination);
  }
  for(const f of modifiedOutside) {
    fs.writeFileSync(f,impacted.get(f),'utf8');
    touchedOutside.push(f);
  }
  for(const f of move.keys()) {
    fs.unlinkSync(f);
    deleted.push(f);
  }
  // Remover apenas diretórios antigos vazios, de dentro para fora; erros de remoção de diretórios não invalidam arquivos migrados.
  const oldDirs=[...new Set([...move.keys()].map(f=>path.dirname(f)))].sort((a,b)=>b.length-a.length);
  for(const s of specs) oldDirs.push(norm(path.join(base,'pages',s.key)));
  for(const dir of oldDirs) { try {fs.rmdirSync(dir);}catch(e){if(e.code!=='ENOTEMPTY' && e.code!=='ENOENT') console.log('Aviso: diretório vazio não removido: '+rel(dir));} }
  console.log('\nSUCESSO: Sinistros e Assistências reorganizados; imports atualizados.');
  console.log('PRÓXIMO: npm run build e testes funcionais no localhost. Não faça commit/push ainda.');
} catch(e) {
  console.error('\nFALHA: '+e.message+'\nTentando restaurar arquivos originais...');
  let errors=[];
  for(const f of [...deleted, ...touchedOutside]) {try{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,sourceCache.get(f),'utf8');}catch(x){errors.push(rel(f)+': '+x.message);} }
  for(const f of written) {try{fs.unlinkSync(f);}catch(x){errors.push(rel(f)+': '+x.message);} }
  if(errors.length) console.error('Restauração incompleta: '+errors.join('; '));
  else console.log('Arquivos originais restaurados. Confira git status --short.');
  process.exit(1);
}

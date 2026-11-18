#!/usr/bin/env node
/**
 * SeguroCRM — migração estrutural Comissões + Financeiro.
 * Sem argumentos: prévia, somente leitura.  --apply: aplica movimentações.
 * Usa o compilador TypeScript já instalado no projeto para localizar imports.
 * NÃO altera regras de negócio, Supabase, SQL ou arquivos fora de src.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const src = path.join(root, 'src');
const apply = process.argv.includes('--apply');
const rel = p => path.relative(root, p).split(path.sep).join('/');
const fail = message => { console.error('\nBLOQUEADO: ' + message); process.exit(1); };
if (process.argv.some(a => a.startsWith('--') && a !== '--apply')) fail('Argumento desconhecido. Use somente --apply.');
if (!fs.existsSync(path.join(root, 'package.json')) || !fs.existsSync(src)) fail('Execute na raiz do projeto crmseguro.');
let ts;
try { ts = require(path.join(root, 'node_modules', 'typescript')); }
catch { fail('TypeScript não encontrado em node_modules. Instale as dependências do projeto primeiro.'); }
const moves = [
  ['src/pages/whatsapp/pages/comissoes', 'src/pages/whatsapp/comissoes'],
  ['src/pages/whatsapp/pages/financeiro', 'src/pages/whatsapp/financeiro'],
].map(([a,b]) => [path.join(root, a), path.join(root,b)]);
const isUnder = (file, dir) => file === dir || file.startsWith(dir + path.sep);
for (const [a,b] of moves) {
  if (!fs.existsSync(a) || !fs.statSync(a).isDirectory()) fail('Pasta de origem ausente: ' + rel(a));
  if (fs.existsSync(b)) fail('Pasta de destino já existe: ' + rel(b));
}
const git = (args) => cp.spawnSync('git', args, {cwd:root, encoding:'utf8', windowsHide:true});
const branch = git(['branch', '--show-current']);
if (branch.status !== 0 || branch.stdout.trim() !== 'refactor/reorganizacao-estrutura') fail('Entre na branch refactor/reorganizacao-estrutura. Branch atual: ' + branch.stdout.trim());
const modified = git(['status','--porcelain','--untracked-files=no']);
if (modified.status !== 0 || modified.stdout.trim()) fail('Há alterações rastreadas pendentes. Faça commit/restore antes.\n' + modified.stdout.trim());
function collect(directory) {
  let out=[];
  for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
    const full=path.join(directory,entry.name);
    if (entry.isSymbolicLink()) fail('Link simbólico não previsto: ' + rel(full));
    if (entry.isDirectory()) out.push(...collect(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}
const originalFiles = collect(src).filter(f => /\.(?:ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(f) && !/\.d\.(?:ts|mts|cts)$/.test(f));
const movedFiles = moves.flatMap(([a,b]) => collect(a).map(f=>[f,path.join(b,path.relative(a,f))]));
const moved = new Map(movedFiles);
const newPath = file => moved.get(file) || file;
const configFile = ['tsconfig.app.json','tsconfig.json'].map(n=>path.join(root,n)).find(fs.existsSync);
if (!configFile) fail('tsconfig não encontrado.');
const configRead=ts.readConfigFile(configFile, ts.sys.readFile);
if (configRead.error) fail('Falha ao ler '+rel(configFile));
const parsed=ts.parseJsonConfigFileContent(configRead.config, ts.sys, path.dirname(configFile));
if (parsed.errors.length) fail('Configuração TypeScript inválida.');
const options=parsed.options;
const edits = new Map();
const unresolved=[];
const manual=[];
let changedImports=0;
function relativeSpecifier(fromFile, targetFile, original) {
  let spec=path.relative(path.dirname(fromFile),targetFile).split(path.sep).join('/');
  if (!spec.startsWith('.')) spec='./'+spec;
  // Preservar a extensão explicitamente escrita, ou omitir a extensão TS como anteriormente.
  const suffix = original.match(/\.(ts|tsx|js|jsx|mjs|cjs|json)$/i);
  if (!suffix) spec=spec.replace(/\.(?:ts|tsx|mts|cts|jsx|js|mjs|cjs)$/i,'');
  else if (/\.(?:tsx?|mts|cts)$/i.test(spec) && /\.(?:js|jsx|mjs|cjs)$/i.test(suffix[0])) spec=spec.replace(/\.(?:tsx?|mts|cts)$/i,suffix[0]);
  return spec;
}
for (const file of originalFiles) {
  const original=fs.readFileSync(file,'utf8');
  const kind=/\.(?:tsx|jsx)$/.test(file)?ts.ScriptKind.TSX:ts.ScriptKind.TS;
  const ast=ts.createSourceFile(file,original,ts.ScriptTarget.Latest,true,kind);
  const substitutions=[];
  const importLiteralNodes=new Set();
  function check(lit) {
    if (!ts.isStringLiteralLike(lit)) return;
    importLiteralNodes.add(lit.pos);
    const spec=lit.text;
    const oldFrom=file;
    const nextFrom=newPath(file);
    if (!spec.startsWith('.')) {
      if (/pages\/whatsapp\/(pages\/)?(comissoes|financeiro)(\/|$)/.test(spec)) manual.push(rel(file)+' -> '+spec+' (alias/import absoluto)');
      return;
    }
    const resolved=ts.resolveModuleName(spec,oldFrom,options,ts.sys).resolvedModule?.resolvedFileName;
    let target=resolved ? path.resolve(resolved) : null;
    if (!target) {
      const abs=path.resolve(path.dirname(oldFrom),spec);
      if(fs.existsSync(abs) && fs.statSync(abs).isFile()) target=abs;
    }
    if (!target) {
      if (moved.has(file) || moves.some(([origin])=>isUnder(path.resolve(path.dirname(file),spec),origin))) unresolved.push(rel(file)+' -> '+spec);
      return;
    }
    const movedTarget=newPath(target);
    if (nextFrom === oldFrom && movedTarget === target) return;
    const nextSpec=relativeSpecifier(nextFrom,movedTarget,spec);
    if (nextSpec !== spec) {
      const start=lit.getStart(ast)+1, end=lit.getEnd()-1;
      substitutions.push({start,end,value:nextSpec,old:spec});
      changedImports++;
    }
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if(node.moduleSpecifier) check(node.moduleSpecifier);
    }
    if(ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression) check(node.moduleReference.expression);
    if(ts.isCallExpression(node) && node.arguments.length === 1 && (node.expression.kind===ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text==='require'))) check(node.arguments[0]);
    ts.forEachChild(node,visit);
  }
  visit(ast);
  // Caminhos escritos em strings comuns também podem representar referências manuais.
  if (/pages\/whatsapp\/pages\/(comissoes|financeiro)/.test(original)) {
    const anyLiteral = /['"`]([^'"`]*pages\/whatsapp\/pages\/(?:comissoes|financeiro)[^'"`]*)['"`]/g;
    for(const match of original.matchAll(anyLiteral)) {
      if(!substitutions.some(e=>e.old===match[1])) manual.push(rel(file)+' -> '+match[1]);
    }
  }
  if(substitutions.length) {
    substitutions.sort((a,b)=>b.start-a.start);
    let result=original;
    for(const e of substitutions) result=result.slice(0,e.start)+e.value+result.slice(e.end);
    edits.set(file,{original,result,substitutions});
  }
}
console.log('\nMIGRAÇÃO CONJUNTA: COMISSÕES + FINANCEIRO');
console.log('Branch: '+branch.stdout.trim());
for(const [from,to] of moves) console.log('Mover: '+rel(from)+'/\n  para: '+rel(to)+'/');
console.log('Arquivos a mover: '+movedFiles.length+' | imports a corrigir: '+changedImports+' | arquivos com ajustes: '+edits.size);
for(const [file,change] of [...edits].sort((a,b)=>a[0].localeCompare(b[0]))) {
  console.log('\n  '+rel(file)+(moved.has(file)?' (movido)':''));
  for(const e of change.substitutions) console.log('    '+e.old+' -> '+e.value);
}
if (unresolved.length || manual.length) {
  console.log('\nREFERÊNCIAS PARA REVISÃO:');
  for(const item of [...new Set([...unresolved,...manual])]) console.log('  '+item);
  fail('Corrija/avalie essas referências antes de executar --apply. Nenhum arquivo foi alterado.');
}
if (!apply) {
  console.log('\nPRÉVIA CONCLUÍDA. Nenhum arquivo alterado.');
  console.log('Para aplicar: node .\\migrar-comissoes-financeiro.cjs --apply');
  process.exit(0);
}
const originalBuffers=new Map();
for(const [old] of movedFiles) originalBuffers.set(old,fs.readFileSync(old));
for(const [file] of edits) if(!originalBuffers.has(file)) originalBuffers.set(file,fs.readFileSync(file));
const created=[];
try {
  // Copiar primeiro, atualizar imports e só depois excluir originais.
  for(const [old,destination] of movedFiles) {
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    if(fs.existsSync(destination)) throw new Error('Destino não está vazio: '+rel(destination));
    fs.writeFileSync(destination,edits.get(old)?.result ?? originalBuffers.get(old));
    created.push(destination);
  }
  for(const [file, change] of edits) if(!moved.has(file)) fs.writeFileSync(file,change.result);
  for(const [old] of movedFiles) fs.unlinkSync(old);
  // Remove apenas diretórios vazios da origem.
  function removeEmpty(dir) {
    if(!fs.existsSync(dir)) return;
    for(const e of fs.readdirSync(dir,{withFileTypes:true})) if(e.isDirectory()) removeEmpty(path.join(dir,e.name));
    if(!fs.readdirSync(dir).length) fs.rmdirSync(dir);
  }
  for(const [from] of moves) removeEmpty(from);
} catch (error) {
  console.error('\nFALHA, tentando restaurar:',error.message);
  let rollbackError=null;
  for(const [file,data] of originalBuffers) {
    try {fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);} catch(e){rollbackError=e;}
  }
  for(const dest of created) {try{fs.unlinkSync(dest);}catch(e){rollbackError=e;}}
  if(rollbackError) console.error('ATENÇÃO: restauração incompleta:',rollbackError.message);
  else console.log('Restauração concluída. Confira git status --short.');
  process.exit(1);
}
console.log('\nSUCESSO: Comissões e Financeiro reorganizados.');
console.log('Próximo: npm run build e testes funcionais no localhost.');
console.log('Não faça push; registre commit somente após homologação.');

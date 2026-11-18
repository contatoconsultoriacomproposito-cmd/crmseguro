#!/usr/bin/env node
/**
 * SeguroCRM — migração estrutural de Configurações da Corretora.
 * Prévia (somente leitura): node migrar-configuracoes.cjs
 * Aplicação:              node migrar-configuracoes.cjs --apply
 * Requer TypeScript já instalado no projeto. Não altera lógica de negócio.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ts = require('typescript');

const root = process.cwd();
const norm = p => path.resolve(p);
const slash = s => s.replace(/\\/g, '/');
const relative = p => slash(path.relative(root, p));
const base = norm(path.join(root, 'src/pages/whatsapp/configuracao-corretora'));
const filesToMove = new Map([
  ['ConfigCorretora.tsx', 'pages/ConfigCorretora.tsx'],
  ['ModalArmazenamento.tsx', 'components/ModalArmazenamento.tsx'],
  ['ModalConexoes.tsx', 'components/ModalConexoes.tsx'],
  ['ModalPlanos.tsx', 'components/ModalPlanos.tsx'],
  ['modalSite.tsx', 'components/modalSite.tsx'],
].map(([a,b]) => [norm(path.join(base,a)), norm(path.join(base,b))]));
const apply = process.argv.includes('--apply');
const allowed = new Set(['--apply']);
const args = process.argv.slice(2);
if (args.some(a => !allowed.has(a))) { console.error('Uso: node migrar-configuracoes.cjs [--apply]'); process.exit(1); }
const fail = m => { throw new Error(m); };

function walk(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'diagnosticos'].includes(e.name)) continue;
    const file = path.join(dir, e.name);
    if (e.isDirectory()) walk(file, result);
    else if (e.isFile() && /\.[cm]?[jt]sx?$/.test(e.name)) result.push(norm(file));
  }
  return result;
}
function git(cmd) { return cp.execFileSync('git', cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim(); }
function resolveFile(candidate) {
  for (const p of [candidate, ...['.ts','.tsx','.mts','.cts','.js','.jsx','.json','.css','.svg','.png','.jpg','.jpeg','.webp'].map(e => candidate + e), ...['index.ts','index.tsx','index.js','index.jsx'].map(e => path.join(candidate,e))]) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return norm(p);
  }
  return null;
}
function noExtension(p) { return p.replace(/\.(tsx?|jsx?|mts|cts)$/, ''); }
function updatedSpec(fromNew, targetNew, oldSpec) {
  let rel = slash(path.relative(path.dirname(fromNew), targetNew));
  if (!rel.startsWith('.')) rel = './' + rel;
  const oldExplicitExtension = /\.(tsx?|jsx?|mts|cts|json|css|svg|png|jpe?g|webp)$/.exec(oldSpec)?.[0] || '';
  if (!oldExplicitExtension) rel = noExtension(rel);
  else if (/\.(tsx?|jsx?|mts|cts)$/.test(oldExplicitExtension)) rel = noExtension(rel) + oldExplicitExtension;
  return rel;
}
function textEdit(text, edits) {
  return edits.slice().sort((a,b)=>b.start-a.start).reduce((s, e) => s.slice(0,e.start)+e.value+s.slice(e.end),text);
}
function getImports(node) {
  const found = [];
  const visit = n => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) found.push(n.moduleSpecifier);
    if (ts.isCallExpression(n) && n.arguments.length === 1 && ts.isStringLiteral(n.arguments[0]) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require'))) found.push(n.arguments[0]);
    // TypeScript import type: import('./module').T
    if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) found.push(n.argument.literal);
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}
function main() {
  if (!fs.existsSync(path.join(root,'package.json')) || !fs.existsSync(path.join(root,'src/pages/whatsapp'))) fail('Execute na raiz do projeto crmseguro.');
  const branch = git(['branch','--show-current']);
  if (branch === 'main' || branch === 'master' || !branch) fail('Proteção: entre na branch de reorganização antes de continuar.');
  const dirty = git(['status','--porcelain','--untracked-files=no']);
  if (dirty) fail('Existem alterações rastreadas ainda não commitadas. Faça commit/reverta antes de continuar:\n'+dirty);
  for (const [a,b] of filesToMove) {
    if (!fs.existsSync(a)) fail('Arquivo de origem não existe: '+relative(a));
    if (fs.existsSync(b)) fail('Destino já existe, interrompendo: '+relative(b));
  }
  const configFile = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  let opts = { moduleResolution: ts.ModuleResolutionKind.Bundler, allowJs: true, jsx: ts.JsxEmit.ReactJSX };
  if (configFile) {
    const read = ts.readConfigFile(configFile, ts.sys.readFile);
    if (!read.error) {
      const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(configFile));
      opts = {...opts, ...parsed.options};
    }
  }
  // Escopo de escrita: novo núcleo e pontos de entrada conhecidos.
  const fileSet = new Set(walk(path.join(root,'src/pages/whatsapp')));
  for (const entry of ['src/App.tsx','src/main.tsx','src/components/Sidebar.tsx','src/components/Sidebar/index.tsx']) {
    const abs = norm(path.join(root,entry)); if (fs.existsSync(abs)) fileSet.add(abs);
  }
  const plan = [];
  let importChanges = 0;
  const warnings = [];
  for (const src of [...fileSet].sort()) {
    const old = fs.readFileSync(src,'utf8');
    const ast = ts.createSourceFile(src,old,ts.ScriptTarget.Latest,true,src.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    const targetSrc = filesToMove.get(src) || src;
    const edits = [];
    for (const str of getImports(ast)) {
      const original = str.text;
      if (!original.startsWith('.')) continue;
      let resolved = ts.resolveModuleName(original,src,opts,ts.sys).resolvedModule?.resolvedFileName;
      resolved = resolved ? norm(resolved) : resolveFile(path.resolve(path.dirname(src),original));
      if (!resolved) {
        if (filesToMove.has(src)) warnings.push('Import relativo não resolvido dentro de arquivo movido: '+relative(src)+' -> '+original);
        continue;
      }
      const targetDependency = filesToMove.get(resolved) || resolved;
      if (targetSrc === src && targetDependency === resolved) continue;
      const replacement = updatedSpec(targetSrc,targetDependency,original);
      if (replacement === original) continue;
      // getStart/getEnd includes quotes. Replace only content.
      edits.push({ start: str.getStart(ast)+1, end: str.getEnd()-1, value: replacement, before: original });
    }
    const changed = textEdit(old,edits);
    if (changed !== old || targetSrc !== src) {
      plan.push({ from: src, to: targetSrc, original: old, content: changed, edits });
      importChanges += edits.length;
    }
  }
  if (warnings.length) fail('Pré-validação interrompida. Verifique:\n'+warnings.join('\n'));
  const recorded = new Set(plan.filter(p=>p.from!==p.to).map(p=>p.from));
  for (const src of filesToMove.keys()) if (!recorded.has(src)) fail('Arquivo não entrou no plano: '+relative(src));
  console.log('\nMIGRAÇÃO: CONFIGURAÇÕES DA CORRETORA');
  console.log('Branch: '+branch);
  console.log('\nMovimentações:');
  for (const [a,b] of filesToMove) console.log('  '+relative(a)+'\n    -> '+relative(b));
  console.log('\nImports corrigidos: '+importChanges);
  console.log('Arquivos com conteúdo/imports ajustados: '+plan.filter(p=>p.content!==p.original).length);
  for (const p of plan.filter(p=>p.edits.length)) {
    console.log('\n  '+relative(p.from)+(p.from!==p.to?' (movido)':''));
    for (const e of p.edits) console.log('    '+e.before+' -> '+e.value);
  }
  console.log('\nOBS: o script ajusta imports relativos estáticos, reexports, import() e require() dentro do núcleo e pontos de entrada conhecidos. Não reescreve aliases nem caminhos em strings arbitrárias.');
  if (!apply) { console.log('\nPRÉVIA CONCLUÍDA. Nenhum arquivo alterado.\nPara aplicar: node .\\migrar-configuracoes.cjs --apply'); return; }
  // Prepara conteúdo completamente antes de tocar no disco.
  const backup = new Map(plan.map(p=>[p.from,p.original]));
  const destinations = [];
  try {
    for (const p of plan) {
      fs.mkdirSync(path.dirname(p.to),{recursive:true});
      fs.writeFileSync(p.to,p.content,'utf8');
      if (p.to!==p.from) destinations.push(p.to);
    }
    for (const p of plan) if (p.to!==p.from) fs.unlinkSync(p.from);
  } catch (err) {
    for (const [file,content] of backup) { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,content,'utf8'); }
    for (const p of destinations) if (!backup.has(p) && fs.existsSync(p)) fs.unlinkSync(p);
    throw err;
  }
  console.log('\nSUCESSO: arquivos movidos e imports relativos atualizados.');
  console.log('Próximos comandos: npm run build; git status --short');
  console.log('Depois, teste Gestão > Configurações no localhost antes de commitar.');
}
try { main(); } catch (err) { console.error('\nERRO: '+(err && err.message || err)); process.exitCode = 1; }

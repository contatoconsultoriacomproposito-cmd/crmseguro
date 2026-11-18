/**
 * SeguroCRM — migração controlada de Tarefas.tsx para tarefas/pages/
 * Execute da raiz: node .\migrar-tarefas.cjs [--apply]
 * Usa o parser TypeScript já instalado no projeto. Não instala dependências.
 * Prévia sem alteração por padrão; modifica somente imports e o arquivo movido.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ts = require('typescript');
const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const FROM = path.join(SRC, 'pages', 'whatsapp', 'tarefas', 'Tarefas.tsx');
const TO = path.join(SRC, 'pages', 'whatsapp', 'tarefas', 'pages', 'Tarefas.tsx');
const APPLY = process.argv.includes('--apply');
const rel = p => path.relative(ROOT, p).replaceAll(path.sep, '/');
const fail = msg => { console.error('\nERRO: ' + msg); process.exit(1); };
const exists = p => fs.existsSync(p) && fs.statSync(p).isFile();
const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.scss', '.svg', '.png', '.jpg', '.jpeg', '.webp'];
function resolveRelative(importer, spec) {
  const base = path.resolve(path.dirname(importer), spec);
  for (const x of extensions) if (exists(base + x)) return base + x;
  for (const x of extensions.slice(1)) if (exists(path.join(base, 'index' + x))) return path.join(base, 'index' + x);
  return null;
}
function makeSpec(importer, target, original) {
  let desired = path.relative(path.dirname(importer), target).replaceAll(path.sep, '/');
  if (!desired.startsWith('.')) desired = './' + desired;
  const hasExtension = /\.(?:tsx?|jsx?|mjs|cjs|json|css|scss|svg|png|jpe?g|webp)$/i.test(original);
  if (!hasExtension) {
    desired = desired.replace(/\.(?:tsx?|jsx?|mjs|cjs)$/i, '');
    if (/\/index\.(?:tsx?|jsx?|mjs|cjs)$/i.test(target) && !/\/(?:index)$/i.test(original)) desired = desired.replace(/\/index$/, '');
  }
  return desired;
}
function walk(dir, list=[]) {
  if (!fs.existsSync(dir)) return list;
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!['node_modules', 'dist', '.git'].includes(entry.name)) walk(full, list); }
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) list.push(full);
  }
  return list;
}
function literals(file, source) {
  const kind = /\.tsx$/.test(file) ? ts.ScriptKind.TSX : /\.jsx$/.test(file) ? ts.ScriptKind.JSX : ts.ScriptKind.TS;
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const output = [];
  function add(n) { if (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))) output.push(n); }
  function visit(n) {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) add(n.moduleSpecifier);
    if (ts.isCallExpression(n) && n.arguments.length === 1 && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require'))) add(n.arguments[0]);
    // TS import x = require('...')
    if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)) add(n.moduleReference.expression);
    ts.forEachChild(n, visit);
  }
  visit(ast);
  return output;
}
function rewrite(file, originalText) {
  const newFile = file === FROM ? TO : file;
  let text = originalText;
  const replacements = [];
  for (const node of literals(file, originalText)) {
    const spec = node.text;
    if (!spec.startsWith('.')) continue;
    const resolved = resolveRelative(file, spec);
    if (!resolved) {
      // Relative imports may be compiled assets not represented by filesystem; report instead of silently changing.
      if (file === FROM) fail('Import relativo não resolvido no arquivo movido: ' + spec);
      continue;
    }
    const newTarget = resolved === FROM ? TO : resolved;
    if (file !== FROM && newTarget === resolved) continue;
    const next = makeSpec(newFile, newTarget, spec);
    if (next !== spec) replacements.push({start: node.getStart() + 1, end: node.getEnd() - 1, old: spec, next});
  }
  replacements.sort((a,b) => b.start - a.start);
  for (const r of replacements) text = text.slice(0,r.start) + r.next + text.slice(r.end);
  return {text, replacements};
}
function main() {
  console.log('\nMIGRAÇÃO: TAREFAS — ' + (APPLY ? 'APLICAÇÃO' : 'PRÉVIA'));
  if (!exists(FROM)) fail('Origem não encontrada: ' + rel(FROM));
  if (fs.existsSync(TO)) fail('Destino já existe: ' + rel(TO));
  if (!exists(path.join(ROOT, 'package.json'))) fail('Execute da raiz do projeto.');
  const branch = cp.execFileSync('git', ['branch', '--show-current'], {cwd: ROOT, encoding:'utf8'}).trim();
  if (branch !== 'refactor/reorganizacao-estrutura') fail('Branch incorreta: ' + branch);
  const dirty = cp.execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {cwd: ROOT, encoding:'utf8'}).trim();
  if (dirty) fail('Há alterações rastreadas pendentes. Faça commit ou revise antes de migrar:\n' + dirty);
  const updates = [];
  for (const file of walk(SRC)) {
    const original = fs.readFileSync(file, 'utf8');
    const result = rewrite(file, original);
    if (file === FROM || result.replacements.length) updates.push({file, ...result});
  }
  const refs = updates.reduce((n,item) => n + item.replacements.length, 0);
  console.log('Mover: ' + rel(FROM));
  console.log('  para: ' + rel(TO));
  console.log('Imports relativos ajustados: ' + refs);
  for (const u of updates) if (u.replacements.length) {
    console.log('\n' + rel(u.file) + (u.file === FROM ? ' (movido)' : ''));
    for (const r of u.replacements) console.log('  ' + r.old + ' -> ' + r.next);
  }
  if (!APPLY) {
    console.log('\nPRÉVIA CONCLUÍDA. Nenhum arquivo alterado.');
    console.log('Para aplicar: node .\\migrar-tarefas.cjs --apply');
    return;
  }
  // Revalidar o alvo antes de escrever; se falhar, Git permite restauração sem alterar a main.
  fs.mkdirSync(path.dirname(TO), {recursive:true});
  // Primeiro o novo arquivo, em seguida referências; somente após êxito remover a origem.
  const moved = updates.find(u => u.file === FROM);
  fs.writeFileSync(TO, moved.text, 'utf8');
  for (const u of updates.filter(u => u.file !== FROM)) fs.writeFileSync(u.file, u.text, 'utf8');
  fs.unlinkSync(FROM);
  console.log('\nSUCESSO: Tarefas.tsx movido e imports ajustados.');
  console.log('Execute: npm run build');
  console.log('Teste a página Tarefas no localhost antes do commit.');
}
try { main(); } catch(e) { fail(e?.message || String(e)); }

/**
 * SeguroCRM — migração da pasta intermediária whatsapp/pages.
 * Uso: node migrar-pages-legado.cjs          (prévia)
 *      node migrar-pages-legado.cjs --apply  (aplica)
 * Requer TypeScript instalado no projeto; não instala pacotes.
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ts = require('typescript');
const root = process.cwd();
const SRC = path.join(root, 'src');
const BASE = path.join(SRC, 'pages', 'whatsapp');
const PAGES = path.join(BASE, 'pages');
const apply = process.argv.includes('--apply');
const slash = p => p.replace(/\\/g, '/');
const rel = p => slash(path.relative(root, p));
const exists = p => fs.existsSync(p);
const isFile = p => exists(p) && fs.statSync(p).isFile();
const sourceExt = /\.(tsx?|jsx?|mts|cts)$/i;
const fileMoves = new Map();
const directoryMoves = [
  ['pages/agenda', 'agenda'],
  ['pages/seguradoras', 'seguradoras'],
];
const standaloneMoves = [
  ['pages/WhatsAppAutomacoes.tsx', 'automation/pages/WhatsAppAutomacoes.tsx'],
  ['pages/WhatsAppContatos.tsx', 'contatos/pages/WhatsAppContatos.tsx'],
  ['pages/WhatsAppInbox.tsx', 'conversas/pages/WhatsAppInbox.tsx'],
  ['pages/WhatsAppKanban.tsx', 'kanban/pages/WhatsAppKanban.tsx'],
];
function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}
function fail(msg) { throw new Error(msg); }
function addMove(from, to) {
  if (!isFile(from)) fail('Arquivo de origem ausente: ' + rel(from));
  if (exists(to)) fail('Destino já existe: ' + rel(to));
  fileMoves.set(path.resolve(from), path.resolve(to));
}
try {
  if (!exists(PAGES)) fail('Pasta original não encontrada: ' + rel(PAGES));
  const branch = cp.execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
  if (branch !== 'refactor/reorganizacao-estrutura') fail('Branch incorreta: ' + branch);
  const changedTracked = cp.execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' }).trim();
  if (changedTracked) fail('Existem alterações rastreadas pendentes. Faça commit ou restaure antes.\n' + changedTracked);

  for (const [fromDir, toDir] of directoryMoves) {
    const source = path.join(BASE, fromDir);
    const dest = path.join(BASE, toDir);
    if (!exists(source)) fail('Pasta de origem ausente: ' + rel(source));
    if (exists(dest)) fail('Destino já existe: ' + rel(dest));
    for (const f of walk(source)) addMove(f, path.join(dest, path.relative(source, f)));
  }
  for (const [from, to] of standaloneMoves) addMove(path.join(BASE, from), path.join(BASE, to));
  const allowed = [...fileMoves.keys()];
  const remaining = walk(PAGES).filter(f => !fileMoves.has(path.resolve(f)));
  if (remaining.length) fail('Arquivos não previstos em whatsapp/pages — migração bloqueada:\n' + remaining.map(rel).join('\n'));

  // Read imports from every TS/TSX/JS/JSX file under src. Include CSS/assets used by moved sources.
  const sources = walk(SRC).filter(f => sourceExt.test(f));
  const rewrites = new Map();
  const touched = [];
  const unresolvedMoved = [];
  const changedRefs = [];
  function resolveRelative(originFile, spec) {
    const target = path.resolve(path.dirname(originFile), spec);
    const choices = [target, ...['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.json', '.css', '.scss', '.svg', '.png', '.jpg', '.webp'].map(ext => target + ext),
      ...['index.ts', 'index.tsx', 'index.js', 'index.jsx'].map(f => path.join(target, f))];
    return choices.find(isFile) || null;
  }
  function rewriteSpecifier(oldFile, newFile, literal) {
    if (!literal.startsWith('.')) return literal;
    const raw = literal.match(/^([^?#]*)([?#].*)?$/);
    const spec = raw[1], suffix = raw[2] || '';
    const target = resolveRelative(oldFile, spec);
    if (!target) {
      if (oldFile !== newFile) unresolvedMoved.push(`${rel(oldFile)}: ${literal}`);
      return literal;
    }
    const finalTarget = fileMoves.get(path.resolve(target)) || target;
    if (oldFile === newFile && path.resolve(finalTarget) === path.resolve(target)) return literal;
    // Keep original extension behavior and index/directory imports when possible.
    const explicitExtension = path.extname(spec);
    const resolvedAsIndex = path.basename(target).startsWith('index.') && !path.extname(spec);
    let resultingTarget = finalTarget;
    if (resolvedAsIndex) resultingTarget = path.dirname(finalTarget);
    else if (!explicitExtension) resultingTarget = finalTarget.slice(0, -path.extname(finalTarget).length);
    let next = slash(path.relative(path.dirname(newFile), resultingTarget));
    if (!next.startsWith('.')) next = './' + next;
    return next + suffix;
  }
  function findSpecifiers(file, content) {
    const sf = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const result = [];
    const add = node => {
      if (node && ts.isStringLiteralLike(node)) result.push({start: node.getStart(sf) + 1, end: node.getEnd() - 1, value: node.text});
    };
    const visit = node => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier);
      if (ts.isCallExpression(node) && node.arguments.length === 1 &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) add(node.arguments[0]);
      ts.forEachChild(node, visit);
    };
    visit(sf);
    return result;
  }
  // Read every source; changed string imports cannot be missed even outside whatsapp.
  for (const oldFile of sources) {
    const newFile = fileMoves.get(path.resolve(oldFile)) || oldFile;
    const original = fs.readFileSync(oldFile, 'utf8');
    const edits = [];
    for (const entry of findSpecifiers(oldFile, original)) {
      const next = rewriteSpecifier(oldFile, newFile, entry.value);
      if (next !== entry.value) {
        edits.push({ ...entry, next });
        changedRefs.push(`${rel(oldFile)}: ${entry.value} -> ${next}`);
      }
    }
    let content = original;
    for (const edit of edits.sort((a,b) => b.start-a.start)) content = content.slice(0, edit.start) + edit.next + content.slice(edit.end);
    if (content !== original || newFile !== oldFile) {
      rewrites.set(oldFile, {newFile, original, content});
      if (content !== original) touched.push(rel(oldFile));
    }
  }
  // Also guard against non-static references to the old directory, including aliases and path strings.
  const suspicious = [];
  const keywords = ['pages/agenda/', 'pages/seguradoras/', 'pages/WhatsAppAutomacoes', 'pages/WhatsAppContatos', 'pages/WhatsAppInbox', 'pages/WhatsAppKanban'];
  for (const oldFile of sources) {
    const original = fs.readFileSync(oldFile,'utf8');
    const mods = rewrites.get(oldFile);
    const refs = findSpecifiers(oldFile, original);
    for (const k of keywords) {
      if (!original.includes(k)) continue;
      // Existing path-style strings that are not relative imports may need manual handling.
      if (refs.some(r => r.value.includes(k) && !r.value.startsWith('.'))) suspicious.push(`${rel(oldFile)}: ${k} (alias ou pacote)`);
    }
  }
  if (unresolvedMoved.length || suspicious.length) fail('Verificação de segurança falhou:\n' + unresolvedMoved.concat(suspicious).join('\n'));
  console.log('\nMIGRAÇÃO: LIMPEZA DE whatsapp/pages');
  console.log('Branch:', branch);
  console.log('Arquivos a mover:', fileMoves.size);
  console.log('Referências estáticas a corrigir:', changedRefs.length);
  console.log('Arquivos com imports ajustados:', touched.length);
  console.log('\nDestinos:');
  for (const [a,b] of [...directoryMoves, ...standaloneMoves]) console.log(' ', a, '->', b);
  console.log('\nReferências corrigidas:');
  for (const line of changedRefs) console.log(' ',line);
  if (!apply) {
    console.log('\nPRÉVIA CONCLUÍDA. Nenhum arquivo alterado.');
    console.log('Para aplicar: node .\\migrar-pages-legado.cjs --apply');
    process.exit(0);
  }
  // Two-phase write with rollback for filesystem failure (not an atomic DB transaction).
  const newlyCreated = [];
  const overwritten = [];
  try {
    for (const [, e] of rewrites) {
      fs.mkdirSync(path.dirname(e.newFile), { recursive: true });
      if (e.newFile !== [...rewrites].find(([old,v]) => v===e)?.[0] && exists(e.newFile)) fail('Destino surgiu durante execução: ' + rel(e.newFile));
    }
    for (const [oldFile, e] of rewrites) {
      if (oldFile === e.newFile) {
        if (e.content !== e.original) { fs.writeFileSync(oldFile, e.content); overwritten.push([oldFile,e.original]); }
      } else {
        fs.writeFileSync(e.newFile, e.content, { flag:'wx' }); newlyCreated.push(e.newFile);
      }
    }
    for (const [oldFile] of rewrites) if (fileMoves.has(path.resolve(oldFile))) fs.unlinkSync(oldFile);
    // Drop emptied directories within the legacy pages tree, bottom-up.
    function cleanDirs(dir) {
      if (!exists(dir)) return;
      for (const e of fs.readdirSync(dir, {withFileTypes:true})) if (e.isDirectory()) cleanDirs(path.join(dir,e.name));
      if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    }
    cleanDirs(PAGES);
    console.log('\nSUCESSO. Arquivos migrados e imports corrigidos.');
    console.log('Valide: npm run build e teste funcional no localhost. NÃO faça push.');
  } catch (err) {
    for (const [oldFile,e] of rewrites) if (fileMoves.has(path.resolve(oldFile)) && !exists(oldFile) && exists(e.newFile)) fs.writeFileSync(oldFile, e.original);
    for (const [p,original] of overwritten.reverse()) fs.writeFileSync(p,original);
    for (const p of newlyCreated.reverse()) if (exists(p)) fs.unlinkSync(p);
    throw err;
  }
} catch(err) { console.error('\nERRO:', err.message); process.exitCode = 1; }

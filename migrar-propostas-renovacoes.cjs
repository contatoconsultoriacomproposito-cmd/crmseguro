#!/usr/bin/env node
/*
 * SeguroCRM — migração estrutural de Propostas + Renovações.
 * Execução sem argumentos: prévia (nenhum arquivo alterado).
 * Execução com --apply: movimenta os módulos e ajusta imports via AST TypeScript.
 * Não modifica regras comerciais, banco de dados nem arquivos fora de src/.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ts = require('typescript');
const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const W = path.join(SRC, 'pages', 'whatsapp');
const MIGRATIONS = [
  ['Propostas', path.join(W, 'pages', 'propostas'), path.join(W, 'propostas')],
  ['Renovações', path.join(W, 'pages', 'renovacoes'), path.join(W, 'renovacoes')],
];
const APPLY = process.argv.includes('--apply');
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');
const slash = p => p.replace(/\\/g, '/');
const SOURCE = /\.(?:ts|tsx|js|jsx|mts|cts|mjs|cjs)$/i;
const EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.scss', '.svg', '.png', '.jpg', '.jpeg', '.webp'];
const INDEXES = EXTENSIONS.map(x => 'index' + x);
const die = message => { console.error('\nBLOQUEADO: ' + message); process.exit(1); };
function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(full));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}
function execGit(args) {
  return cp.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function resolveRelative(file, specifier) {
  const target = path.resolve(path.dirname(file), specifier.split('?')[0].split('#')[0]);
  const candidates = [target, ...EXTENSIONS.map(ext => target + ext), ...INDEXES.map(ix => path.join(target, ix))];
  return candidates.find(p => { try { return fs.statSync(p).isFile(); } catch { return false; } }) || null;
}
function newPath(old) {
  for (const [, from, to] of MIGRATIONS) {
    if (old.startsWith(from + path.sep)) return path.join(to, path.relative(from, old));
  }
  return old;
}
function makeRelative(fromNew, toNew, originalSpec) {
  const suffixMatch = originalSpec.match(/[?#].*$/);
  const suffix = suffixMatch ? suffixMatch[0] : '';
  const specNoSuffix = originalSpec.slice(0, originalSpec.length - suffix.length);
  const explicitExtension = path.extname(specNoSuffix);
  let target = toNew;
  if (!explicitExtension) {
    const wasIndex = /(?:^|\/)index$/i.test(slash(specNoSuffix));
    if (/^index\.[^.]+$/i.test(path.basename(target)) && !wasIndex) target = path.dirname(target);
    else target = target.replace(/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/i, '');
  }
  let value = slash(path.relative(path.dirname(fromNew), target));
  if (!value.startsWith('.')) value = './' + value;
  return value + suffix;
}
function getImportNodes(sourceFile) {
  const literals = [];
  function walk(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      literals.push(node.moduleSpecifier);
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) {
      literals.push(node.moduleReference.expression);
    }
    if (ts.isCallExpression(node) && node.arguments.length && ts.isStringLiteral(node.arguments[0]) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      literals.push(node.arguments[0]);
    }
    ts.forEachChild(node, walk);
  }
  walk(sourceFile);
  return literals;
}
function main() {
  if (!fs.existsSync(SRC) || !fs.existsSync(W)) die('Execute na raiz de C:\\Users\\bruce\\Projects\\crmseguro.');
  let branch;
  try { branch = execGit(['branch', '--show-current']); } catch { die('Repositório Git não identificado.'); }
  if (branch !== 'refactor/reorganizacao-estrutura') die('Branch atual: ' + branch + '. Esperada: refactor/reorganizacao-estrutura.');
  // Permitir scripts/relatórios não rastreados; bloquear qualquer alteração de código ou stage pendente.
  if (execGit(['diff', '--name-only']) || execGit(['diff', '--cached', '--name-only'])) die('Há alterações rastreadas pendentes. Faça commit ou restaure antes da migração.');
  for (const [name, from, to] of MIGRATIONS) {
    if (!fs.existsSync(from)) die('Pasta de origem ausente: ' + rel(from));
    if (fs.existsSync(to)) die('Destino já existe: ' + rel(to) + ' (não sobrescreveremos).');
    if (listFiles(from).length === 0) die('Pasta de origem vazia: ' + rel(from));
  }
  const allSources = listFiles(SRC).filter(p => SOURCE.test(p));
  const changes = [];
  const unresolved = [];
  const aliasOld = [];
  let countRefs = 0;
  for (const oldFile of allSources) {
    const original = fs.readFileSync(oldFile, 'utf8');
    const newFile = newPath(oldFile);
    const sf = ts.createSourceFile(oldFile, original, ts.ScriptTarget.Latest, true, oldFile.endsWith('.tsx') || oldFile.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const edits = [];
    for (const literal of getImportNodes(sf)) {
      const spec = literal.text;
      if (!spec.startsWith('.')) {
        if (/(?:^|\/)(?:pages\/whatsapp\/pages\/(?:propostas|renovacoes))(?:\/|$)/.test(spec)) aliasOld.push(`${rel(oldFile)}: ${spec}`);
        continue;
      }
      const targetOld = resolveRelative(oldFile, spec);
      if (!targetOld) {
        if (oldFile !== newFile) unresolved.push(`${rel(oldFile)}: ${spec}`);
        continue;
      }
      const targetNew = newPath(targetOld);
      if (oldFile === newFile && targetOld === targetNew) continue;
      const revised = makeRelative(newFile, targetNew, spec);
      if (revised !== spec) {
        // Replace somente o conteúdo da string, mantendo aspas e formatação do arquivo.
        edits.push({ start: literal.getStart(sf) + 1, end: literal.getEnd() - 1, old: spec, next: revised });
        countRefs++;
      }
    }
    let output = original;
    for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.next + output.slice(edit.end);
    if (output !== original || newFile !== oldFile) changes.push({ oldFile, newFile, original, output, edits });
  }
  if (aliasOld.length) die('Imports por alias apontando às pastas antigas:\n  ' + aliasOld.join('\n  '));
  if (unresolved.length) die('Imports relativos não resolvidos dentro de arquivos que serão movidos:\n  ' + unresolved.slice(0, 25).join('\n  ') + (unresolved.length > 25 ? `\n... e mais ${unresolved.length - 25}` : ''));
  const moved = changes.filter(x => x.oldFile !== x.newFile);
  const edited = changes.filter(x => x.edits.length);
  console.log('\nMIGRAÇÃO CONJUNTA: PROPOSTAS + RENOVAÇÕES');
  console.log('Branch: ' + branch);
  MIGRATIONS.forEach(([name, from, to]) => console.log(`  ${name}: ${rel(from)} -> ${rel(to)} (${listFiles(from).length} arquivos)`));
  console.log(`Arquivos movidos: ${moved.length} | Imports corrigidos: ${countRefs} | Arquivos com imports ajustados: ${edited.length}`);
  for (const change of edited) {
    console.log('\n' + rel(change.oldFile) + (change.oldFile !== change.newFile ? ' (movido)' : ''));
    change.edits.forEach(e => console.log(`  ${e.old} -> ${e.next}`));
  }
  if (!APPLY) { console.log('\nPRÉVIA CONCLUÍDA. Nenhum arquivo foi alterado.'); console.log('Para aplicar: node .\\migrar-propostas-renovacoes.cjs --apply'); return; }
  // Não renomeia pastas inteiras: move arquivos individualmente para reduzir EPERM no Windows.
  // Em caso de falha, reverte somente os arquivos modificados nesta execução.
  const movedFiles = [];
  const writtenFiles = [];
  try {
    for (const { oldFile, newFile } of moved) {
      fs.mkdirSync(path.dirname(newFile), { recursive: true });
      fs.renameSync(oldFile, newFile);
      movedFiles.push({ oldFile, newFile });
    }
    for (const change of changes.filter(x => x.output !== x.original)) {
      fs.writeFileSync(change.newFile, change.output, 'utf8');
      writtenFiles.push(change);
    }
  } catch (e) {
    console.error('\nFALHA: ' + e.message + '. Tentando reverter a migração.');
    let restoreOK = true;
    for (const c of [...writtenFiles].reverse()) {
      try { fs.writeFileSync(c.newFile, c.original, 'utf8'); } catch (err) { restoreOK = false; console.error('Falha ao restaurar: ' + rel(c.newFile), err.message); }
    }
    for (const m of [...movedFiles].reverse()) {
      try { fs.mkdirSync(path.dirname(m.oldFile), { recursive: true }); fs.renameSync(m.newFile, m.oldFile); } catch (err) { restoreOK = false; console.error('Falha ao desfazer movimentação: ' + rel(m.newFile), err.message); }
    }
    console.error(restoreOK ? 'Restauração concluída; confirme com git status --short.' : 'Restauração parcial: NÃO continue; confira git status --short.');
    process.exit(1);
  }
  console.log('\nSUCESSO: Propostas e Renovações reorganizados.');
  console.log('Valide: npm run build; depois teste os dois módulos no localhost.');
  console.log('Não execute git add . ou git push. Confira git status --short antes do commit.');
}
main();

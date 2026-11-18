#!/usr/bin/env node
/**
 * SeguroCRM — migração estrutural do módulo Clientes.
 * Prévia por padrão. --apply somente após inspeção.
 * Requer TypeScript já instalado no projeto. Não executa push/commit/build.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ts = require('typescript');

const root = process.cwd();
const src = path.join(root, 'src');
const whatsapp = path.join(src, 'pages', 'whatsapp');
const oldDir = path.join(whatsapp, 'central-clientes');
const newDir = path.join(whatsapp, 'clientes');
const oldPage = path.join(oldDir, 'CentralClientes.tsx');
const newPage = path.join(newDir, 'pages', 'CentralClientes.tsx');
const apply = process.argv.includes('--apply');
const rel = p => path.relative(root, p).split(path.sep).join('/');
const exists = p => fs.existsSync(p);
const extList = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.scss', '.svg', '.png', '.jpg', '.jpeg', '.webp'];
const codeExt = /\.(tsx?|jsx?|mjs|cjs)$/i;
const walk = dir => {
  let result = [];
  if (!exists(dir)) return result;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name === 'node_modules' || item.name === 'dist' || item.name === '.git') continue;
    const f = path.join(dir, item.name);
    if (item.isDirectory()) result.push(...walk(f));
    else if (item.isFile()) result.push(f);
  }
  return result;
};
const cmd = args => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const inside = (file, dir) => file === dir || file.startsWith(dir + path.sep);
const slash = p => p.split(path.sep).join('/');
const movePath = file => {
  if (file === oldPage) return newPage;
  if (inside(file, oldDir)) return path.join(newDir, path.relative(oldDir, file));
  return file;
};
const resolveImport = (source, spec) => {
  let base;
  if (spec.startsWith('.')) base = path.resolve(path.dirname(source), spec);
  else if (spec.startsWith('@/')) base = path.join(src, spec.slice(2));
  else if (spec.startsWith('src/')) base = path.join(root, spec);
  else return null;
  const candidates = [base, ...extList.map(ext => base + ext), ...extList.map(ext => path.join(base, 'index' + ext))];
  return candidates.find(exists) || null;
};
const moduleStrings = (node, sourceFile) => {
  const found = [];
  const visit = node => {
    let literal = null;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) literal = node.moduleSpecifier;
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      if (node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) literal = node.moduleReference.expression;
    } else if (ts.isCallExpression(node) && node.arguments.length) {
      const e = node.expression;
      const isDynamic = e.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(e) && e.text === 'require') || (ts.isPropertyAccessExpression(e) && e.name.text === 'glob' && ts.isMetaProperty(e.expression.expression));
      if (isDynamic && ts.isStringLiteralLike(node.arguments[0])) literal = node.arguments[0];
    }
    if (literal) found.push(literal);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
};
const makeSpecifier = (originalSpec, oldSource, newSource, resolvedOld) => {
  const resolvedNew = movePath(resolvedOld);
  if (originalSpec.startsWith('@/')) {
    return '@/' + slash(path.relative(src, resolvedNew)).replace(/\.(tsx?|jsx?)$/i, '');
  }
  if (originalSpec.startsWith('src/')) {
    return 'src/' + slash(path.relative(src, resolvedNew)).replace(/\.(tsx?|jsx?)$/i, '');
  }
  // Conservar se o import original usa extensão explícita ou /index.
  const explicit = extList.some(ext => originalSpec.endsWith(ext));
  const indexImport = /\/index(?:\.[^/]+)?$/.test(originalSpec);
  let target = resolvedNew;
  if (indexImport && path.basename(resolvedOld).startsWith('index.')) target = resolvedNew;
  else if (!explicit) target = target.replace(/\.(tsx?|jsx?|mjs|cjs|json|css|scss|svg|png|jpe?g|webp)$/i, '');
  let result = slash(path.relative(path.dirname(newSource), target));
  if (!result.startsWith('.')) result = './' + result;
  if (!indexImport && !explicit && path.basename(resolvedOld).startsWith('index.')) {
    // O original pode importar uma pasta. Preservar o padrão caso realmente apontasse à pasta.
    const oldWithoutIndex = path.dirname(resolvedOld);
    const origBase = path.resolve(path.dirname(oldSource), originalSpec);
    if (origBase === oldWithoutIndex) result = result.replace(/\/index$/, '');
  }
  return result;
};
function fail(message) { console.error('\nBLOQUEADO: ' + message); process.exit(1); }
if (!exists(path.join(root, 'package.json')) || !exists(src)) fail('Execute na raiz do projeto crmseguro.');
if (!exists(oldDir) || !exists(oldPage)) fail('Origem Clientes não encontrada no caminho esperado; nada foi alterado.');
if (exists(newDir)) fail('Destino src/pages/whatsapp/clientes já existe; é necessário avaliar antes de continuar.');
let branch;
try { branch = cmd(['branch', '--show-current']); } catch { fail('Repositório Git não disponível.'); }
if (branch !== 'refactor/reorganizacao-estrutura') fail('Branch atual: ' + branch + '. Use a branch de refatoração.');
if (cmd(['status', '--porcelain', '--untracked-files=no'])) fail('Existem alterações rastreadas pendentes. Faça commit ou reverta antes.');

const sources = walk(src).filter(f => codeExt.test(f));
const movingFiles = walk(oldDir).filter(f => codeExt.test(f));
const modifications = [];
const references = [];
const alerts = [];
for (const file of sources) {
  const content = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true,
    /\.tsx$|\.jsx$/i.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const moved = movePath(file);
  const edits = [];
  for (const lit of moduleStrings(sf, sf)) {
    const spec = lit.text;
    const baseSpec = spec.split('?')[0].split('#')[0];
    const resolved = resolveImport(file, baseSpec);
    const touches = resolved && (moved !== file || movePath(resolved) !== resolved);
    if (!touches) {
      if (!resolved && /central-clientes/.test(spec)) alerts.push(`${rel(file)}: referência não resolvida ${spec}`);
      continue;
    }
    const ending = spec.slice(baseSpec.length);
    const next = makeSpecifier(baseSpec, file, moved, resolved) + ending;
    if (next !== spec) {
      const start = lit.getStart(sf) + 1;
      const end = lit.getEnd() - 1;
      edits.push({ start, end, before: spec, after: next });
      references.push({ file: rel(file), to: rel(moved), before: spec, after: next });
    }
  }
  // Barrar outros literais com referência à pasta antiga fora das declarações tratadas.
  const unexplained = /central-clientes/g;
  let match;
  while ((match = unexplained.exec(content))) {
    const handled = edits.some(e => match.index >= e.start && match.index < e.end);
    if (!handled) alerts.push(`${rel(file)}: texto 'central-clientes' fora dos imports reescritos (posição ${match.index})`);
  }
  if (edits.length) {
    let changed = content;
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
      changed = changed.slice(0, edit.start) + edit.after + changed.slice(edit.end);
    }
    modifications.push({ from: file, to: moved, before: content, after: changed });
  }
}
// Verificar entradas CSS/JSON/outros que possam ter caminhos codificados.
for (const f of walk(src).filter(f => !codeExt.test(f) && /\.(css|scss|json)$/i.test(f))) {
  const txt = fs.readFileSync(f, 'utf8');
  if (txt.includes('central-clientes')) alerts.push(`${rel(f)}: menção à origem antiga`);
}
const uniqueAlerts = [...new Set(alerts)];
console.log('\nMIGRAÇÃO COMPLETA: CLIENTES');
console.log('Branch: ' + branch);
console.log('Origem: ' + rel(oldDir) + '/');
console.log('Destino: ' + rel(newDir) + '/');
console.log('Página: ' + rel(oldPage) + ' -> ' + rel(newPage));
console.log(`Arquivos no módulo: ${walk(oldDir).length} | Referências a corrigir: ${references.length} | Arquivos com imports alterados: ${modifications.length}`);
console.log('\nImportações corrigidas (origem -> destino):');
for (const r of references) console.log(`  ${r.file}${r.file !== r.to ? ' (movido)' : ''}\n    ${r.before} -> ${r.after}`);
if (uniqueAlerts.length) {
  console.log('\nREFERÊNCIAS A REVISAR (migração bloqueada):');
  uniqueAlerts.slice(0, 60).forEach(s => console.log('  ' + s));
  if (uniqueAlerts.length > 60) console.log(`  ... mais ${uniqueAlerts.length - 60}`);
  fail('Referências não cobertas pela atualização automática. Envie a prévia para revisão.');
}
if (!apply) {
  console.log('\nPRÉVIA CONCLUÍDA. Nenhum arquivo alterado.');
  console.log('Para aplicar: node .\\migrar-clientes.cjs --apply');
  process.exit(0);
}
// A execução é reversível em falhas síncronas. Arquivos rastreados só alterados após conferências.
let movedDir = false;
let movedPage = false;
const written = [];
try {
  fs.renameSync(oldDir, newDir);
  movedDir = true;
  fs.mkdirSync(path.dirname(newPage), { recursive: true });
  fs.renameSync(path.join(newDir, 'CentralClientes.tsx'), newPage);
  movedPage = true;
  for (const change of modifications) {
    fs.writeFileSync(change.to, change.after, 'utf8');
    written.push(change);
  }
  console.log('\nSUCESSO: módulo Clientes reorganizado, imports atualizados.');
  console.log('PRÓXIMO: npm run build; depois testar Clientes no localhost.');
  console.log('NÃO execute push. Faça commit apenas após homologação.');
} catch (e) {
  console.error('\nFALHA durante movimentação; tentando restaurar estado anterior:', e.message);
  try {
    for (const change of written.slice().reverse()) fs.writeFileSync(change.to, change.before, 'utf8');
    if (movedPage) fs.renameSync(newPage, path.join(newDir, 'CentralClientes.tsx'));
    if (movedDir) fs.renameSync(newDir, oldDir);
    console.error('Restauração local concluída. Confira git status --short.');
  } catch (rollbackError) { console.error('Restauração incompleta:', rollbackError.message, '\nNão execute outro script antes de revisar git status.'); }
  process.exit(1);
}

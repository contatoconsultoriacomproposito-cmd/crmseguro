/**
 * Diagnóstico SOMENTE LEITURA do núcleo src/pages/whatsapp.
 * Execução: node diagnostico-whatsapp.cjs (na raiz do projeto)
 * Requisito: dependencia `typescript` instalada no projeto.
 * Saídas: diagnosticos/arquitetura-whatsapp/*.csv e resumo.md
 * NÃO move, altera ou exclui arquivos-fonte.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const nucleus = path.join(root, 'src', 'pages', 'whatsapp');
const output = path.join(root, 'diagnosticos', 'arquitetura-whatsapp');
const toPosix = s => s.split(path.sep).join('/');
const relative = file => toPosix(path.relative(root, file));
const isInside = (file, dir) => file === dir || file.startsWith(dir + path.sep);

if (!fs.existsSync(nucleus)) {
  console.error('ERRO: Execute na raiz do projeto; não encontrei src/pages/whatsapp.');
  process.exit(1);
}
let ts;
try { ts = require(require.resolve('typescript', { paths: [root] })); }
catch {
  console.error('ERRO: TypeScript não encontrado. Execute npm install antes, se necessário.');
  process.exit(1);
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) files.push(full);
  }
  return files;
}
const internalFiles = walk(nucleus).sort();
const internalSet = new Set(internalFiles);

// Fora do núcleo: SOMENTE entradas explícitas, sem varrer o código legado.
const knownEntrypoints = [
  'src/App.tsx', 'src/App.ts', 'src/main.tsx', 'src/main.ts',
  'src/Sidebar.tsx', 'src/components/Sidebar.tsx',
  'src/routes.tsx', 'src/routes.ts', 'src/Routes.tsx',
  'src/rotas.tsx', 'src/rotas.ts', 'src/router.tsx',
  'src/routes/index.tsx', 'src/routes/index.ts',
  'src/rotas/index.tsx', 'src/rotas/index.ts',
  'src/components/layout/Sidebar.tsx',
  'src/layout/Sidebar.tsx', 'src/layouts/Sidebar.tsx',
];
const entrypoints = knownEntrypoints.map(p => path.join(root, p)).filter(f => fs.existsSync(f));

const cfgFile = ['tsconfig.app.json', 'tsconfig.json'].map(f => path.join(root, f)).find(f => fs.existsSync(f));
let compilerOptions = { allowJs: true, jsx: ts.JsxEmit.ReactJSX, moduleResolution: ts.ModuleResolutionKind.Bundler };
if (cfgFile) {
  const read = ts.readConfigFile(cfgFile, ts.sys.readFile);
  if (read.error) console.warn('AVISO: erro ao ler tsconfig:', ts.flattenDiagnosticMessageText(read.error.messageText, '\n'));
  else {
    const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(cfgFile));
    compilerOptions = { ...compilerOptions, ...parsed.options };
    for (const d of parsed.errors) console.warn('AVISO tsconfig:', ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  }
}
const resolverCache = ts.createModuleResolutionCache(root, f => ts.sys.useCaseSensitiveFileNames ? f : f.toLowerCase(), compilerOptions);
const codeFiles = [...internalFiles, ...entrypoints.filter(f => !internalSet.has(f))];
const edges = [];
const unresolved = [];
const externalPackages = new Map();

function moduleOf(file) {
  if (!isInside(file, nucleus)) return '[EXTERNO]';
  const parts = path.relative(nucleus, file).split(path.sep);
  if (parts[0] === 'pages' && parts[1]) return `pages/${parts[1]}`;
  return parts[0];
}

function getImports(file) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, /\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const results = [];
  const add = (spec, kind) => { if (spec && typeof spec === 'string') results.push({ spec, kind }); };
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) add(node.moduleSpecifier.text, ts.isImportDeclaration(node) ? 'import' : 'export');
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) {
      add(node.moduleReference.expression.text, 'import_equals');
    } else if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0].text, 'dynamic_import');
      else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') add(node.arguments[0].text, 'require');
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return results;
}
for (const file of codeFiles) {
  let imports;
  try { imports = getImports(file); }
  catch (e) { console.warn('AVISO: não foi possível ler', relative(file), e.message); continue; }
  for (const { spec, kind } of imports) {
    const isLocalSpec = spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@/') || spec.startsWith('~/');
    const resolved = ts.resolveModuleName(spec, file, compilerOptions, ts.sys, resolverCache).resolvedModule;
    if (!resolved) {
      if (isLocalSpec) unresolved.push({ arquivo: relative(file), importacao: spec, tipo: kind });
      else externalPackages.set(spec, (externalPackages.get(spec) || 0) + 1);
      continue;
    }
    const target = path.resolve(resolved.resolvedFileName);
    const targetInProject = isInside(target, root) && !isInside(target, path.join(root, 'node_modules'));
    if (!targetInProject) {
      externalPackages.set(spec, (externalPackages.get(spec) || 0) + 1);
      continue;
    }
    edges.push({
      origem: relative(file), destino: relative(target), tipo: kind,
      modulo_origem: moduleOf(file), modulo_destino: moduleOf(target),
      categoria: isInside(file, nucleus)
        ? (isInside(target, nucleus) ? 'interno' : 'saida_do_nucleo')
        : (isInside(target, nucleus) ? 'entrada_externa' : 'entre_entradas'),
    });
  }
}
const counts = new Map(internalFiles.map(f => [relative(f), { totalEntradas: 0, totalSaidas: 0, entradasExternas: 0, modulosConsumidores: new Set(), modulosDependencias: new Set() }]));
for (const e of edges) {
  const a = counts.get(e.origem), b = counts.get(e.destino);
  if (a) { a.totalSaidas++; a.modulosDependencias.add(e.modulo_destino); }
  if (b) { b.totalEntradas++; b.modulosConsumidores.add(e.modulo_origem); if (e.categoria === 'entrada_externa') b.entradasExternas++; }
}
const inventory = internalFiles.map(file => {
  const name = relative(file); const m = moduleOf(file); const c = counts.get(name);
  const otherMods = [...c.modulosConsumidores].filter(x => x !== m);
  const isService = /(^|\/)services\/|Service\.[tj]sx?$/.test(name);
  return {
    arquivo: name, modulo_atual: m, tipo: path.extname(file),
    importacoes_recebidas: c.totalEntradas, importacoes_feitas: c.totalSaidas,
    importacoes_recebidas_de_entradas: c.entradasExternas,
    consumidores_outros_modulos: otherMods.sort().join(' | '),
    classe_service: !isService ? '' : otherMods.length ? 'COMPARTILHADO_OBSERVADO' : c.totalEntradas ? 'LOCAL_OBSERVADO' : 'SEM_CONSUMIDOR_NESTE_ESCOPO',
  };
});
// Ciclos de dependências por Tarjan (apenas nós do núcleo).
const adjacency = new Map(inventory.map(x => [x.arquivo, new Set()]));
for (const e of edges) if (adjacency.has(e.origem) && adjacency.has(e.destino)) adjacency.get(e.origem).add(e.destino);
let nextIndex = 0;
const idx = new Map(), low = new Map(), stack = [], active = new Set(), cycles = [];
function strongConnect(v) {
  idx.set(v, nextIndex); low.set(v, nextIndex++); stack.push(v); active.add(v);
  for (const w of adjacency.get(v)) {
    if (!idx.has(w)) { strongConnect(w); low.set(v, Math.min(low.get(v), low.get(w))); }
    else if (active.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
  }
  if (low.get(v) === idx.get(v)) {
    const component = []; let w;
    do { w = stack.pop(); active.delete(w); component.push(w); } while (w !== v);
    if (component.length > 1 || adjacency.get(v).has(v)) cycles.push(component.sort());
  }
}
for (const v of adjacency.keys()) if (!idx.has(v)) strongConnect(v);

function csvValue(value) { const s = String(value ?? ''); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function writeCsv(name, rows, headers) {
  const lines = [headers.join(';'), ...rows.map(row => headers.map(h => csvValue(row[h])).join(';'))];
  fs.writeFileSync(path.join(output, name), '\uFEFF' + lines.join('\r\n') + '\r\n');
}
fs.mkdirSync(output, { recursive: true });
writeCsv('01-inventario.csv', inventory, ['arquivo','modulo_atual','tipo','importacoes_recebidas','importacoes_feitas','importacoes_recebidas_de_entradas','consumidores_outros_modulos','classe_service']);
writeCsv('02-dependencias.csv', edges, ['origem','destino','tipo','modulo_origem','modulo_destino','categoria']);
writeCsv('03-importacoes-nao-resolvidas.csv', unresolved, ['arquivo','importacao','tipo']);
writeCsv('04-ciclos.csv', cycles.flatMap((items, i) => items.map(file => ({ ciclo: i+1, arquivo: file }))), ['ciclo','arquivo']);
writeCsv('05-pacotes-externos.csv', [...externalPackages].sort((a,b) => b[1]-a[1]).map(([pacote, vezes]) => ({ pacote, vezes })), ['pacote','vezes']);

const top = [...inventory].sort((a,b) => b.importacoes_recebidas-a.importacoes_recebidas).slice(0, 20);
const shared = inventory.filter(x => x.classe_service === 'COMPARTILHADO_OBSERVADO');
const outside = edges.filter(x => x.categoria === 'saida_do_nucleo');
const inbound = edges.filter(x => x.categoria === 'entrada_externa');
const md = [
  '# Diagnóstico de arquitetura — núcleo WhatsApp', '',
  '> Relatório observacional: nenhuma alteração nos fontes. Relações identificadas por importações estáticas e imports dinâmicos literais; não é uma prova de ausência de dependência.', '',
  `- Raiz analisada: \`src/pages/whatsapp\``,
  `- Arquivos do núcleo: **${inventory.length}**`,
  `- Entradas externas examinadas: **${entrypoints.length}** (${entrypoints.map(relative).join(', ') || 'nenhuma encontrada'})`,
  `- Referências de projeto resolvidas: **${edges.length}**`,
  `- Dependências saindo do núcleo: **${outside.length}**`,
  `- Dependências entrando a partir das entradas conhecidas: **${inbound.length}**`,
  `- Imports locais/aliases não resolvidos: **${unresolved.length}**`,
  `- Ciclos internos detectados: **${cycles.length}**`, '',
  '## Arquivos mais importados dentro do escopo', '',
  '| Arquivo | Importações recebidas | Módulo |', '|---|---:|---|',
  ...top.map(x => `| \`${x.arquivo}\` | ${x.importacoes_recebidas} | ${x.modulo_atual} |`), '',
  '## Serviços consumidos por outros módulos (observados)', '',
  ...(shared.length ? shared.map(x => `- \`${x.arquivo}\` — consumidores: ${x.consumidores_outros_modulos}`) : ['Nenhum detectado no escopo.']), '',
  '## Dependências externas diretas ao núcleo', '',
  ...(outside.length ? [...new Set(outside.map(x => x.destino))].sort().map(x => `- \`${x}\``) : ['Nenhuma detectada.']), '',
  '## Cuidados na interpretação', '',
  '- **SEM_CONSUMIDOR_NESTE_ESCOPO não significa arquivo órfão**: outros arquivos legados não foram examinados.',
  '- **LOCAL_OBSERVADO não garante exclusividade**: apenas as entradas externas explicitamente listadas foram inspecionadas.',
  '- O diagnóstico não rastreia strings de rotas, `import()` com caminho calculado, URLs de assets, CSS ou referências do backend.',
  '- Nenhum arquivo é classificado para exclusão ou movimentação automática.',
  '- Antes de mover qualquer arquivo, confirmar o grafo completo de consumidores do arquivo específico.', '',
  '## Arquivos CSV', '',
  '- `01-inventario.csv`: arquivos, módulos e sinais de compartilhamento',
  '- `02-dependencias.csv`: imports resolvidos (quem importa quem)',
  '- `03-importacoes-nao-resolvidas.csv`: caminhos locais que exigem conferência',
  '- `04-ciclos.csv`: dependências circulares observadas',
  '- `05-pacotes-externos.csv`: imports de pacotes externos', '',
].join('\n');
fs.writeFileSync(path.join(output, '00-resumo.md'), md, 'utf8');
console.log('\nDIAGNÓSTICO FINALIZADO (somente leitura dos códigos).');
console.log('Arquivos internos:', inventory.length, '| dependências:', edges.length, '| ciclos:', cycles.length);
console.log('Relatórios em:', output);

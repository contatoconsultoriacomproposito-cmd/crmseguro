#!/usr/bin/env node
/**
 * SeguroCRM - auditoria de responsabilidades no núcleo WhatsApp.
 * Somente leitura dos fontes. Salva relatórios em diagnosticos/compartilhados-whatsapp.
 * Requer o pacote typescript do próprio projeto. Não altera código, Git, banco ou rotas.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const NUCLEO = path.join(SRC, 'pages', 'whatsapp');
const OUT = path.join(ROOT, 'diagnosticos', 'compartilhados-whatsapp');
if (!fs.existsSync(path.join(ROOT, 'package.json')) || !fs.existsSync(NUCLEO)) {
  console.error('ERRO: execute na raiz do projeto crmseguro (com src/pages/whatsapp).');
  process.exit(1);
}
let ts;
try { ts = require(path.join(ROOT, 'node_modules', 'typescript')); }
catch { console.error('ERRO: pacote typescript não encontrado em node_modules. Execute npm install conforme o projeto, se necessário.'); process.exit(1); }
const p = x => x.split(path.sep).join('/');
const rel = x => p(path.relative(ROOT, x));
const within = (file, dir) => file === dir || file.startsWith(dir + path.sep);
const read = file => fs.readFileSync(file, 'utf8');
const ignoredDirs = new Set(['node_modules', 'dist', 'build', '.git', '.next', '.vercel', 'coverage', 'diagnosticos']);
function filesIn(dir) {
  if (!fs.existsSync(dir)) return [];
  const found = [];
  function walk(d) {
    for (const ent of fs.readdirSync(d, {withFileTypes: true})) {
      if (ent.isDirectory()) { if (!ignoredDirs.has(ent.name)) walk(path.join(d, ent.name)); }
      else if (ent.isFile() && /\.(?:tsx?|jsx?)$/.test(ent.name) && !/\.d\.ts$/.test(ent.name)) found.push(path.join(d, ent.name));
    }
  }
  walk(dir);
  return found.sort();
}
const all = filesIn(SRC);
// O script lê somente imports dos demais arquivos de src; não reorganiza nem audita todo o legado.
const configFile = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json');
let options = {moduleResolution: ts.ModuleResolutionKind.Bundler, allowJs: true};
let configErrors = [];
if (configFile) {
  const base = ts.readConfigFile(configFile, ts.sys.readFile);
  if (base.error) configErrors.push(ts.flattenDiagnosticMessageText(base.error.messageText, '\n'));
  else {
    const parsed = ts.parseJsonConfigFileContent(base.config, ts.sys, path.dirname(configFile));
    options = {...parsed.options, allowJs: true};
    configErrors = parsed.errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n'));
  }
}
const cache = ts.createModuleResolutionCache(ROOT, x => x, options);
const candidates = all.filter(file => {
  if (!within(file, NUCLEO)) return false;
  const inside = path.relative(NUCLEO, file).split(path.sep);
  return ['services', 'hooks', 'components', 'utils', 'types', 'providers'].includes(inside[0]);
});
const candidateSet = new Set(candidates);
function group(file) {
  const r = p(path.relative(NUCLEO, file));
  if (r.startsWith('../')) return 'EXTERNO_SRC';
  const parts = r.split('/');
  if (parts[0] === 'pages' && parts.length > 2) return parts[1];
  if (parts[0] === 'configuracao-corretora' || parts[0] === 'configuracoes') return 'configuracoes';
  if (parts[0] === 'automation') return 'automacoes';
  if (parts[0] === 'central-clientes' || parts[0] === 'clientes') return 'clientes';
  if (parts[0] === 'components' || parts[0] === 'hooks' || parts[0] === 'services' || parts[0] === 'types' || parts[0] === 'utils' || parts[0] === 'providers') return 'RAIZ_COMPARTILHADA';
  if (parts[0] === 'pages') return 'PAGINAS_WHATSAPP';
  return parts[0];
}
function importsOf(file) {
  const content = read(file);
  const sf = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : undefined);
  const results=[];
  function add(node, kind) {
    if (node && ts.isStringLiteralLike(node)) results.push({specifier:node.text, kind});
  }
  function visit(node) {
    if (ts.isImportDeclaration(node)) add(node.moduleSpecifier,'import');
    if (ts.isExportDeclaration(node)) add(node.moduleSpecifier,'reexport');
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add(node.moduleReference.expression,'import_equals');
    if (ts.isCallExpression(node) && node.arguments.length === 1 && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) add(node.arguments[0], node.expression.kind === ts.SyntaxKind.ImportKeyword ? 'dynamic_import' : 'require');
    ts.forEachChild(node,visit);
  }
  visit(sf);
  return results;
}
const refs = new Map(candidates.map(f => [f, []]));
const unresolved=[];
for (const source of all) {
  for (const im of importsOf(source)) {
    const mod=ts.resolveModuleName(im.specifier,source,options,ts.sys,cache).resolvedModule;
    if (mod) {
      let target=path.normalize(mod.resolvedFileName);
      // Match path casing as the TypeScript resolver returned it.
      if (refs.has(target)) refs.get(target).push({source,kind:im.kind,specifier:im.specifier});
    } else if (im.specifier.startsWith('.') && (candidateSet.has(source) || within(source, NUCLEO))) {
      unresolved.push({source:rel(source), import: im.specifier,kind:im.kind});
    }
  }
}
const result=candidates.map(file=>{
  const consumers=refs.get(file);
  const groups=[...new Set(consumers.map(x=>group(x.source)))].sort();
  const external=consumers.filter(x=>!within(x.source,NUCLEO)).length;
  const possibleOwner=groups.filter(g=>!['RAIZ_COMPARTILHADA','EXTERNO_SRC','PAGINAS_WHATSAPP'].includes(g));
  let classification='REVISAR_MANUALMENTE';
  if (!consumers.length) classification='SEM_IMPORTS_ESTATICOS_DETECTADOS';
  else if (groups.length>1) classification='USO_TRANSVERSAL';
  else if (groups[0]==='RAIZ_COMPARTILHADA') classification='CONSUMIDO_NA_RAIZ';
  else if (groups[0]==='EXTERNO_SRC') classification='CONSUMIDO_FORA_DO_NUCLEO';
  else classification='CONSUMO_CONCENTRADO';
  return {file:rel(file),area:path.relative(NUCLEO,file).split(path.sep)[0],classification,total:consumers.length,groups,external,possibleOwner,consumers};
}).sort((a,b)=>b.total-a.total || a.file.localeCompare(b.file));
function csv(rows,fields){
  const escape=x=>'"'+String(x??'').replace(/"/g,'""').replace(/\r?\n/g,' ')+'"';
  return [fields.join(','),...rows.map(x=>fields.map(f=>escape(x[f])).join(','))].join('\n')+'\n';
}
fs.mkdirSync(OUT,{recursive:true});
const inv=result.map(r=>({arquivo:r.file,area:r.area,importacoes_recebidas:r.total,modulos_consumidores:r.groups.join(' | '),qtd_modulos:r.groups.length,consumidores_fora_nucleo:r.external,indicador:r.classification}));
fs.writeFileSync(path.join(OUT,'01-inventario-compartilhados.csv'),csv(inv,['arquivo','area','importacoes_recebidas','modulos_consumidores','qtd_modulos','consumidores_fora_nucleo','indicador']),'utf8');
const edges=result.flatMap(r=>r.consumers.map(c=>({arquivo:r.file,consumidor:rel(c.source),grupo_consumidor:group(c.source),tipo:c.kind,import:c.specifier})));
fs.writeFileSync(path.join(OUT,'02-quem-usa-quem.csv'),csv(edges,['arquivo','consumidor','grupo_consumidor','tipo','import']),'utf8');
fs.writeFileSync(path.join(OUT,'03-imports-relativos-nao-resolvidos.csv'),csv(unresolved,['source','import','kind']),'utf8');
const totals={};for(const r of result)totals[r.classification]=(totals[r.classification]||0)+1;
const lines=[
 '# Auditoria de arquivos compartilhados — SeguroCRM','',
 '> Diagnóstico de importações estáticas/dinâmicas com especificadores literais. Não decide sozinho o destino de arquivos.','',
 `- Arquivos TS/TSX/JS/JSX lidos em src: **${all.length}**`,
 `- Arquivos candidatos na raiz compartilhada: **${candidates.length}**`,
 `- Referências recebidas pelos candidatos: **${edges.length}**`,
 `- Referências a partir de arquivos fora de src/pages/whatsapp: **${edges.filter(x=>x.grupo_consumidor==='EXTERNO_SRC').length}**`,
 `- Imports relativos não resolvidos no núcleo: **${unresolved.length}**`,'',
 '## Indicadores (não são decisões de movimentação)','',
 ...Object.entries(totals).sort().map(([k,v])=>`- ${k}: ${v}`),'',
 '## 35 arquivos mais importados','',
 '| Arquivo | Referências | Áreas consumidoras |','|---|---:|---|',
 ...result.slice(0,35).map(r=>`| \`${r.file}\` | ${r.total} | ${r.groups.join(', ')||'nenhuma detectada'} |`),'',
 '## Observações importantes','',
 '- **Não mover** arquivos com base apenas no indicador: um service pode ter dono de domínio e ser consumido por outros módulos.','- Sem imports detectados **não** significa arquivo sem uso: rotas dinâmicas, strings, testes, configuração e código fora de src podem referenciá-lo.','- O diagnóstico lê imports de todo src para localizar consumidores externos, mas só inventaria como candidatos as pastas compartilhadas da raiz do núcleo.','- Imports não resolvidos podem incluir recursos não TypeScript (CSS, imagens, módulos virtuais etc.).','- Para migrar, fazer plano explícito, prévia, build, validação funcional e commit isolado.','',
 '## Arquivos gerados','',
 '- 00-resumo.md','- 01-inventario-compartilhados.csv','- 02-quem-usa-quem.csv','- 03-imports-relativos-nao-resolvidos.csv',''
];
if(configErrors.length)lines.push('## Avisos do tsconfig','',...configErrors.map(s=>'- '+s),'');
fs.writeFileSync(path.join(OUT,'00-resumo.md'),lines.join('\n'),'utf8');
let branch='(não detectada)';try{branch=cp.execFileSync('git',['branch','--show-current'],{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
console.log('\nAUDITORIA DE ARQUIVOS COMPARTILHADOS - SOMENTE LEITURA');
console.log('Branch: '+branch);
console.log(`Arquivos lidos em src: ${all.length}`);
console.log(`Arquivos compartilhados candidatos: ${candidates.length}`);
console.log(`Importações recebidas por esses arquivos: ${edges.length}`);
console.log(`Consumidores externos ao núcleo: ${edges.filter(x=>x.grupo_consumidor==='EXTERNO_SRC').length}`);
console.log(`Imports relativos não resolvidos no núcleo: ${unresolved.length}`);
console.log('RELATÓRIOS: '+rel(OUT));
console.log('Nenhum arquivo de código alterado.');

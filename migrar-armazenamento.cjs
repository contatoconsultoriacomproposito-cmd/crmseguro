/**
 * SeguroCRM — migração-piloto de Armazenamento.
 * Uso na raiz do projeto: node .\migrar-armazenamento.cjs [--apply]
 * Sem --apply, apenas mostra a prévia. Não usa dependências externas.
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const rel = (...parts) => path.join(root, ...parts);
const oldPath = rel('src', 'pages', 'whatsapp', 'armazenamento', 'services', 'CentralArmazenamento.tsx');
const newPath = rel('src', 'pages', 'whatsapp', 'armazenamento', 'pages', 'CentralArmazenamento.tsx');
const appPath = rel('src', 'App.tsx');
const apply = process.argv.includes('--apply');

function fail(message) { console.error('\nERRO:', message); process.exit(1); }
function read(file) { return fs.readFileSync(file, 'utf8'); }
if (!fs.existsSync(oldPath)) fail('Origem não encontrada: ' + path.relative(root, oldPath));
if (fs.existsSync(newPath)) fail('O destino já existe; não sobrescreveremos nenhum arquivo.');
if (!fs.existsSync(appPath)) fail('src/App.tsx não encontrado; nenhuma alteração realizada.');
if (!fs.existsSync(rel('src', 'pages', 'whatsapp', 'armazenamento', 'services', 'storageService.ts'))) fail('storageService.ts não encontrado.');

const currentSource = read(oldPath);
const currentApp = read(appPath);
const oldRef = /(['"`])([^'"`\r\n]*\/armazenamento\/services\/CentralArmazenamento)(\1)/g;
let matches = 0;
const newApp = currentApp.replace(oldRef, (_whole, quote, specifier) => {
  matches++;
  return quote + specifier.replace('/armazenamento/services/CentralArmazenamento', '/armazenamento/pages/CentralArmazenamento') + quote;
});
if (matches !== 1) fail(`Esperávamos 1 referência em App.tsx, mas encontramos ${matches}. Envie o trecho de App.tsx para revisão antes de prosseguir.`);
if (!/from\s*['"]\.\/storageService['"]/.test(currentSource)) fail('Import esperado de ./storageService não encontrado. Operação cancelada.');
if (/from\s*['"]\.\.\/services\/storageService['"]/.test(currentSource)) fail('Import de storageService já está ajustado. Revise o estado antes de executar.');
const newSource = currentSource.replace(/(from\s*['"])\.\/storageService(['"])/g, '$1../services/storageService$2');
if (newSource === currentSource) fail('O import de storageService não pôde ser atualizado.');

console.log('\nMIGRAÇÃO-PILOTO: ARMAZENAMENTO');
console.log('Mover: src/pages/whatsapp/armazenamento/services/CentralArmazenamento.tsx');
console.log('  para: src/pages/whatsapp/armazenamento/pages/CentralArmazenamento.tsx');
console.log('Ajustar: import de storageService dentro do componente');
console.log('Ajustar: 1 referência em src/App.tsx');

if (!apply) {
  console.log('\nPRÉVIA CONCLUÍDA. Nenhum arquivo foi alterado.');
  console.log('Para executar: node .\\migrar-armazenamento.cjs --apply');
  process.exit(0);
}

// Não mexer na main nem em alterações locais já existentes.
try {
  const branch = cp.execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
  if (!branch || ['main', 'master'].includes(branch)) fail('Crie/entre numa branch de refatoração antes de aplicar. Branch atual: ' + (branch || '(desconhecida)'));
  const changes = cp.execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' }).trim();
  if (changes) fail('Há alterações rastreadas não commitadas. Faça commit ou restaure antes de executar:\n' + changes);
} catch (error) {
  if (error.status === 1) throw error;
  fail('Não foi possível verificar as condições do Git. Nenhuma alteração realizada.');
}

let created = false;
try {
  fs.mkdirSync(path.dirname(newPath), { recursive: true });
  fs.writeFileSync(newPath, newSource, { flag: 'wx' });
  created = true;
  fs.writeFileSync(appPath, newApp);
  fs.unlinkSync(oldPath);
  console.log('\nSUCESSO: arquivo movido e imports ajustados.');
  console.log('Valide: npm run build');
  console.log('Revise: git diff -- src/App.tsx');
  console.log('Se precisar desfazer antes de commitar: git restore src/App.tsx src/pages/whatsapp/armazenamento/services/CentralArmazenamento.tsx');
  console.log('e remova somente o novo arquivo: Remove-Item .\\src\\pages\\whatsapp\\armazenamento\\pages\\CentralArmazenamento.tsx');
} catch (error) {
  // Fonte antiga permanece intacta até a última operação.
  try { fs.writeFileSync(appPath, currentApp); } catch {}
  if (created && fs.existsSync(oldPath)) { try { fs.unlinkSync(newPath); } catch {} }
  fail('Falha durante a execução; tentativa de restauração aplicada. Detalhe: ' + error.message);
}

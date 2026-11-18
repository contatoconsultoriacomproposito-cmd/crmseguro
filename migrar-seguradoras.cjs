/**
 * SeguroCRM — migracao estrutural pontual de Seguradoras.
 * Na raiz: node .\migrar-seguradoras.cjs [--apply]
 * Sem --apply: simulacao sem qualquer escrita.
 * Nao publica nada e nao toca no backend.
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const abs = p => path.join(root, ...p.split('/'));
const from = 'src/pages/whatsapp/pages/seguradoras/SeguradorasLista.tsx';
const to = 'src/pages/whatsapp/pages/seguradoras/pages/SeguradorasLista.tsx';
const app = 'src/App.tsx';
const apply = process.argv.includes('--apply');
const fail = msg => { console.error('\nERRO: ' + msg); process.exit(1); };
const read = p => fs.readFileSync(abs(p), 'utf8');

for (const p of [from, app]) if (!fs.existsSync(abs(p))) fail('Arquivo obrigatorio nao encontrado: ' + p);
if (fs.existsSync(abs(to))) fail('Arquivo de destino ja existe: ' + to);
const source = read(from);
const appOriginal = read(app);

// Sao os imports relativos conhecidos pelo diagnostico. Abortar se a versao
// atual possuir outros imports relativos, evitando deixar referencias quebradas.
const importSpecs = [...source.matchAll(/\b(?:from\s*|import\s*\(|import\s*)(['"])(\.{1,2}\/[^'"\r\n]+)\1/g)].map(m => m[2]);
const expected = new Set(['../../../../lib/supabaseClient', '../../../../auth/AuthContext']);
const inesperados = [...new Set(importSpecs)].filter(spec => !expected.has(spec));
if (inesperados.length) fail('Imports relativos nao previstos em SeguradorasLista.tsx: ' + inesperados.join(', '));
for (const spec of expected) {
  if (!importSpecs.includes(spec)) fail('Import esperado nao foi encontrado: ' + spec + '. Revise antes de migrar.');
}

// Como a pagina desce um nivel, ambos os imports sobem um nivel adicional.
let movedSource = source;
for (const spec of expected) {
  const next = '../' + spec;
  movedSource = movedSource.split(spec).join(next);
}

// Referencia conhecida de App.tsx. Aceita aspas simples ou duplas e sem extensao.
const ref = /(['"])([^'"\r\n]*\/seguradoras\/SeguradorasLista(?:\.tsx)?)(\1)/g;
let refs = 0;
const appUpdated = appOriginal.replace(ref, (match, quote, spec) => {
  refs++;
  return quote + spec.replace('/seguradoras/SeguradorasLista', '/seguradoras/pages/SeguradorasLista') + quote;
});
if (refs !== 1) fail('Esperavamos exatamente uma referencia a SeguradorasLista em src/App.tsx; encontramos ' + refs);

console.log('\nMIGRACAO-PILOTO: SEGURADORAS');
console.log('Mover: ' + from);
console.log('  para: ' + to);
console.log('Ajustar: 2 imports relativos dentro da pagina');
console.log('Ajustar: 1 import no src/App.tsx');

if (!apply) {
  console.log('\nPREVIA CONCLUIDA. Nenhum arquivo alterado.');
  console.log('Para aplicar: node .\\migrar-seguradoras.cjs --apply');
  process.exit(0);
}

let branch, status;
try {
  branch = cp.execFileSync('git', ['branch','--show-current'], {cwd:root,encoding:'utf8'}).trim();
  status = cp.execFileSync('git', ['status','--porcelain','--untracked-files=no'], {cwd:root,encoding:'utf8'}).trim();
} catch (err) { fail('Nao foi possivel verificar o Git: ' + err.message); }
if (branch !== 'refactor/reorganizacao-estrutura') fail('Branch inesperada: ' + branch + '. Use refactor/reorganizacao-estrutura.');
if (status) fail('Ha alteracoes rastreadas nao commitadas. Resolva antes de aplicar:\n' + status);

let destWritten = false;
let appWritten = false;
try {
  fs.mkdirSync(path.dirname(abs(to)), {recursive:true});
  fs.writeFileSync(abs(to), movedSource, {flag:'wx'});
  destWritten = true;
  fs.writeFileSync(abs(app), appUpdated);
  appWritten = true;
  fs.unlinkSync(abs(from));
  console.log('\nSUCESSO: pagina movida e imports atualizados.');
  console.log('Proximo teste: npm run build');
  console.log('Depois: testar Gestao > Seguradoras no localhost.');
  console.log('Nao use git add .; vamos registrar apenas os arquivos desta migracao.');
} catch (err) {
  if (appWritten) { try { fs.writeFileSync(abs(app), appOriginal); } catch {} }
  if (destWritten && fs.existsSync(abs(from))) { try { fs.unlinkSync(abs(to)); } catch {} }
  fail('Migracao interrompida; tentativa de restauracao feita: ' + err.message);
}

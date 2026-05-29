import { PainelMarketingProvider } from './context/PainelMarketingContext';
import { Linha1PublicoAlvo } from './componentes/Linha1PublicoAlvo';
import { Linha2Coluna1Campanhas } from './componentes/Linha2Coluna1Campanhas';
import { Linha2Coluna2Disparos } from './componentes/Linha2Coluna2Disparos';
import { Linha2Coluna3Auditoria } from './componentes/Linha2Coluna3Auditoria';
import { Linha3BotaoDisparo } from './componentes/Linha3BotaoDisparo';
import { Linha4Midias } from './componentes/Linha4Midias';

export default function CampanhasClientes() {
  return (
    <PainelMarketingProvider>
      <div className="w-full min-h-screen bg-slate-100 p-4 md:p-6 space-y-6 font-sans antialiased text-gray-800">
        
        {/* TOPO DO PAINEL / TÍTULO DE CONTEXTO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-xs border border-gray-100 gap-2">
          <div className="text-left">
            <h1 className="text-lg font-black tracking-tight text-slate-900">
              🎛️ Central de Automação & Triggers de Marketing
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Gestão integrada de campanhas recorrentes, termometria de leads e disparos massivos via Edge Functions.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border text-xs font-medium text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Servidores Supabase & Resend Online
          </div>
        </div>

        {/* ------------------------------------------------------------------
            LINHA 1: DEFINIÇÃO DE PÚBLICO ALVO (CRM / TERMOMETRIA / CSV)
           ------------------------------------------------------------------ */}
        <section className="w-full">
          <Linha1PublicoAlvo />
        </section>

        {/* ------------------------------------------------------------------
            LINHA 2: MATRIZ DE ESTRUTURAÇÃO (CAMPANHAS > DISPAROS > LOGS)
           ------------------------------------------------------------------ */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {/* Coluna 1: Campanhas Mães */}
          <Linha2Coluna1Campanhas />

          {/* Coluna 2: Histórico de Disparos Filhos */}
          <Linha2Coluna2Disparos />

          {/* Coluna 3: Auditoria e Métricas Realtime */}
          <Linha2Coluna3Auditoria />
        </section>

        {/* ------------------------------------------------------------------
            LINHA 3: CENTRALIZADOR DE VALIDAÇÃO E GATILHO DE ENVIO
           ------------------------------------------------------------------ */}
        <section className="w-full">
          <Linha3BotaoDisparo />
        </section>

        {/* ------------------------------------------------------------------
            LINHA 4: GALERIA E BANCO DE MÍDIAS CORPORATIVAS
           ------------------------------------------------------------------ */}
        <section className="w-full">
          <Linha4Midias />
        </section>

      </div>
    </PainelMarketingProvider>
  );
}
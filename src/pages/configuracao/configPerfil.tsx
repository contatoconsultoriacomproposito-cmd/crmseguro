// src/pages/configuracao/configPerfil.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { toast } from 'sonner';
import { 
  User, Building2, Globe, Save, Loader2, 
  Instagram, Facebook, MessageCircle, ShieldCheck, Calendar 
} from 'lucide-react';

// --- INTERFACES PARA TYPESCRIPT ---
interface DadosPessoais {
  nome_completo: string;
  telefone: string;
  avatar_url: string;
}

interface DadosEmpresa {
  razao_social: string;
  cnpj: string;
  website: string;
  instagram: string;
  facebook: string;
  whatsapp_comercial: string;
  logotipo_url: string;
  plano: string;
  status_pagamento: string;
  data_expiracao: string;
}

export default function ConfigPerfil() {
  const { userProfile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'pessoal' | 'empresa' | 'plano'>('pessoal');
  const [loading, setLoading] = useState(false);

  // Estados dos formulários
  const [dadosPessoais, setDadosPessoais] = useState<DadosPessoais>({
    nome_completo: '',
    telefone: '',
    avatar_url: ''
  });

  const [dadosEmpresa, setDadosEmpresa] = useState<DadosEmpresa>({
    razao_social: '',
    cnpj: '',
    website: '',
    instagram: '',
    facebook: '',
    whatsapp_comercial: '',
    logotipo_url: '',
    plano: 'FREE',
    status_pagamento: 'ATIVO',
    data_expiracao: ''
  });

  // Carregamento de dados
  useEffect(() => {
    if (userProfile) {
      setDadosPessoais({
        nome_completo: userProfile.nome_completo || '',
        telefone: userProfile.telefone || '',
        avatar_url: userProfile.avatar_url || ''
      });
      if (userProfile?.tipo_usuario === 'CORRETORA') {
        carregarDadosEmpresa();
      }
    }
  }, [userProfile]);

  const carregarDadosEmpresa = async () => {
    if (!userProfile?.id) return;
    
    const { data } = await supabase
      .from('tab_corretora_config')
      .select('*')
      .eq('id', userProfile.id)
      .single();

    if (data) {
      setDadosEmpresa({
        razao_social: data.razao_social || '',
        cnpj: data.cnpj || '',
        website: data.website || '',
        instagram: data.instagram || '',
        facebook: data.facebook || '',
        whatsapp_comercial: data.whatsapp_comercial || '',
        logotipo_url: data.logotipo_url || '',
        plano: data.plano || 'FREE',
        status_pagamento: data.status_pagamento || 'ATIVO',
        data_expiracao: data.data_expiracao || ''
      });
    }
  };

  const salvarDadosPessoais = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('usuarios_perfis')
        .update({
          nome_completo: dadosPessoais.nome_completo,
          telefone: dadosPessoais.telefone,
          avatar_url: dadosPessoais.avatar_url
        })
        .eq('id', userProfile?.id);

      if (error) throw error;
      await refreshProfile();
      toast.success("Perfil pessoal atualizado!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const salvarDadosEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tab_corretora_config')
        .upsert({
          id: userProfile?.id,
          razao_social: dadosEmpresa.razao_social,
          cnpj: dadosEmpresa.cnpj,
          website: dadosEmpresa.website,
          instagram: dadosEmpresa.instagram,
          facebook: dadosEmpresa.facebook,
          whatsapp_comercial: dadosEmpresa.whatsapp_comercial,
          logotipo_url: dadosEmpresa.logotipo_url
        });

      if (error) throw error;
      toast.success("Dados da corretora atualizados!");
    } catch (error: any) {
      toast.error("Erro ao salvar empresa: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Configurações</h1>
        <p className="text-slate-500 mb-8">Gerencie suas informações e seu plano.</p>

        {/* NAVEGAÇÃO POR ABAS */}
        <div className="flex flex-wrap gap-2 mb-8 bg-slate-200/50 p-1 rounded-2xl w-fit">
          <TabButton 
            active={activeTab === 'pessoal'} 
            onClick={() => setActiveTab('pessoal')} 
            icon={<User size={18} />} 
            label="Perfil Pessoal" 
          />
          {userProfile?.tipo_usuario === 'CORRETORA' && (
            <>
              <TabButton 
                active={activeTab === 'empresa'} 
                onClick={() => setActiveTab('empresa')} 
                icon={<Building2 size={18} />} 
                label="Minha Corretora" 
              />
              <TabButton 
                active={activeTab === 'plano'} 
                onClick={() => setActiveTab('plano')} 
                icon={<ShieldCheck size={18} />} 
                label="Plano" 
              />
            </>
          )}
        </div>

        {/* CONTEÚDO: PESSOAL */}
        {activeTab === 'pessoal' && (
          <form onSubmit={salvarDadosPessoais} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup 
                label="Nome Completo" 
                value={dadosPessoais.nome_completo} 
                onChange={(v: string) => setDadosPessoais({...dadosPessoais, nome_completo: v})} 
                placeholder="Seu nome"
              />
              <InputGroup 
                label="Telefone / WhatsApp" 
                value={dadosPessoais.telefone} 
                onChange={(v: string) => setDadosPessoais({...dadosPessoais, telefone: v})} 
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="mt-8 flex justify-end">
              <SubmitButton loading={loading} label="SALVAR ALTERAÇÕES" />
            </div>
          </form>
        )}

        {/* CONTEÚDO: EMPRESA */}
        {activeTab === 'empresa' && (
          <form onSubmit={salvarDadosEmpresa} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <InputGroup 
                  label="Razão Social" 
                  value={dadosEmpresa.razao_social} 
                  onChange={(v: string) => setDadosEmpresa({...dadosEmpresa, razao_social: v})} 
                />
              </div>
              <InputGroup label="CNPJ" value={dadosEmpresa.cnpj} onChange={(v: string) => setDadosEmpresa({...dadosEmpresa, cnpj: v})} />
              <InputGroup label="WhatsApp Comercial" value={dadosEmpresa.whatsapp_comercial} onChange={(v: string) => setDadosEmpresa({...dadosEmpresa, whatsapp_comercial: v})} icon={<MessageCircle size={18} />} />
              <InputGroup label="Website" value={dadosEmpresa.website} onChange={(v: string) => setDadosEmpresa({...dadosEmpresa, website: v})} icon={<Globe size={18} />} />
              <InputGroup label="Instagram" value={dadosEmpresa.instagram} onChange={(v: string) => setDadosEmpresa({...dadosEmpresa, instagram: v})} icon={<Instagram size={18} />} />
              <InputGroup label="Facebook" value={dadosEmpresa.facebook} onChange={(v: string) => setDadosEmpresa({...dadosEmpresa, facebook: v})} icon={<Facebook size={18} />} />
            </div>
            <div className="mt-8 flex justify-end">
              <SubmitButton loading={loading} label="SALVAR DADOS EMPRESARIAIS" />
            </div>
          </form>
        )}

        {/* CONTEÚDO: PLANO */}
        {activeTab === 'plano' && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 uppercase italic">Meu Plano Atual</h3>
              <div className="px-6 py-2 bg-blue-600 text-white rounded-full font-black text-sm">{dadosEmpresa.plano}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PlanCard label="Status" value={dadosEmpresa.status_pagamento} icon={<ShieldCheck className="text-emerald-500" />} />
              <PlanCard label="Expiração" value={dadosEmpresa.data_expiracao ? new Date(dadosEmpresa.data_expiracao).toLocaleDateString() : 'Vitalício'} icon={<Calendar className="text-blue-500" />} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- COMPONENTES AUXILIARES TIPADOS ---

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
        active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon} {label}
    </button>
  );
}

interface InputGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}

function InputGroup({ label, value, onChange, placeholder, icon }: InputGroupProps) {
  return (
    <div>
      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-4 text-slate-300">{icon}</div>}
        <input
          type="text"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className={`w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all ${icon ? 'pl-12' : ''}`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-4 rounded-2xl flex items-center gap-2 transition-all disabled:opacity-50"
    >
      {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
      {label}
    </button>
  );
}

function PlanCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-4">
      <div className="p-3 bg-white rounded-2xl shadow-sm">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{label}</p>
        <p className="text-sm font-bold text-slate-700">{value}</p>
      </div>
    </div>
  );
}
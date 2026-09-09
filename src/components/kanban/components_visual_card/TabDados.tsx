import { useState, useEffect } from 'react';
import { 
  Building2, 
  User, 
  MapPin, 
  FileText, 
  Users, 
  Calendar, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Plus, 
  Phone,
  ShieldCheck,
  Star
} from 'lucide-react';
import { atualizarClienteV2, excluirClienteV2 } from '../../../pages/clientes/clienteServiceV2';

interface TabDadosProps {
  cliente: any;
  usuarioLogado?: any;
  corretoresDisponiveis?: any[];
  onUpdate?: () => void;
  onDelete?: () => void;
}

export const TabDados = ({ 
  cliente, 
  usuarioLogado,
  corretoresDisponiveis = [],
  onUpdate,
  onDelete
}: TabDadosProps) => {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Garante desserialização profunda caso o dado venha encapsulado em string textificada no banco
  const parseJsonSafe = (dado: any, padrao: any) => {
    if (!dado) return padrao;
    let atual = dado;
    while (typeof atual === 'string') {
      try {
        atual = JSON.parse(atual);
      } catch {
        break;
      }
    }
    return Array.isArray(padrao) 
      ? (Array.isArray(atual) ? atual : padrao)
      : (typeof atual === 'object' && atual !== null ? atual : padrao);
  };

  const formatarDataHora = (dataString: string) => {
    if (!dataString) return '--/--/----';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (cliente) {
      const isPF = cliente.tipo_cliente === 'PF';
      const dadosCompPF = parseJsonSafe(cliente.dados_complementares_pf, {});
      const dadosCompPJ = parseJsonSafe(cliente.dados_complementares_pj, {});

      setFormData({
        tipoCliente: cliente.tipo_cliente || 'PF',
        cpfCnpj: cliente.cpf_cnpj || '',
        nomeRazaoSocial: cliente.nome_razao_social || cliente.razao_social || cliente.nome || '',
        nomeFantasia: cliente.nome_fantasia || '',
        corretor_id: cliente.corretor_id || '',
        cnaePrincipal: cliente.cnae_principal || '',
        situacaoCadastral: cliente.situacao_cadastral || 'ATIVA',
        cep: cliente.cep || '',
        logradouro: cliente.logradouro || '',
        numero: cliente.numero || '',
        bairro: cliente.bairro || '',
        municipio: cliente.municipio || '',
        uf: cliente.uf || '',
        complemento: cliente.complemento || '',
        contatos: parseJsonSafe(cliente.contatos, []),
        socios: parseJsonSafe(cliente.socios, []),
        
        // Dados Específicos PF
        modoCadastro: isPF ? (dadosCompPF.modo_cadastro || 'COMPLETO') : (dadosCompPJ.modo_cadastro || 'RAPIDO'),
        naturalidade: dadosCompPF.naturalidade || '',
        pep: dadosCompPF.pep ?? false,

        // Dados Específicos PJ
        porte: dadosCompPJ.porte || '',
        dataAbertura: dadosCompPJ.data_abertura || '',
        matrizFilial: dadosCompPJ.matriz_filial || '',
        capitalSocial: dadosCompPJ.capital_social || '',
        naturezaJuridica: dadosCompPJ.natureza_juridica || '',
        opcaoPeloMei: dadosCompPJ.opcao_pelo_mei ?? false,
        opcaoPeloSimples: dadosCompPJ.opcao_pelo_simples ?? false,

        dadosReceita: {} // Evita duplicar objetos grandes desnecessários
      });
    }
  }, [cliente, modoEdicao]);

  if (!cliente) return null;

  const isPJ = (modoEdicao ? formData.tipoCliente : cliente.tipo_cliente) === 'PJ';

  const handleChange = (campo: string, valor: any) => {
    setFormData((prev: any) => ({ ...prev, [campo]: valor }));
  };

  // Handlers Contatos com Schema Estrito
  const handleContatoChange = (index: number, campo: string, valor: any) => {
    const novosContatos = [...(formData.contatos || [])];
    novosContatos[index] = { ...novosContatos[index], [campo]: valor };
    setFormData((prev: any) => ({ ...prev, contatos: novosContatos }));
  };

  const setContatoPrincipal = (index: number) => {
    const novosContatos = (formData.contatos || []).map((contato: any, i: number) => ({
      ...contato,
      principal: i === index
    }));
    setFormData((prev: any) => ({ ...prev, contatos: novosContatos }));
  };

  const adicionarContato = () => {
    const novoContato = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      nome: '',
      sexo: '',
      email: '',
      telefone: '',
      principal: (formData.contatos || []).length === 0,
      data_nascimento: '',
      cargo_parentesco: ''
    };
    setFormData((prev: any) => ({
      ...prev,
      contatos: [...(prev.contatos || []), novoContato]
    }));
  };

  const removerContato = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      contatos: prev.contatos.filter((_: any, i: number) => i !== index)
    }));
  };

  // Handlers Sócios com Schema Estrito
  const handleSocioChange = (index: number, campo: string, valor: string) => {
    const novosSocios = [...(formData.socios || [])];
    novosSocios[index] = { ...novosSocios[index], [campo]: valor };
    setFormData((prev: any) => ({ ...prev, socios: novosSocios }));
  };

  const handleSalvar = async () => {
    try {
      setSaving(true);
      await atualizarClienteV2(cliente.id, formData);
      setModoEdicao(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      alert('Erro ao salvar as alterações do cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async () => {
    const nomeCliente = cliente.nome_razao_social || cliente.razao_social || cliente.nome || 'este cliente';
    if (window.confirm(`Tem certeza que deseja excluir "${nomeCliente}"?`)) {
      try {
        const sucesso = await excluirClienteV2(cliente.id);
        if (sucesso) {
          if (onDelete) onDelete();
          if (onUpdate) onUpdate();
        } else {
          alert('Erro ao excluir cliente.');
        }
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
      }
    }
  };

  const listaSocios = modoEdicao ? formData.socios : parseJsonSafe(cliente.socios, []);
  const listaContatos = modoEdicao ? formData.contatos : parseJsonSafe(cliente.contatos, []);
  
  return (
    <div className="space-y-6 text-slate-700 dark:text-zinc-300 text-xs">
      
      {/* BARRA DE AÇÕES TOPO */}
      <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 flex justify-between items-center">
        <span className="font-bold text-slate-500 uppercase text-[10px]">
          {modoEdicao ? 'Modo de Edição Ativo' : 'Visualização do Cadastro'}
        </span>

        <div className="flex gap-2">
          {modoEdicao ? (
            <>
              <button
                type="button"
                onClick={() => setModoEdicao(false)}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg text-xs font-bold transition-colors"
              >
                <X size={14} />
                <span>Cancelar</span>
              </button>
              <button
                type="button"
                onClick={handleSalvar}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
              >
                <Save size={14} />
                <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleExcluir}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors"
              >
                <Trash2 size={14} />
                <span>Excluir</span>
              </button>
              <button
                type="button"
                onClick={() => setModoEdicao(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                <Edit3 size={14} />
                <span>Editar Dados</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* SEÇÃO 1: DADOS IDENTIFICADORES */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 font-black text-[10px] uppercase text-slate-400">
            {isPJ ? <Building2 size={14} /> : <User size={14} />}
            <span>Identificação do Cliente ({modoEdicao ? formData.tipoCliente : (cliente.tipo_cliente || 'PF')})</span>
          </div>

          {modoEdicao && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400">Tipo:</label>
              <select
                value={formData.tipoCliente}
                onChange={(e) => handleChange('tipoCliente', e.target.value)}
                className="p-1 border rounded bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-bold"
              >
                <option value="PF">Pessoa Física (PF)</option>
                <option value="PJ">Pessoa Jurídica (PJ)</option>
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <span className="font-bold text-slate-400 block text-[9px] uppercase">
              {isPJ ? 'Razão Social' : 'Nome Completo'}
            </span>
            {modoEdicao ? (
              <input
                type="text"
                value={formData.nomeRazaoSocial}
                onChange={(e) => handleChange('nomeRazaoSocial', e.target.value)}
                className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-bold"
              />
            ) : (
              <p className="font-black text-slate-800 dark:text-white uppercase">{cliente.nome_razao_social || cliente.razao_social || cliente.nome || '-'}</p>
            )}
          </div>

          {isPJ && (
            <div>
              <span className="font-bold text-slate-400 block text-[9px] uppercase">Nome Fantasia</span>
              {modoEdicao ? (
                <input
                  type="text"
                  value={formData.nomeFantasia}
                  onChange={(e) => handleChange('nomeFantasia', e.target.value)}
                  className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-bold"
                />
              ) : (
                <p className="font-bold text-slate-700 dark:text-zinc-200 uppercase">{cliente.nome_fantasia || '-'}</p>
              )}
            </div>
          )}

          <div>
            <span className="font-bold text-slate-400 block text-[9px] uppercase">{isPJ ? 'CNPJ' : 'CPF'}</span>
            {modoEdicao ? (
              <input
                type="text"
                value={formData.cpfCnpj}
                onChange={(e) => handleChange('cpfCnpj', e.target.value)}
                className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-bold"
              />
            ) : (
              <p className="font-bold text-slate-700 dark:text-zinc-200">{cliente.cpf_cnpj || '-'}</p>
            )}
          </div>

          {isPJ && (
            <>
              <div>
                <span className="font-bold text-slate-400 block text-[9px] uppercase">Situação Cadastral</span>
                {modoEdicao ? (
                  <input
                    type="text"
                    value={formData.situacaoCadastral}
                    onChange={(e) => handleChange('situacaoCadastral', e.target.value)}
                    className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-bold uppercase"
                  />
                ) : (
                  <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase">
                    {cliente.situacao_cadastral || 'NÃO INFORMADA'}
                  </span>
                )}
              </div>

              <div className="md:col-span-2">
                <span className="font-bold text-slate-400 block text-[9px] uppercase">CNAE Principal</span>
                {modoEdicao ? (
                  <input
                    type="text"
                    value={formData.cnaePrincipal}
                    onChange={(e) => handleChange('cnaePrincipal', e.target.value)}
                    className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-medium"
                  />
                ) : (
                  <p className="font-medium text-slate-600 dark:text-zinc-400 uppercase">{cliente.cnae_principal || '-'}</p>
                )}
              </div>
            </>
          )}

          {corretoresDisponiveis.length > 0 && (
            <div>
              <span className="font-bold text-slate-400 block text-[9px] uppercase">Corretor Responsável</span>
              {modoEdicao ? (
                <select
                  value={formData.corretor_id}
                  onChange={(e) => handleChange('corretor_id', e.target.value)}
                  className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-bold"
                >
                  <option value="">Selecione um corretor...</option>
                  {corretoresDisponiveis.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nome || c.email}</option>
                  ))}
                </select>
              ) : (
                <p className="font-bold text-slate-700 dark:text-zinc-200">
                  {corretoresDisponiveis.find((c: any) => c.id === cliente.corretor_id)?.nome || cliente.corretor_id || '-'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO 2: ENDEREÇO */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800 font-black text-[10px] uppercase text-slate-400">
          <MapPin size={14} />
          <span>Endereço</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <span className="font-bold text-slate-400 block text-[9px] uppercase">Logradouro</span>
            {modoEdicao ? (
              <input
                type="text"
                value={formData.logradouro}
                onChange={(e) => handleChange('logradouro', e.target.value)}
                className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-bold"
              />
            ) : (
              <p className="font-bold text-slate-700 dark:text-zinc-200 uppercase">{cliente.logradouro || '-'}</p>
            )}
          </div>

          <div>
            <span className="font-bold text-slate-400 block text-[9px] uppercase">Número</span>
            {modoEdicao ? (
              <input
                type="text"
                value={formData.numero}
                onChange={(e) => handleChange('numero', e.target.value)}
                className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-bold"
              />
            ) : (
              <p className="font-bold text-slate-700 dark:text-zinc-200">{cliente.numero || '-'}</p>
            )}
          </div>

          <div>
            <span className="font-bold text-slate-400 block text-[9px] uppercase">Complemento</span>
            {modoEdicao ? (
              <input
                type="text"
                value={formData.complemento}
                onChange={(e) => handleChange('complemento', e.target.value)}
                className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-medium"
              />
            ) : (
              <p className="font-medium text-slate-600 dark:text-zinc-400 uppercase">{cliente.complemento || '-'}</p>
            )}
          </div>

          <div>
            <span className="font-bold text-slate-400 block text-[9px] uppercase">Bairro</span>
            {modoEdicao ? (
              <input
                type="text"
                value={formData.bairro}
                onChange={(e) => handleChange('bairro', e.target.value)}
                className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-medium"
              />
            ) : (
              <p className="font-medium text-slate-600 dark:text-zinc-400 uppercase">{cliente.bairro || '-'}</p>
            )}
          </div>

          <div>
            <span className="font-bold text-slate-400 block text-[9px] uppercase">Município</span>
            {modoEdicao ? (
              <input
                type="text"
                value={formData.municipio}
                onChange={(e) => handleChange('municipio', e.target.value)}
                className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-bold"
              />
            ) : (
              <p className="font-bold text-slate-700 dark:text-zinc-200 uppercase">{cliente.municipio || '-'}</p>
            )}
          </div>

          <div>
            <span className="font-bold text-slate-400 block text-[9px] uppercase">UF</span>
            {modoEdicao ? (
              <input
                type="text"
                maxLength={2}
                value={formData.uf}
                onChange={(e) => handleChange('uf', e.target.value.toUpperCase())}
                className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-bold uppercase"
              />
            ) : (
              <p className="font-bold text-slate-700 dark:text-zinc-200 uppercase">{cliente.uf || '-'}</p>
            )}
          </div>

          <div>
            <span className="font-bold text-slate-400 block text-[9px] uppercase">CEP</span>
            {modoEdicao ? (
              <input
                type="text"
                value={formData.cep}
                onChange={(e) => handleChange('cep', e.target.value)}
                className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 font-medium"
              />
            ) : (
              <p className="font-medium text-slate-600 dark:text-zinc-400">{cliente.cep || '-'}</p>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: CONTATOS E PESSOAS VINCULADAS */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 font-black text-[10px] uppercase text-slate-400">
            <Phone size={14} />
            <span>Contatos e Pessoas Vinculadas</span>
            </div>
            {modoEdicao && (
            <button
                type="button"
                onClick={adicionarContato}
                className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/50 transition-colors"
            >
                <Plus size={12} /> Adicionar Contato
            </button>
            )}
        </div>

        {listaContatos.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
            {listaContatos.map((contato: any, idx: number) => (
                <div key={contato.id || idx} className="p-3.5 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200 dark:border-zinc-800 relative space-y-3">
                {modoEdicao ? (
                    <>
                    {/* BARRA SUPERIOR DO CARD */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-700 pb-2">
                        <button
                        type="button"
                        onClick={() => setContatoPrincipal(idx)}
                        className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                            contato.principal
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-zinc-700 dark:text-zinc-400'
                        }`}
                        >
                        <Star size={10} className={contato.principal ? 'fill-amber-500 text-amber-500' : ''} />
                        {contato.principal ? 'Principal' : 'Marcar como Principal'}
                        </button>

                        <button
                        type="button"
                        onClick={() => removerContato(idx)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Remover contato"
                        >
                        <Trash2 size={13} />
                        </button>
                    </div>

                    {/* 1. CAMPOS PRINCIPAIS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <div className="md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Nome Completo</label>
                        <input
                            type="text"
                            placeholder="Nome da pessoa"
                            value={contato.nome || ''}
                            onChange={(e) => handleContatoChange(idx, 'nome', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                        />
                        </div>

                        <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Cargo / Parentesco</label>
                        <input
                            type="text"
                            placeholder="Ex: Gerente, Cônjuge, Sócio"
                            value={contato.cargo_parentesco || ''}
                            onChange={(e) => handleContatoChange(idx, 'cargo_parentesco', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                        />
                        </div>

                        <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Telefone / WhatsApp</label>
                        <input
                            type="text"
                            placeholder="(00) 00000-0000"
                            value={contato.telefone || ''}
                            onChange={(e) => handleContatoChange(idx, 'telefone', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                        />
                        </div>

                        <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">E-mail</label>
                        <input
                            type="email"
                            placeholder="email@dominio.com"
                            value={contato.email || ''}
                            onChange={(e) => handleContatoChange(idx, 'email', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                        />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Sexo</label>
                            <select
                            value={contato.sexo || ''}
                            onChange={(e) => handleContatoChange(idx, 'sexo', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 font-medium"
                            >
                            <option value="">Selecione...</option>
                            <option value="M">Masculino</option>
                            <option value="F">Feminino</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">D. Nascimento</label>
                            <input
                            type="date"
                            value={contato.data_nascimento || ''}
                            onChange={(e) => handleContatoChange(idx, 'data_nascimento', e.target.value)}
                            className="w-full p-1 border rounded text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700"
                            />
                        </div>
                        </div>
                    </div>

                    {/* BOTÕES DE EXPANSÃO / AÇÕES EXTRAS */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200 dark:border-zinc-700/80">
                        <button
                        type="button"
                        onClick={() => handleContatoChange(idx, 'mostrarEndereco', !contato.mostrarEndereco)}
                        className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded border transition-colors ${
                            contato.mostrarEndereco || contato.cep || contato.logradouro
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                            : 'bg-white text-slate-600 border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700'
                        }`}
                        >
                        <MapPin size={11} />
                        {contato.mostrarEndereco ? 'Ocultar Endereço' : '+ Endereço'}
                        </button>

                        <button
                        type="button"
                        onClick={() => handleContatoChange(idx, 'mostrarDocs', !contato.mostrarDocs)}
                        className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded border transition-colors ${
                            contato.mostrarDocs || contato.cpf || contato.rg
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                            : 'bg-white text-slate-600 border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700'
                        }`}
                        >
                        <FileText size={11} />
                        {contato.mostrarDocs ? 'Ocultar Documentos' : '+ Documentos / Outros'}
                        </button>
                    </div>

                    {/* 2. SUBSEÇÃO: ENDEREÇO DA PESSOA */}
                    {(contato.mostrarEndereco || contato.cep || contato.logradouro) && (
                        <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-2">
                        <p className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <MapPin size={10} /> Endereço do Contato
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">CEP</label>
                            <input
                                type="text"
                                placeholder="00000-000"
                                value={contato.cep || ''}
                                onChange={(e) => handleContatoChange(idx, 'cep', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800"
                            />
                            </div>
                            <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">UF</label>
                            <input
                                type="text"
                                maxLength={2}
                                placeholder="UF"
                                value={contato.uf || ''}
                                onChange={(e) => handleContatoChange(idx, 'uf', e.target.value.toUpperCase())}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 uppercase"
                            />
                            </div>
                            <div className="col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Município</label>
                            <input
                                type="text"
                                placeholder="Cidade"
                                value={contato.municipio || ''}
                                onChange={(e) => handleContatoChange(idx, 'municipio', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800"
                            />
                            </div>
                            <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Bairro</label>
                            <input
                                type="text"
                                placeholder="Bairro"
                                value={contato.bairro || ''}
                                onChange={(e) => handleContatoChange(idx, 'bairro', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800"
                            />
                            </div>
                            <div className="col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Logradouro</label>
                            <input
                                type="text"
                                placeholder="Rua, Av..."
                                value={contato.logradouro || ''}
                                onChange={(e) => handleContatoChange(idx, 'logradouro', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800"
                            />
                            </div>
                            <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Número</label>
                            <input
                                type="text"
                                placeholder="Nº"
                                value={contato.numero || ''}
                                onChange={(e) => handleContatoChange(idx, 'numero', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800"
                            />
                            </div>
                            <div className="col-span-2 md:col-span-4">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Complemento</label>
                            <input
                                type="text"
                                placeholder="Apto, Bloco, etc."
                                value={contato.complemento || ''}
                                onChange={(e) => handleContatoChange(idx, 'complemento', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800"
                            />
                            </div>
                        </div>
                        </div>
                    )}

                    {/* 3. SUBSEÇÃO: DOCUMENTOS E OUTROS DADOS PF */}
                    {(contato.mostrarDocs || contato.cpf || contato.rg) && (
                        <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-indigo-100 dark:border-indigo-900/30 space-y-2">
                        <p className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <FileText size={10} /> Documentos e Dados Pessoais
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">CPF</label>
                            <input
                                type="text"
                                placeholder="000.000.000-00"
                                value={contato.cpf || ''}
                                onChange={(e) => handleContatoChange(idx, 'cpf', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800"
                            />
                            </div>
                            <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">RG</label>
                            <input
                                type="text"
                                placeholder="Número do RG"
                                value={contato.rg || ''}
                                onChange={(e) => handleContatoChange(idx, 'rg', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800"
                            />
                            </div>
                            <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Órgão Emissor</label>
                            <input
                                type="text"
                                placeholder="Ex: SSP/SP"
                                value={contato.rg_orgao || ''}
                                onChange={(e) => handleContatoChange(idx, 'rg_orgao', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800"
                            />
                            </div>
                            <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Data Emissão</label>
                            <input
                                type="date"
                                value={contato.data_emissao_rg || ''}
                                onChange={(e) => handleContatoChange(idx, 'data_emissao_rg', e.target.value)}
                                className="w-full p-1 border rounded text-xs bg-slate-50 dark:bg-zinc-800"
                            />
                            </div>
                            <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Estado Civil</label>
                            <select
                                value={contato.estado_civil || ''}
                                onChange={(e) => handleContatoChange(idx, 'estado_civil', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 font-medium"
                            >
                                <option value="">Selecione...</option>
                                <option value="SOLTEIRO">Solteiro(a)</option>
                                <option value="CASADO">Casado(a)</option>
                                <option value="DIVORCIADO">Divorciado(a)</option>
                                <option value="VIUVO">Viúvo(a)</option>
                                <option value="UNIAO_ESTAVEL">União Estável</option>
                            </select>
                            </div>
                            <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Naturalidade</label>
                            <input
                                type="text"
                                placeholder="Cidade/UF"
                                value={contato.naturalidade || ''}
                                onChange={(e) => handleContatoChange(idx, 'naturalidade', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800"
                            />
                            </div>
                            <div className="col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Ocupação / Profissão</label>
                            <input
                                type="text"
                                placeholder="Ex: Engenheiro, Empresário"
                                value={contato.ocupacao || ''}
                                onChange={(e) => handleContatoChange(idx, 'ocupacao', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800"
                            />
                            </div>
                            <div className="col-span-2 md:col-span-4">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Outras Observações</label>
                            <input
                                type="text"
                                placeholder="Informações adicionais..."
                                value={contato.outros || ''}
                                onChange={(e) => handleContatoChange(idx, 'outros', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800"
                            />
                            </div>
                        </div>
                        </div>
                    )}
                    </>
                ) : (
                    /* MODO VISUALIZAÇÃO */
                    <>
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="font-black text-slate-800 dark:text-white uppercase">{contato.nome || 'Contato sem nome'}</p>
                        {contato.cargo_parentesco && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded">
                            {contato.cargo_parentesco}
                            </span>
                        )}
                        </div>
                        {contato.principal && (
                        <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full font-bold">
                            <Star size={10} className="fill-amber-500 text-amber-500" /> Principal
                        </span>
                        )}
                    </div>

                    {/* DADOS DE CONTATO DIRETO */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] pt-2 border-t border-slate-200 dark:border-zinc-700">
                        <div><span className="text-slate-400">Tel:</span> <strong className="text-slate-700 dark:text-zinc-200">{contato.telefone || '-'}</strong></div>
                        <div><span className="text-slate-400">E-mail:</span> <strong className="text-slate-700 dark:text-zinc-200">{contato.email || '-'}</strong></div>
                        <div><span className="text-slate-400">Sexo:</span> <strong className="text-slate-700 dark:text-zinc-200">{contato.sexo || '-'}</strong></div>
                        <div><span className="text-slate-400">Nascimento:</span> <strong className="text-slate-700 dark:text-zinc-200">{contato.data_nascimento || '-'}</strong></div>
                    </div>

                    {/* ENDEREÇO SE HOUVER */}
                    {(contato.logradouro || contato.municipio || contato.cep) && (
                        <div className="text-[10px] bg-white dark:bg-zinc-900 p-2 rounded border border-slate-100 dark:border-zinc-800 space-y-0.5">
                        <span className="text-slate-400 font-bold block text-[9px] uppercase">Endereço:</span>
                        <p className="text-slate-700 dark:text-zinc-300">
                            {[
                            contato.logradouro && `${contato.logradouro}${contato.numero ? `, ${contato.numero}` : ''}`,
                            contato.complemento,
                            contato.bairro,
                            contato.municipio && `${contato.municipio}${contato.uf ? ` - ${contato.uf}` : ''}`,
                            contato.cep && `CEP: ${contato.cep}`
                            ].filter(Boolean).join(' | ')}
                        </p>
                        </div>
                    )}

                    {/* DOCUMENTOS / PESSOAIS SE HOUVER */}
                    {(contato.cpf || contato.rg || contato.estado_civil || contato.ocupacao) && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] bg-white dark:bg-zinc-900 p-2 rounded border border-slate-100 dark:border-zinc-800">
                        {contato.cpf && <div><span className="text-slate-400">CPF:</span> <strong className="text-slate-700 dark:text-zinc-200">{contato.cpf}</strong></div>}
                        {contato.rg && <div><span className="text-slate-400">RG:</span> <strong className="text-slate-700 dark:text-zinc-200">{contato.rg} {contato.rg_orgao ? `(${contato.rg_orgao})` : ''}</strong></div>}
                        {contato.estado_civil && <div><span className="text-slate-400">Est. Civil:</span> <strong className="text-slate-700 dark:text-zinc-200">{contato.estado_civil}</strong></div>}
                        {contato.ocupacao && <div><span className="text-slate-400">Ocupação:</span> <strong className="text-slate-700 dark:text-zinc-200">{contato.ocupacao}</strong></div>}
                        </div>
                    )}
                    </>
                )}
                </div>
            ))}
            </div>
        ) : (
            <p className="text-slate-400 italic text-[11px]">Nenhum contato registrado.</p>
        )}
        </div>

      {/* SEÇÃO 4: SÓCIOS (PJ APENAS) */}
        {isPJ && (
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 font-black text-[10px] uppercase text-slate-400">
                <Users size={14} />
                <span>Quadro de Sócios</span>
            </div>
            <span className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold">
                Qtd: {cliente.qtde_socios || listaSocios.length}
            </span>
            </div>

            {listaSocios.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {listaSocios.map((socio: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200 dark:border-zinc-800 relative space-y-2">
                    {modoEdicao ? (
                    <>
                        <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Nome do Sócio</label>
                        <input
                            type="text"
                            placeholder="Nome do Sócio"
                            value={socio.nome || ''}
                            onChange={(e) => handleSocioChange(idx, 'nome', e.target.value)}
                            className="w-full p-1.5 border border-slate-200 dark:border-zinc-700 rounded text-xs font-bold bg-white dark:bg-zinc-900 uppercase"
                        />
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">CPF / CNPJ</label>
                            <input
                            type="text"
                            placeholder="CPF/CNPJ"
                            value={socio.cpf_cnpj || ''}
                            onChange={(e) => handleSocioChange(idx, 'cpf_cnpj', e.target.value)}
                            className="w-full p-1 border border-slate-200 dark:border-zinc-700 rounded text-[10px] bg-white dark:bg-zinc-900"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Qualificação</label>
                            <input
                            type="text"
                            placeholder="Ex: Sócio"
                            value={socio.qualificacao || ''}
                            onChange={(e) => handleSocioChange(idx, 'qualificacao', e.target.value)}
                            className="w-full p-1 border border-slate-200 dark:border-zinc-700 rounded text-[10px] bg-white dark:bg-zinc-900"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Faixa Etária</label>
                            <input
                            type="text"
                            placeholder="Ex: Entre 31 a 40 anos"
                            value={socio.faixa_etaria || ''}
                            onChange={(e) => handleSocioChange(idx, 'faixa_etaria', e.target.value)}
                            className="w-full p-1 border border-slate-200 dark:border-zinc-700 rounded text-[10px] bg-white dark:bg-zinc-900"
                            />
                        </div>
                        </div>
                    </>
                    ) : (
                    <>
                        <p className="font-black text-slate-800 dark:text-white uppercase">{socio.nome || 'Sócio sem nome'}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">{socio.qualificacao || 'Qualificação não informada'}</p>
                        <div className="flex gap-3 text-[9px] text-slate-400 pt-1 border-t border-slate-100 dark:border-zinc-800">
                        {socio.cpf_cnpj && <span>Doc: <strong className="font-mono text-slate-600 dark:text-zinc-300">{socio.cpf_cnpj}</strong></span>}
                        {socio.faixa_etaria && <span>Faixa Etária: <strong className="text-slate-600 dark:text-zinc-300">{socio.faixa_etaria}</strong></span>}
                        </div>
                    </>
                    )}
                </div>
                ))}
            </div>
            ) : (
            <p className="text-slate-400 italic text-[11px]">Nenhum sócio registrado na consulta oficial do CNPJ.</p>
            )}
        </div>
        )}

      {/* SEÇÃO 6: METADADOS DE SISTEMA */}
      <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-100 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-2 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Calendar size={12} />
          <span>Criado em: <strong className="text-slate-600 dark:text-zinc-300">{formatarDataHora(cliente.criado_em)}</strong></span>
        </div>

        {usuarioLogado && (
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span>Sessão: <strong className="text-slate-600 dark:text-zinc-300">{usuarioLogado.nome || usuarioLogado.email || 'Usuário Autenticado'}</strong></span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Calendar size={12} />
          <span>Atualizado em: <strong className="text-slate-600 dark:text-zinc-300">{formatarDataHora(cliente.atualizado_em)}</strong></span>
        </div>
      </div>

    </div>
  );
};
import React from 'react';
import type { ChangeEvent } from 'react';
import { usePainelMarketing } from '../context/PainelMarketingContext';
import type { ClientePublico } from '../context/PainelMarketingContext';

export const Linha1PublicoAlvo: React.FC = () => {
  const {
    abaAtiva,
    subAbaQualificados,
    clientesFiltrados,
    idsLeadsSelecionados,
    loadingClientes,
    clientesCRM,
    clientesQualificados,
    clientesCSV,
    setAbaAtiva,
    setSubAbaQualificados,
    setClientesCSV,
    toggleSelecionarCliente,
    toggleSelecionarTodos
  } = usePainelMarketing();

  // ------------------------------------------------------------------
  // INTERPRETADOR NATIVO DE ARQUIVO CSV
  // ------------------------------------------------------------------
  const handleImportarCSV = (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = (evento) => {
      const texto = evento.target?.result as string;
      if (!texto) return;

      const linhas = texto.split(/\r?\n/);
      const listaTemp: ClientePublico[] = [];

      for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;

        // CORRIGIDO: de 'line.split' para 'linha.split'
        const colunas = linha.split(/[,;]/);
        if (colunas.length < 2) continue;

        const nomeTratado = colunas[0]?.replace(/^["']|["']$/g, '').trim() || 'Cliente CSV';
        const emailTratado = colunas[1]?.replace(/^["']|["']$/g, '').trim().toLowerCase() || '';

        if (emailTratado && emailTratado.includes('@')) {
          listaTemp.push({
            nome: nomeTratado,
            email: emailTratado,
            telefone_whats: colunas[2]?.replace(/^["']|["']$/g, '').trim() || null,
            origem: 'csv'
          });
        }
      }
      setClientesCSV(listaTemp);
    };
    reader.readAsText(arquivo, 'UTF-8');
  };

  const todosMarcados =
    clientesFiltrados.length > 0 &&
    clientesFiltrados.every((c) =>
      abaAtiva === 'csv' ? idsLeadsSelecionados.includes(c.email) : idsLeadsSelecionados.includes(c.id || '')
    );

  return (
    <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[380px]">
      
      {/* SELETOR DE ABAS SUPERIORES */}
      <div className="flex flex-wrap justify-between items-center border-b pb-2 gap-2">
        <div className="flex gap-1 bg-gray-50 p-1 rounded-lg border">
          <button
            onClick={() => setAbaAtiva('crm')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              abaAtiva === 'crm' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            👥 Base CRM ({clientesCRM.length})
          </button>
          
          <button
            onClick={() => setAbaAtiva('qualificados')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              abaAtiva === 'qualificados' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            🔥 Leads por Termometria ({clientesQualificados.length})
          </button>
          
          <button
            onClick={() => setAbaAtiva('csv')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              abaAtiva === 'csv' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📁 Importar Lista CSV {clientesCSV.length > 0 && `(${clientesCSV.length})`}
          </button>
        </div>

        {/* CONTROLES EXCLUSIVOS DA ABA CSV */}
        {abaAtiva === 'csv' && (
          <label className="cursor-pointer bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
            📥 Escolher Arquivo .CSV
            <input type="file" accept=".csv" onChange={handleImportarCSV} className="hidden" />
          </label>
        )}
      </div>

      {/* SELETOR DE SUB-ABAS DINÂMICAS DE TERMOMETRIA */}
      {abaAtiva === 'qualificados' && (
        <div className="flex gap-4 my-2 px-2 py-1 bg-amber-50/50 rounded-lg border border-amber-100">
          <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-blue-600">
            <input
              type="radio"
              name="termometria"
              checked={subAbaQualificados === 'frio'}
              onChange={() => setSubAbaQualificados('frio')}
              className="text-blue-600 focus:ring-blue-400"
            />
            ❄️ Frios
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-orange-600">
            <input
              type="radio"
              name="termometria"
              checked={subAbaQualificados === 'morno'}
              onChange={() => setSubAbaQualificados('morno')}
              className="text-orange-600 focus:ring-orange-400"
            />
            🌤️ Mornos
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-red-600">
            <input
              type="radio"
              name="termometria"
              checked={subAbaQualificados === 'quente'}
              onChange={() => setSubAbaQualificados('quente')}
              className="text-red-600 focus:ring-red-400"
            />
            🔥 Quentes
          </label>
        </div>
      )}

      {/* LISTAGEM GRID/TABELA DO PÚBLICO */}
      <div className="flex-1 overflow-y-auto mt-2 border rounded-lg custom-scrollbar">
        {loadingClientes ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <p className="text-xs text-gray-400 animate-pulse">Sincronizando registros com a base de dados...</p>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <p className="text-xs text-gray-400">
              {abaAtiva === 'csv' 
                ? 'Nenhum lead carregado. Certifique-se de que o CSV possui "nome,email,telefone" a partir da segunda linha.'
                : 'Nenhum registro encontrado para o filtro selecionado.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-gray-50 sticky top-0 border-b font-semibold text-gray-600 z-10">
              <tr>
                <th className="p-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={todosMarcados}
                    onChange={(e) => toggleSelecionarTodos(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                  />
                </th>
                <th className="p-2.5">Nome do Lead / Razão Social</th>
                <th className="p-2.5">E-mail Cadastrado</th>
                <th className="p-2.5 w-40">Telefone Celular</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {clientesFiltrados.map((cliente, index) => {
                const chaveUnica = abaAtiva === 'csv' ? cliente.email : (cliente.id || '');
                const estaMarcado = idsLeadsSelecionados.includes(chaveUnica);

                return (
                  <tr 
                    key={`${chaveUnica}-${index}`}
                    className={`hover:bg-slate-50/80 transition-colors ${estaMarcado ? 'bg-blue-50/40' : ''}`}
                  >
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={estaMarcado}
                        onChange={() => toggleSelecionarCliente(chaveUnica)}
                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                      />
                    </td>
                    <td className="p-2 font-medium max-w-xs truncate">{cliente.nome}</td>
                    <td className="p-2 text-gray-500 font-mono">{cliente.email}</td>
                    <td className="p-2 text-gray-400 font-mono">{cliente.telefone_whats || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      
      {/* INDICADOR RESUMIDO DE RODAPÉ */}
      <div className="text-[11px] text-gray-400 pt-2 flex justify-between items-center px-1">
        <span>Listando {clientesFiltrados.length} contatos</span>
        <span className="font-bold text-indigo-600">
          {idsLeadsSelecionados.length} destinatários marcados para envio
        </span>
      </div>
    </div>
  );
};
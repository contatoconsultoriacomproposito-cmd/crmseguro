import React, { useState } from 'react';

interface CnaeMultiSelectProps {
  cnaesDisponiveis: { cnae_principal: string; count: number }[];
  selecionados: string[];
  onChange: (novosSelecionados: string[]) => void;
}

export const CnaeMultiSelect: React.FC<CnaeMultiSelectProps> = ({
  cnaesDisponiveis,
  selecionados,
  onChange,
}) => {
  const [aberto, setAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');

  // Filtra as opções de acordo com o texto digitado
  const opcoesFiltradas = cnaesDisponiveis.filter((item) =>
    item.cnae_principal.toLowerCase().includes(termoBusca.toLowerCase())
  );

  const toggleOpcao = (cnae: string) => {
    if (selecionados.includes(cnae)) {
      onChange(selecionados.filter((item) => item !== cnae));
    } else {
      onChange([...selecionados, cnae]);
    }
  };

  const selecionarTodosFiltrados = () => {
    const todosFormatados = Array.from(
      new Set([...selecionados, ...opcoesFiltradas.map((o) => o.cnae_principal)])
    );
    onChange(todosFormatados);
  };

  const limparSelecao = () => {
    onChange([]);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Botão Seletor Principal */}
        <button
        type="button"
        onClick={() => setAberto(!aberto)}
        style={{
            width: '100%',
            padding: '6px 8px', // Reduzido para alinhar a altura
            fontSize: '11px',   // Fonte menor idêntica aos outros inputs
            color: '#334155',
            textAlign: 'left',
            background: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxSizing: 'border-box',
        }}
        >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selecionados.length === 0
            ? 'Nicho / CNAE (Todos)'
            : `${selecionados.length} CNAE(s) selecionado(s)`}
        </span>
        <small style={{ fontSize: '9px', marginLeft: '4px', color: '#64748b' }}>
            {aberto ? '▲' : '▼'}
        </small>
        </button>

      {/* Dropdown Flutuante */}
      {aberto && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '8px',
            maxHeight: '220px', // Reduzido para ficar mais compacto
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Campo de Pesquisa em Tempo Real */}
          <input
            type="text"
            placeholder="Digite para buscar CNAE ou Nicho..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            style={{
              padding: '4px 8px',
              marginBottom: '6px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              width: '100%',
              fontSize: '11px', // Fonte menor
              boxSizing: 'border-box',
            }}
          />

          {/* Ações Rápidas */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '6px',
              fontSize: '11px', // Fonte menor
            }}
          >
            <button
              type="button"
              onClick={selecionarTodosFiltrados}
              style={{ border: 'none', background: 'none', color: '#0066cc', cursor: 'pointer', padding: 0 }}
            >
              Marcar visíveis
            </button>
            <button
              type="button"
              onClick={limparSelecao}
              style={{ border: 'none', background: 'none', color: '#cc0000', cursor: 'pointer', padding: 0 }}
            >
              Limpar seleção
            </button>
          </div>

          {/* Lista com Checkboxes e Contadores */}
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {opcoesFiltradas.length === 0 ? (
              <div style={{ padding: '6px', color: '#888', fontSize: '11px' }}>
                Nenhum CNAE encontrado.
              </div>
            ) : (
              opcoesFiltradas.map((item) => {
                const isChecked = selecionados.includes(item.cnae_principal);
                return (
                  <label
                    key={item.cnae_principal}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '3px 6px', // Padding compacto por linha
                      cursor: 'pointer',
                      fontSize: '11px', // Fonte compacta igual aos inputs
                      backgroundColor: isChecked ? '#f0f7ff' : 'transparent',
                      borderRadius: '3px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, paddingRight: '8px', overflow: 'hidden' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOpcao(item.cnae_principal)}
                        style={{ cursor: 'pointer', transform: 'scale(0.85)' }}
                      />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.cnae_principal}
                      </span>
                    </div>
                    {/* Badge do Contador */}
                    <span
                      style={{
                        backgroundColor: '#e0e0e0',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        color: '#333',
                        fontWeight: 'bold',
                      }}
                    >
                      {item.count}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
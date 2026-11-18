# Diagnóstico de arquitetura — núcleo WhatsApp

> Relatório observacional: nenhuma alteração nos fontes. Relações identificadas por importações estáticas e imports dinâmicos literais; não é uma prova de ausência de dependência.

- Raiz analisada: `src/pages/whatsapp`
- Arquivos do núcleo: **252**
- Entradas externas examinadas: **3** (src/App.tsx, src/main.tsx, src/components/Sidebar.tsx)
- Referências de projeto resolvidas: **729**
- Dependências saindo do núcleo: **120**
- Dependências entrando a partir das entradas conhecidas: **30**
- Imports locais/aliases não resolvidos: **1**
- Ciclos internos detectados: **0**

## Arquivos mais importados dentro do escopo

| Arquivo | Importações recebidas | Módulo |
|---|---:|---|
| `src/pages/whatsapp/central-clientes/types/centralClientes.ts` | 33 | central-clientes |
| `src/pages/whatsapp/hooks/usePermissoes.ts` | 27 | hooks |
| `src/pages/whatsapp/pages/comissoes/types/comissoes.ts` | 22 | pages/comissoes |
| `src/pages/whatsapp/types/whatsapp.ts` | 22 | types |
| `src/pages/whatsapp/equipe/components/PermissaoUI.tsx` | 18 | equipe |
| `src/pages/whatsapp/pages/financeiro/types/financeiro.ts` | 18 | pages/financeiro |
| `src/pages/whatsapp/pages/propostas/types/propostas.ts` | 15 | pages/propostas |
| `src/pages/whatsapp/pages/financeiro/services/financeiroService.ts` | 12 | pages/financeiro |
| `src/pages/whatsapp/pages/comissoes/services/comissoesCalculos.ts` | 11 | pages/comissoes |
| `src/pages/whatsapp/services/storageQuotaError.ts` | 10 | services |
| `src/pages/whatsapp/pages/financeiro/services/financeiroCalculos.ts` | 9 | pages/financeiro |
| `src/pages/whatsapp/automation/types/automationTypes.ts` | 8 | automation |
| `src/pages/whatsapp/pages/comissoes/services/comissoesService.ts` | 8 | pages/comissoes |
| `src/pages/whatsapp/equipe/components/permissoesTypes.ts` | 7 | equipe |
| `src/pages/whatsapp/hooks/useWhatsApp.ts` | 7 | hooks |
| `src/pages/whatsapp/pages/agenda/types/agenda.ts` | 7 | pages/agenda |
| `src/pages/whatsapp/pages/propostas/services/propostasService.ts` | 7 | pages/propostas |
| `src/pages/whatsapp/tarefas/types/tarefas.ts` | 7 | tarefas |
| `src/pages/whatsapp/central-clientes/hooks/useAcessoClientes.ts` | 6 | central-clientes |
| `src/pages/whatsapp/providers/transports/WhatsAppTransport.ts` | 6 | providers |

## Serviços consumidos por outros módulos (observados)

- `src/pages/whatsapp/armazenamento/services/CentralArmazenamento.tsx` — consumidores: [EXTERNO]
- `src/pages/whatsapp/armazenamento/services/storageService.ts` — consumidores: central-clientes
- `src/pages/whatsapp/automation/services/automationConfigService.ts` — consumidores: pages/WhatsAppAutomacoes.tsx
- `src/pages/whatsapp/automation/services/preQualificationExecutor.ts` — consumidores: components
- `src/pages/whatsapp/automation/services/routingExecutor.ts` — consumidores: components
- `src/pages/whatsapp/pages/agenda/services/agendaClienteService.ts` — consumidores: central-clientes | components
- `src/pages/whatsapp/pages/agenda/services/agendaService.ts` — consumidores: central-clientes | components
- `src/pages/whatsapp/pages/comissoes/services/comissoesService.ts` — consumidores: pages/propostas
- `src/pages/whatsapp/pages/financeiro/services/financeiroCalculos.ts` — consumidores: central-clientes
- `src/pages/whatsapp/pages/financeiro/services/financeiroPermissoes.ts` — consumidores: pages/propostas
- `src/pages/whatsapp/pages/financeiro/services/financeiroService.ts` — consumidores: central-clientes | components | pages/propostas
- `src/pages/whatsapp/services/WhatsAppService.ts` — consumidores: hooks
- `src/pages/whatsapp/services/callRecordingService.ts` — consumidores: components
- `src/pages/whatsapp/services/crmAssistenciaService.ts` — consumidores: central-clientes | components | pages/assistencias
- `src/pages/whatsapp/services/crmBrasilApi.ts` — consumidores: automation
- `src/pages/whatsapp/services/crmClienteService.ts` — consumidores: automation | central-clientes | components
- `src/pages/whatsapp/services/crmSinistroService.ts` — consumidores: central-clientes | components | pages/assistencias | pages/sinistros
- `src/pages/whatsapp/services/crmWhatsAppClienteService.ts` — consumidores: components | documentos
- `src/pages/whatsapp/services/dapiCallService.ts` — consumidores: components
- `src/pages/whatsapp/services/equipeService.ts` — consumidores: hooks
- `src/pages/whatsapp/services/instanciaUsuariosService.ts` — consumidores: hooks
- `src/pages/whatsapp/services/novaConversaService.ts` — consumidores: components
- `src/pages/whatsapp/services/quickReplyService.ts` — consumidores: components
- `src/pages/whatsapp/services/storageQuotaError.ts` — consumidores: central-clientes | components | documentos | pages/assistencias | pages/sinistros | providers
- `src/pages/whatsapp/services/whatsappAgendaService.ts` — consumidores: components
- `src/pages/whatsapp/services/whatsappCallService.ts` — consumidores: components
- `src/pages/whatsapp/services/whatsappContatosService.ts` — consumidores: components | pages/WhatsAppContatos.tsx
- `src/pages/whatsapp/services/whatsappTaskService.ts` — consumidores: components
- `src/pages/whatsapp/services/whatsappTimelineMapper.ts` — consumidores: components
- `src/pages/whatsapp/services/whatsappTimelineService.ts` — consumidores: hooks
- `src/pages/whatsapp/tarefas/services/tarefasService.ts` — consumidores: components

## Dependências externas diretas ao núcleo

- `src/auth/AuthContext.tsx`
- `src/lib/supabaseClient.ts`
- `src/services/brasilApi.ts`
- `src/utils/masks.ts`
- `src/utils/validarCPF.ts`

## Cuidados na interpretação

- **SEM_CONSUMIDOR_NESTE_ESCOPO não significa arquivo órfão**: outros arquivos legados não foram examinados.
- **LOCAL_OBSERVADO não garante exclusividade**: apenas as entradas externas explicitamente listadas foram inspecionadas.
- O diagnóstico não rastreia strings de rotas, `import()` com caminho calculado, URLs de assets, CSS ou referências do backend.
- Nenhum arquivo é classificado para exclusão ou movimentação automática.
- Antes de mover qualquer arquivo, confirmar o grafo completo de consumidores do arquivo específico.

## Arquivos CSV

- `01-inventario.csv`: arquivos, módulos e sinais de compartilhamento
- `02-dependencias.csv`: imports resolvidos (quem importa quem)
- `03-importacoes-nao-resolvidas.csv`: caminhos locais que exigem conferência
- `04-ciclos.csv`: dependências circulares observadas
- `05-pacotes-externos.csv`: imports de pacotes externos

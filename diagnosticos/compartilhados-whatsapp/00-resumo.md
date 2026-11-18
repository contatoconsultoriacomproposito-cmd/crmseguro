# Auditoria de arquivos compartilhados — SeguroCRM

> Diagnóstico de importações estáticas/dinâmicas com especificadores literais. Não decide sozinho o destino de arquivos.

- Arquivos TS/TSX/JS/JSX lidos em src: **368**
- Arquivos candidatos na raiz compartilhada: **64**
- Referências recebidas pelos candidatos: **163**
- Referências a partir de arquivos fora de src/pages/whatsapp: **2**
- Imports relativos não resolvidos no núcleo: **0**

## Indicadores (não são decisões de movimentação)

- CONSUMIDO_NA_RAIZ: 38
- CONSUMO_CONCENTRADO: 10
- SEM_IMPORTS_ESTATICOS_DETECTADOS: 2
- USO_TRANSVERSAL: 14

## 35 arquivos mais importados

| Arquivo | Referências | Áreas consumidoras |
|---|---:|---|
| `src/pages/whatsapp/hooks/usePermissoes.ts` | 27 | EXTERNO_SRC, PAGINAS_WHATSAPP, RAIZ_COMPARTILHADA, agenda, assistencias, contas-pagar, contas-receber, financeiro, fluxo-caixa, propostas, renovacoes, sinistros, tarefas |
| `src/pages/whatsapp/types/whatsapp.ts` | 22 | PAGINAS_WHATSAPP, RAIZ_COMPARTILHADA, automacoes |
| `src/pages/whatsapp/services/storageQuotaError.ts` | 10 | RAIZ_COMPARTILHADA, assistencias, clientes, documentos, sinistros |
| `src/pages/whatsapp/hooks/useWhatsApp.ts` | 7 | PAGINAS_WHATSAPP, RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/providers/transports/WhatsAppTransport.ts` | 6 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/services/crmClienteService.ts` | 5 | RAIZ_COMPARTILHADA, automacoes, clientes |
| `src/pages/whatsapp/services/crmSinistroService.ts` | 5 | RAIZ_COMPARTILHADA, assistencias, clientes, sinistros |
| `src/pages/whatsapp/services/crmWhatsAppClienteService.ts` | 5 | RAIZ_COMPARTILHADA, documentos |
| `src/pages/whatsapp/services/crmAssistenciaService.ts` | 4 | RAIZ_COMPARTILHADA, assistencias, clientes |
| `src/pages/whatsapp/services/whatsappContatosService.ts` | 4 | PAGINAS_WHATSAPP, RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/hooks/useConversations.ts` | 3 | PAGINAS_WHATSAPP, RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/hooks/useStorageCommercial.ts` | 3 | RAIZ_COMPARTILHADA, assistencias, sinistros |
| `src/pages/whatsapp/providers/SupabaseWhatsAppProvider.ts` | 3 | RAIZ_COMPARTILHADA, automacoes |
| `src/pages/whatsapp/services/whatsappAgendaService.ts` | 3 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/services/whatsappCallService.ts` | 3 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/utils/parsers.ts` | 3 | RAIZ_COMPARTILHADA, clientes |
| `src/pages/whatsapp/components/FiltroSituacoes.tsx` | 2 | contas-pagar, contas-receber |
| `src/pages/whatsapp/services/novaConversaService.ts` | 2 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/services/whatsappTimelineService.ts` | 2 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/utils/whatsappPhone.ts` | 2 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/components/CallModal.tsx` | 1 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/components/CallTimelineItem.tsx` | 1 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/components/ChatWindow.tsx` | 1 | PAGINAS_WHATSAPP |
| `src/pages/whatsapp/components/contact-panel/ContactAssistenciasTab.tsx` | 1 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/components/contact-panel/ContactCadastroModal.tsx` | 1 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/components/contact-panel/ContactComissoesTab.tsx` | 1 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/components/contact-panel/ContactContratosTab.tsx` | 1 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/components/contact-panel/ContactDadosTab.tsx` | 1 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/components/contact-panel/ContactFinanceiroTab.tsx` | 1 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/components/contact-panel/ContactHeader.tsx` | 1 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/components/contact-panel/ContactPropostasTab.tsx` | 1 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/components/contact-panel/ContactSinistrosTab.tsx` | 1 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/components/ContactPanel.tsx` | 1 | PAGINAS_WHATSAPP |
| `src/pages/whatsapp/components/ConversationItem.tsx` | 1 | RAIZ_COMPARTILHADA |
| `src/pages/whatsapp/components/ConversationList.tsx` | 1 | PAGINAS_WHATSAPP |

## Observações importantes

- **Não mover** arquivos com base apenas no indicador: um service pode ter dono de domínio e ser consumido por outros módulos.
- Sem imports detectados **não** significa arquivo sem uso: rotas dinâmicas, strings, testes, configuração e código fora de src podem referenciá-lo.
- O diagnóstico lê imports de todo src para localizar consumidores externos, mas só inventaria como candidatos as pastas compartilhadas da raiz do núcleo.
- Imports não resolvidos podem incluir recursos não TypeScript (CSS, imagens, módulos virtuais etc.).
- Para migrar, fazer plano explícito, prévia, build, validação funcional e commit isolado.

## Arquivos gerados

- 00-resumo.md
- 01-inventario-compartilhados.csv
- 02-quem-usa-quem.csv
- 03-imports-relativos-nao-resolvidos.csv

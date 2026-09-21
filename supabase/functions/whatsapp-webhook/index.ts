import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
const META_PHONE_ID = "636770376190002"; 

// Defina o UUID de uma corretora válida cadastrada no seu banco
const DEFAULT_CORRETORA_ID = Deno.env.get("DEFAULT_CORRETORA_ID") ?? "e8d1fdac-fc46-4646-b1f7-33aedee29f3a";

serve(async (req: Request) => {
  const url = new URL(req.url);

  // 1. VALIDAÇÃO DO WEBHOOK (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED com sucesso.");
      return new Response(challenge, { status: 200 });
    } else {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // 2. PROCESSAMENTO DE MENSAGENS (POST)
  if (req.method === "POST") {
    try {
      const body = await req.json();

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      
      if (!supabaseUrl || !supabaseKey) {
        console.error("ERRO GRAVE: Variáveis do Supabase não encontradas!");
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            const value = change.value;

            // CASO A: NOVA MENSAGEM RECEBIDA
            if (value.messages && value.messages.length > 0) {
              const message = value.messages[0];
              const fromPhone = message.from; 
              const messageType = message.type;
              let textContent = messageType === "text" ? message.text.body : `[Mídia: ${messageType}]`;

              console.log(`Nova mensagem de ${fromPhone}: ${textContent}`);

              // A.1 Busca cliente existente dentro do JSONB contatos
              const { data: clientesEncontrados, error: erroBusca } = await supabaseAdmin
                .from("tab_clientes")
                .select("id")
                .filter("contatos", "cs", JSON.stringify([{ valor: fromPhone }]))
                .limit(1);

              if (erroBusca) console.error("Erro ao buscar cliente na tab_clientes:", erroBusca);

              let clienteId = clientesEncontrados?.[0]?.id;

              // A.2 Cria novo cliente se não existir
              if (!clienteId) {
                const contactName = value.contacts?.[0]?.profile?.name || "Lead WhatsApp";
                const { data: novoCliente, error: erroInsertCliente } = await supabaseAdmin
                  .from("tab_clientes")
                  .insert({
                    corretora_id: DEFAULT_CORRETORA_ID,
                    nome_razao_social: contactName,
                    tipo_cliente: "PF",
                    origem: "WHATSAPP",
                    status_kanban: "lead",
                    contatos: [{ tipo: "WHATSAPP", valor: fromPhone }]
                  })
                  .select("id")
                  .single();

                if (erroInsertCliente) {
                  console.error("Erro ao CRIAR cliente na 'tab_clientes':", erroInsertCliente);
                } else {
                  console.log("Novo cliente criado com ID:", novoCliente.id);
                  clienteId = novoCliente?.id;
                }
              }

              // A.3 Grava a interação na tab_interacoes
              if (clienteId) {
                const { error: erroInteracao } = await supabaseAdmin
                  .from("tab_interacoes")
                  .insert({
                    cliente_id: clienteId,
                    corretora_id: DEFAULT_CORRETORA_ID,
                    tipo_acao: "WHATSAPP",
                    relato: `[RECEBIDA] ${textContent}`
                  });

                if (erroInteracao) {
                  console.error("ERRO FATAL AO INSERIR NA tab_interacoes:", erroInteracao);
                } else {
                  console.log("Mensagem salva na tab_interacoes com SUCESSO!");
                }

                // A.4 Resposta Automática via Meta API
                const META_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN") ?? "";
                
                try {
                  const metaResponse = await fetch(`https://graph.facebook.com/v25.0/${META_PHONE_ID}/messages`, {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${META_TOKEN}`,
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      messaging_product: "whatsapp",
                      to: fromPhone,
                      type: "template",
                      template: {
                        name: "hello_world",
                        language: {
                          code: "en_US" // Deve coincidir exatamente com o idioma do seu painel
                        }
                      }
                    })
                  });
                  
                  const metaResult = await metaResponse.json();
                  console.log("RETORNO DA META AO ENVIAR:", JSON.stringify({
                    httpStatus: metaResponse.status,
                    success: metaResponse.ok,
                    response: metaResult,
                  }));
                } catch (metaErr) {
                  console.error("Erro na requisição Fetch para a Meta:", metaErr);
                }
              } else {
                console.error("Não foi possível gravar a interação porque o clienteId é nulo ou indefinido.");
              }
            }

            // CASO B: Atualização de status
            if (value.statuses && value.statuses.length > 0) {
              for (const status of value.statuses) {
                console.log("STATUS WHATSAPP:", JSON.stringify(status));
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ status: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Erro global ao processar webhook:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});
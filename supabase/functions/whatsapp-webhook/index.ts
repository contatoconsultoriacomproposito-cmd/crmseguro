import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
const META_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN") ?? "";

const CORRETORA_ID =
  Deno.env.get("DEFAULT_CORRETORA_ID") ??
  "e8d1fdac-fc46-4646-b1f7-33aedee29f3a";

// ============================================================
// WHATSAPP PHONE NUMBERS AUTORIZADOS
// ============================================================
//
// ATUALMENTE ESTAMOS EM TESTE.
//
// 636770376190002 = NÚMERO DE TESTE
// 620031661201651 = NÚMERO REAL/PESSOAL
//
// IMPORTANTE:
// Enquanto estivermos testando, SOMENTE o número de teste
// pode ser processado pelo CRM.
//
// Quando formos colocar o número real em produção, basta
// adicionar o ID real ao Set.
//
// ============================================================

const ALLOWED_PHONE_IDS = new Set([
  "636770376190002", // TESTE
  // "620031661201651", // PRODUÇÃO - NÃO LIBERAR AGORA
]);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const log = (msg: string, data?: unknown) =>
  data === undefined ? console.log(msg) : console.log(msg, data);

Deno.serve(async (req) => {
  try {
    // ============================================================
    // VALIDAÇÃO META
    // ============================================================

    if (req.method === "GET") {
      const url = new URL(req.url);

      if (
        url.searchParams.get("hub.mode") === "subscribe" &&
        url.searchParams.get("hub.verify_token") === VERIFY_TOKEN
      ) {
        log("✅ Webhook validado pela Meta");

        return new Response(url.searchParams.get("hub.challenge"), {
          status: 200,
        });
      }

      return new Response("Forbidden", {
        status: 403,
      });
    }

    // ============================================================
    // SOMENTE POST
    // ============================================================

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
      });
    }

    // ============================================================
    // RECEBE EVENTO
    // ============================================================

    const body = await req.json();

    const value = body?.entry?.[0]?.changes?.[0]?.value;

    const message = value?.messages?.[0];

    const status = value?.statuses?.[0];

    // ============================================================
    // IDENTIFICA O PHONE NUMBER ID QUE RECEBEU A MENSAGEM
    // ============================================================

    const inboundPhoneId =
      value?.metadata?.phone_number_id ?? null;

    const inboundDisplayPhone =
      value?.metadata?.display_phone_number ?? null;

    // ============================================================
    // LOG DO EVENTO RECEBIDO
    // ============================================================

    log("📡 Evento WhatsApp recebido", {
      phoneId: inboundPhoneId,
      displayPhone: inboundDisplayPhone,
      field: body?.entry?.[0]?.changes?.[0]?.field ?? null,
      hasMessage: !!message,
      hasStatus: !!status,
    });

    // ============================================================
    // SEGURANÇA:
    // PROCESSAR SOMENTE PHONE NUMBER IDs AUTORIZADOS
    // ============================================================
    //
    // Isso impede que mensagens recebidas pelo seu número pessoal
    // sejam gravadas no SeguroCRM enquanto estamos testando.
    //
    // Exemplo:
    //
    // 636770376190002 → continua
    // 620031661201651 → IGNORA
    //
    // ============================================================

    if (
      !inboundPhoneId ||
      !ALLOWED_PHONE_IDS.has(inboundPhoneId)
    ) {
      log("🚫 Evento ignorado - Phone Number ID não autorizado", {
        phoneId: inboundPhoneId,
        displayPhone: inboundDisplayPhone,
      });

      return new Response("EVENT_RECEIVED", {
        status: 200,
      });
    }

    // ============================================================
    // STATUS DE MENSAGEM
    // ============================================================

    if (status) {
      log("📊 Status Meta", {
        id: status.id,
        status: status.status,
        recipient: status.recipient_id,
        errors: status.errors ?? null,
        phoneId: inboundPhoneId,
      });

      return new Response("EVENT_RECEIVED", {
        status: 200,
      });
    }

    // ============================================================
    // EVENTO SEM MENSAGEM
    // ============================================================

    if (!message) {
      log("ℹ️ Evento webhook sem mensagem/status", {
        field: body?.entry?.[0]?.changes?.[0]?.field,
        phoneId: inboundPhoneId,
      });

      return new Response("EVENT_RECEIVED", {
        status: 200,
      });
    }

    // ============================================================
    // IGNORA EVENTOS DO TIPO SYSTEM
    // ============================================================
    //
    // Eventos system não são mensagens comerciais normais.
    // Não devem criar clientes nem gerar interações.
    //
    // ============================================================

    if (message.type === "system") {
      log("ℹ️ Evento system ignorado", {
        from: message.from ?? null,
        phoneId: inboundPhoneId,
        system: message.system ?? null,
        messageId: message.id ?? null,
      });

      return new Response("EVENT_RECEIVED", {
        status: 200,
      });
    }

    // ============================================================
    // DADOS DA MENSAGEM
    // ============================================================

    let fromPhone = String(message.from);

    // Trata números do Brasil para garantir a inclusão do nono dígito (DDD + 8 dígitos -> DDD + 9 + 8 dígitos)
    if (fromPhone.startsWith("55") && fromPhone.length === 12) {
      const ddd = fromPhone.substring(2, 4);
      const numero = fromPhone.substring(4);
      fromPhone = "55" + ddd + "9" + numero;
    }

    const contactName =
      value?.contacts?.[0]?.profile?.name ??
      "Contato WhatsApp";

    const relato =
      message?.text?.body ??
      `[Mensagem ${message.type}]`;

    // ============================================================
    // LOG COMPLETO DA MENSAGEM
    // ============================================================

    log("📩 WhatsApp recebido", {
      from: fromPhone,
      nome: contactName,
      tipo: message.type,
      texto: relato,

      metadata: {
        display_phone_number:
          inboundDisplayPhone,

        phone_number_id:
          inboundPhoneId,
      },

      messageId: message?.id ?? null,
    });

    // ============================================================
    // LOCALIZA CLIENTE
    // ============================================================

    const { data: clientes, error: buscaError } =
      await supabase
        .from("tab_clientes")
        .select("id")
        .eq("corretora_id", CORRETORA_ID)
        .filter(
          "contatos",
          "cs",
          JSON.stringify([
            {
              valor: fromPhone,
            },
          ]),
        )
        .limit(1);

    if (buscaError) {
      throw buscaError;
    }

    let clienteId = clientes?.[0]?.id;

    // ============================================================
    // CRIA CLIENTE
    // ============================================================

    if (!clienteId) {
      log("👤 Cliente não encontrado. Criando...");

      const {
        data: cliente,
        error: criarError,
      } = await supabase
        .from("tab_clientes")
        .insert({
          corretora_id: CORRETORA_ID,
          tipo_cliente: "PF",
          origem: "WHATSAPP",
          nome_razao_social: contactName,
          fase_atendimento: "LEAD",
          status_kanban: "lead",

          contatos: [
            {
              tipo: "WHATSAPP",
              valor: fromPhone,
            },
          ],
        })
        .select("id")
        .single();

      if (criarError) {
        throw criarError;
      }

      clienteId = cliente.id;

      log("✅ Cliente criado", {
        clienteId,
      });
    } else {
      log("👤 Cliente encontrado", {
        clienteId,
      });
    }

    // ============================================================
    // GRAVA INTERAÇÃO
    // ============================================================

    const {
      error: interacaoError,
    } = await supabase
      .from("tab_interacoes")
      .insert({
        cliente_id: clienteId,
        tipo_acao: "WHATSAPP",
        relato,
        corretora_id: CORRETORA_ID,
      });

    if (interacaoError) {
      log(
        "⚠️ Erro ao gravar interação",
        interacaoError,
      );
    } else {
      log("✅ Interação gravada");
    }

    // ============================================================
    // VERIFICA TOKEN META
    // ============================================================

    if (!META_TOKEN) {
      log(
        "⚠️ WHATSAPP_API_TOKEN não configurado.",
      );

      return new Response("EVENT_RECEIVED", {
        status: 200,
      });
    }

    // ============================================================
    // URL DINÂMICA DO WHATSAPP
    // ============================================================
    //
    // NÃO usamos mais:
    //
    // const PHONE_ID = "636770376190002";
    //
    // O próprio evento informa qual número recebeu a mensagem.
    //
    // Isso permite:
    //
    // TESTE:
    // 636770376190002
    //
    // PRODUÇÃO:
    // 620031661201651
    //
    // ============================================================

    const META_URL =
      `https://graph.facebook.com/v25.0/${inboundPhoneId}/messages`;

    // ============================================================
    // PAYLOAD
    // ============================================================

    const payload = {
      messaging_product: "whatsapp",
      to: fromPhone,
      type: "template",
      template: {
        name: "hello_world", // Substitua pelo nome do seu modelo aprovado na Meta
        language: {
          code: "en_US"      // Substitua pelo idioma do modelo (ex: "pt_BR")
        }
      }
    };

    // ============================================================
    // ENVIA RESPOSTA
    // ============================================================

    log("📤 Enviando resposta para Meta", {
      to: fromPhone,

      phoneId: inboundPhoneId,

      displayPhone: inboundDisplayPhone,

      endpoint: META_URL,
    });

    const response = await fetch(META_URL, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${META_TOKEN}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // ============================================================
    // RESULTADO META
    // ============================================================

    log("📨 Resposta Meta", {
      status: response.status,

      ok: response.ok,

      phoneId: inboundPhoneId,

      to: fromPhone,

      data: result,
    });

    return new Response("EVENT_RECEIVED", {
      status: 200,
    });

  } catch (error) {
    console.error(
      "❌ ERRO WHATSAPP WEBHOOK:",
      error,
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 500,

        headers: {
          "Content-Type":
            "application/json",
        },
      },
    );
  }
});


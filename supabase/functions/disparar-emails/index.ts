import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Trata requisições de preflight do CORS (essencial para chamadas do front-end)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    // Suporta tanto o formato antigo (campanha, clientes) quanto o novo higienizado do front
    const campanha = body.campanha || {
      mensagem_email: body.mensagem_email,
      nome_evento: body.nome_evento,
      url_arte_storage: body.url_arte
    }
    
    const listaClientes = body.destinatarios || body.clientes

    if (!campanha || !listaClientes || !Array.isArray(listaClientes)) {
      return new Response(
        JSON.stringify({ error: 'Dados da requisição inválidos. Certifique-se de enviar a lista de destinatários.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`🚀 Processando lote de e-mails para ${listaClientes.length} alvos.`);

    // Regex RFC 5322 oficial simplificado para validar e-mails no padrão email@provedor.com
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Monta e higieniza o array de e-mails usando reduce para evitar sujeira de CSV
    const emailsEmLote = listaClientes.reduce((acc: any[], cliente: any) => {
      if (!cliente || !cliente.email) return acc;

      // 1. Limpeza profunda do e-mail (Anti-sujeira de CSV)
      let emailDestino = String(cliente.email).trim();
      
      // Remove aspas duplas ou simples soltas nas pontas que o Excel/CSV costuma injetar
      emailDestino = emailDestino.replace(/^["']|["']$/g, '').trim();
      
      // Força a string para minúsculo
      emailDestino = emailDestino.toLowerCase();

      // 2. Validação rígida: Se falhar na regex pós-limpeza, descarta o registro para salvar o lote
      if (!emailRegex.test(emailDestino)) {
        console.warn(`⚠️ E-mail ignorado por formato inválido: "${emailDestino}"`);
        return acc;
      }

      // 3. Tratamento seguro do Nome
      let nomeTratado = "Cliente";
      if (cliente.nome) {
        nomeTratado = String(cliente.nome).replace(/^["']|["']$/g, '').trim();
      } else if (cliente.tipo_cliente === 'PF') {
        nomeTratado = cliente.nome || "Cliente";
      } else {
        nomeTratado = cliente.nome_fantasia || cliente.nome || "Cliente";
      }
      
      // 4. Customização do conteúdo do e-mail
      let cuerpoEmailCustomizado = (campanha.mensagem_email || '')
        .replace(/{nome}/gi, nomeTratado)
        .replace(/\n/g, '<br>'); // Converte quebras de linha para HTML

      // Se a campanha tiver uma imagem de arte vinculada, adiciona ao final do HTML
      if (campanha.url_arte_storage) {
        cuerpoEmailCustomizado += `<br><br><img src="${campanha.url_arte_storage}" alt="Arte da Campanha" style="max-width: 100%; height: auto; border-radius: 8px;">`;
      }

      // Adiciona o objeto estruturado ao lote final do Resend
      acc.push({
        from: 'CRM Seguro <notificacoes@segurocrm.com.br>',
        to: [emailDestino],
        subject: `${campanha.nome_evento || 'Informativo'} - Especial para você`,
        html: `
          <div style="font-family: sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            ${cuerpoEmailCustomizado}
          </div>
        `
      });

      return acc;
    }, []);

    if (emailsEmLote.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum cliente elegível com e-mail válido encontrado no lote.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`📦 Enviando ${emailsEmLote.length} e-mails higienizados via Resend API...`);

    // Dispara a requisição em lote para a API do Resend
    const resendResponse = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailsEmLote),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error("❌ Erro retornado pela API do Resend:", resendData)
      throw new Error(resendData.message || 'Erro ao enviar lote no Resend')
    }

    return new Response(
      JSON.stringify({ success: true, total_enviados: emailsEmLote.length, data: resendData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("💥 Erro crítico no catch global da Function:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
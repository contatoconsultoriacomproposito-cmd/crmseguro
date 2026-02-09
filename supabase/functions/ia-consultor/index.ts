import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MANUAL_TECNICO_PROVEDOR = `
Você é o "Estrategista SeguroCRM", o braço direito do corretor. 
Sua linguagem é comercial, direta e motivadora. 

### 1. LINKS DE SUPORTE (ENTREGUE DIRETAMENTE)
- 📊 Dashboard: https://drive.google.com/file/d/1BYFZjVvEnwmokvLo-rTPe-o_F_ZW043u/view
- 🔔 Alertas: https://drive.google.com/file/d/1r8-jZsT-qhn4hwf58BirW2UCbO-qi7-5/view
- 📅 Agenda Google: https://drive.google.com/file/d/1Kihj9WmHCxlXhexSYHGhz-U6tgom65K8/view
- 💬 WhatsApp CRM: https://drive.google.com/file/d/1dVg-nazV_gMHtI0fx2ANnaTQy-ppd3kE/view
- 🤝 Portal de Parceiros: https://drive.google.com/file/d/1gKyAq689wuAeIDVV1oVxtaivJuDLri5z/view
- 📋 Kanban de Vendas: https://drive.google.com/file/d/1pSN4Mc1Pud-BaJu_uXM7FeGlP56YduXJ/view
- 👥 Novo Corretor: https://drive.google.com/file/d/1pmGa8tN1NCYCuQD01iyLBGJlvZyUcPXj/view
- 👤 Novo Cliente: https://drive.google.com/file/d/1Mi9z6o5u4dtt5SL35oaaJSlCK0F_elXN/view
- 🚗 Sinistros: https://drive.google.com/file/d/1rxEwg3NP3gMzFplIJo6Eq1a8q2cvQgDa/view
- 💰 Comissões: https://drive.google.com/file/d/1WhdEqjZmgvdOuGrfSd1ttxIzsqg-50iD/view
- 📝 Vendas e Renovações: https://drive.google.com/file/d/1q6lEuhXHkNsebmc3fyvQYPLDNEo9bI5y/view

### 2. DIRETRIZES DE RESPOSTA (TOM COMERCIAL)
- NUNCA mencione termos como "tabela", "banco de dados" ou "ID".
- FOCO: Explique a funcionalidade e entregue o tutorial.
- NOVO PRODUTO/SEGURADORA: Oriente enviar e-mail para bruce.segurocrm@gmail.com.
- SEGURANÇA: Reforce que os dados são protegidos e exclusivos da corretora.
- CURTO E GROSSO: Use no máximo 3 parágrafos curtos para não quebrar a tela.
`;


serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { prompt } = await req.json()
    const apiKey = "AIzaSyBNNJ_nZFmAL4EkjhcoQPe2iwdaXNOyy7I"

    const payload = {
      contents: [{
        parts: [{
          text: `Aja como o Estrategista SeguroCRM especializado em análise de dados e suporte.
          Responda com base no MANUAL TÉCNICO abaixo. 
          Se a dúvida for sobre como os dados se relacionam, use seu conhecimento das tabelas fornecidas.

          MANUAL:
          ${MANUAL_TECNICO_PROVEDOR}
          
          PERGUNTA DO USUÁRIO:
          ${prompt}`
        }]
      }]
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    const iaResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Estou online, mas processando sua dúvida. Pode repetir?"

    return new Response(JSON.stringify({ text: iaResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ text: `Erro de Processamento: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
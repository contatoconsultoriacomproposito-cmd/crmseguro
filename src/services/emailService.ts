import { Resend } from 'resend';

// Inicializa o Resend buscando a chave que você acabou de salvar no .env.local
const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

interface DadosEmail {
  emailCliente: string;
  nomeCliente: string;
  tituloCampanha: string;
  mensagemHtml: string;
}

/**
 * Função genérica para disparar e-mails de campanhas/aniversários
 */
export async function enviarEmailCampanha({
  emailCliente,
  nomeCliente,
  tituloCampanha,
  mensagemHtml
}: DadosEmail) {
  try {
    // Aqui nós usamos o 'nomeCliente' e a 'mensagemHtml' injetando-os no corpo do e-mail
    const corpoHtmlFormatado = `
      <div style="font-family: sans-serif; color: #333;">
        <h2>Olá, ${nomeCliente}!</h2>
        <div>
          ${mensagemHtml}
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      // Substitua pelo e-mail do seu domínio que foi verificado no Resend
      from: 'Sua Corretora <contato@suacorretora.com.br>', 
      to: [emailCliente],
      subject: tituloCampanha,
      html: corpoHtmlFormatado, // Usando o HTML que agora consome a variável
    });

    if (error) {
      console.error('Erro retornado pelo Resend:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Erro na requisição de e-mail:', err);
    return { success: false, error: err };
  }
}
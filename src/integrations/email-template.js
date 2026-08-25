// src/integrations/email-template.js
// Renderiza o e-mail transacional do Previsível em HTML, na marca e-Rentav.
// Substitui o template externo do Brevo — agora o e-mail vive no repo e é
// enviado pelo Amazon SES. Recebe apenas os dados do entregavel_email + nome/tipo;
// não persiste nada. Fontes Fraunces/IBM Plex não carregam na maioria dos
// clientes de e-mail, então usamos serif/monospace como fallback.

const brl = (n) =>
  "R$ " + new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(n) || 0);
const usd = (n) =>
  "US$ " + new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(n) || 0);
const num = (n) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Number(n) || 0);

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Link do CTA — WhatsApp e-Rentav
const CTA_URL = "https://wa.me/5584991260224";

export const EMAIL_SUBJECT = "Seu calendário de caixa fiscal — Previsível";

/**
 * @param {object} p
 * @param {string} p.nome
 * @param {"RSU"|"Stock option"} p.tipo
 * @param {string} p.janela                 ex.: "2025–2028"
 * @param {number} p.impostoTotalBRL
 * @param {number} p.patrimonioBRL
 * @param {number} p.exposicaoUSD
 * @param {Array<{ano:number,vesta:number,valor_brl:number,imposto_brl:number,reserve_brl:number,obs?:string}>} p.calendario
 * @returns {string} HTML completo do e-mail
 */
export function renderPrevisivelEmailHtml(p) {
  const linhas = (p.calendario || [])
    .map(
      (l) => `
        <tr>
          <td align="left"  style="padding:8px 6px;font-family:'IBM Plex Mono',monospace;font-size:13px;color:#E9E6DE;border-bottom:1px solid rgba(233,230,222,0.08);">${esc(l.ano)}</td>
          <td align="right" style="padding:8px 6px;font-family:'IBM Plex Mono',monospace;font-size:13px;color:rgba(233,230,222,0.8);border-bottom:1px solid rgba(233,230,222,0.08);">${num(l.vesta)}</td>
          <td align="right" style="padding:8px 6px;font-family:'IBM Plex Mono',monospace;font-size:13px;color:rgba(233,230,222,0.8);border-bottom:1px solid rgba(233,230,222,0.08);">${brl(l.valor_brl)}</td>
          <td align="right" style="padding:8px 6px;font-family:'IBM Plex Mono',monospace;font-size:13px;color:rgba(233,230,222,0.8);border-bottom:1px solid rgba(233,230,222,0.08);">${brl(l.imposto_brl)}</td>
          <td align="right" style="padding:8px 6px;font-family:'IBM Plex Mono',monospace;font-size:13px;color:#B08D4C;border-bottom:1px solid rgba(233,230,222,0.08);">${brl(l.reserve_brl)}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Previsível — e-Rentav</title></head>
<body style="margin:0;padding:0;background-color:#0B1A17;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B1A17;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0F211D;border:1px solid rgba(233,230,222,0.14);border-radius:6px;">

  <tr><td style="padding:32px 36px 8px 36px;">
    <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#B08D4C;">e-Rentav · Previsível</span>
  </td></tr>

  <tr><td style="padding:8px 36px 0 36px;">
    <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.25;color:#E9E6DE;">
      ${esc(p.nome)}, aqui está o seu calendário de caixa fiscal.
    </h1>
  </td></tr>

  <tr><td style="padding:16px 36px 0 36px;">
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:rgba(233,230,222,0.72);">
      Com base no seu ${esc(p.tipo)} vestando ao longo de ${esc(p.janela)}, este é o desenho de quando o imposto tende a doer no caixa — e quanto reservar em cada ano.
    </p>
  </td></tr>

  <tr><td style="padding:24px 36px 0 36px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:12px 0;border-top:1px solid rgba(233,230,222,0.14);">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(233,230,222,0.45);">Imposto projetado</span><br>
        <span style="font-family:Georgia,serif;font-size:22px;color:#E9E6DE;">${brl(p.impostoTotalBRL)}</span>
      </td></tr>
      <tr><td style="padding:12px 0;border-top:1px solid rgba(233,230,222,0.14);">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(233,230,222,0.45);">Acréscimo patrimonial bruto</span><br>
        <span style="font-family:Georgia,serif;font-size:22px;color:#E9E6DE;">${brl(p.patrimonioBRL)}</span>
      </td></tr>
      <tr><td style="padding:12px 0;border-top:1px solid rgba(233,230,222,0.14);border-bottom:1px solid rgba(233,230,222,0.14);">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(233,230,222,0.45);">Exposição cambial</span><br>
        <span style="font-family:Georgia,serif;font-size:22px;color:#E9E6DE;">${usd(p.exposicaoUSD)}</span>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:28px 36px 0 36px;">
    <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(233,230,222,0.5);">Calendário de caixa fiscal</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-collapse:collapse;">
      <tr>
        <th align="left"  style="padding:8px 6px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:rgba(233,230,222,0.5);border-bottom:1px solid rgba(233,230,222,0.2);">Ano</th>
        <th align="right" style="padding:8px 6px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:rgba(233,230,222,0.5);border-bottom:1px solid rgba(233,230,222,0.2);">Vesta</th>
        <th align="right" style="padding:8px 6px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:rgba(233,230,222,0.5);border-bottom:1px solid rgba(233,230,222,0.2);">Valor</th>
        <th align="right" style="padding:8px 6px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:rgba(233,230,222,0.5);border-bottom:1px solid rgba(233,230,222,0.2);">Imposto</th>
        <th align="right" style="padding:8px 6px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#B08D4C;border-bottom:1px solid rgba(233,230,222,0.2);">Reservar</th>
      </tr>
      ${linhas}
    </table>
  </td></tr>

  <tr><td style="padding:24px 36px 0 36px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:14px 16px;background-color:rgba(176,141,76,0.08);border-left:3px solid #B08D4C;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:rgba(233,230,222,0.75);">
          <strong style="color:#B08D4C;">Estimativa.</strong> Estes números são uma projeção de cenário. Os valores reais dependem da PTAX na data de cada fato gerador, do carnê-leão mês a mês e do restante do seu patrimônio — e é isso que a e-Rentav apura, com lastro.
        </p>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:24px 36px 0 36px;">
    <p style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:17px;line-height:1.5;color:#E9E6DE;">Isto é a projeção. A apuração é outra história.</p>
    <a href="${CTA_URL}" style="display:inline-block;padding:12px 22px;background-color:#B08D4C;color:#0F211D;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;border-radius:4px;">Quero a apuração do meu caso</a>
  </td></tr>

  <tr><td style="padding:28px 36px 32px 36px;">
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:rgba(233,230,222,0.4);">
      Não guardamos nenhum valor seu — este e-mail foi montado só para te entregar o calendário que você pediu. Método Sem Improviso: o raciocínio, sempre.<br>
      e-Rentav · declaração complexa desde 2016.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

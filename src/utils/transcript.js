function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatContent(msg) {
  let content = escapeHtml(msg.content || "");
  for (const [, attachment] of msg.attachments) {
    if (attachment.contentType?.startsWith("image/")) {
      content += `<br><img src="${escapeHtml(attachment.url)}" alt="attachment" style="max-width:400px">`;
    } else {
      content += `<br><a href="${escapeHtml(attachment.url)}">${escapeHtml(attachment.name)}</a>`;
    }
  }
  for (const embed of msg.embeds) {
    if (embed.title) content += `<br><strong>${escapeHtml(embed.title)}</strong>`;
    if (embed.description) content += `<br>${escapeHtml(embed.description)}`;
  }
  return content || "<em>(sem conteúdo)</em>";
}

async function generateTranscriptHtml(channel, ticket) {
  const messages = [];
  let lastId;

  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId }).catch(() => null);
    if (!batch?.size) break;
    messages.push(...batch.values());
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }

  messages.reverse();

  const rows = messages
    .map((msg) => {
      const time = msg.createdAt.toLocaleString("pt-BR");
      const author = escapeHtml(msg.author?.tag ?? "Desconhecido");
      return `<tr>
        <td>${time}</td>
        <td>${author}</td>
        <td>${formatContent(msg)}</td>
      </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Transcript — Ticket ${escapeHtml(ticket.id)}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #36393f; color: #dcddde; padding: 20px; }
    h1 { color: #fff; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #4f545c; padding: 8px; vertical-align: top; }
    th { background: #2f3136; }
    tr:nth-child(even) { background: #2f3136; }
  </style>
</head>
<body>
  <h1>Transcript do Ticket</h1>
  <p><strong>Categoria:</strong> ${escapeHtml(ticket.category)}</p>
  <p><strong>Aberto por:</strong> ${escapeHtml(ticket.opener_id)}</p>
  <p><strong>Criado em:</strong> ${new Date(ticket.created_at).toLocaleString("pt-BR")}</p>
  <table>
    <thead><tr><th>Data</th><th>Autor</th><th>Mensagem</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

module.exports = { generateTranscriptHtml };

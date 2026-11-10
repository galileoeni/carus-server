// Short alerts to the Carus team on Telegram: sign-ups and pickup requests.
//
// Setup (Dokploy environment):
//   TELEGRAM_BOT_TOKEN  token from @BotFather
//   TELEGRAM_CHAT_IDS   where to send, comma-separated. Best: one group chat
//                       with all founders and the bot, so adding someone is
//                       just adding them to the group.
// Without these, alerts are skipped (and printed to the console locally).
// Alerts never block or break the request that triggered them.

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

// One alert: a bold title, then "Label: value" lines (empty values skipped).
// Values are escaped, so user input can't break the formatting.
export function teamAlert(
  title: string,
  lines: [label: string, value: unknown][],
) {
  const body = lines
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== '',
    )
    .map(([label, value]) => `<b>${label}:</b> ${escapeHtml(value)}`)
    .join('\n')
  notifyTeam(`<b>${escapeHtml(title)}</b>\n${body}`)
}

export function notifyTeam(html: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatIds = (process.env.TELEGRAM_CHAT_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  if (!token || !chatIds.length) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[telegram alert, not configured]\n${html}`)
    }
    return
  }

  for (const chatId of chatIds) {
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    })
      .then(async (res) => {
        if (!res.ok) {
          console.error(
            `Telegram alert to ${chatId} failed: ${
              res.status
            } ${await res.text()}`,
          )
        }
      })
      .catch((err) => console.error('Telegram alert failed', err))
  }
}

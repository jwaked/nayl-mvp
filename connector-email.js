import { truncate } from './lib-text.js';

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function createEmailConnector({ apiKey, from, appBaseUrl, timeoutMs }) {
  const configured = Boolean(apiKey && from);

  async function send({ to, subject, heading, body, buttonLabel, buttonPath }) {
    if (!configured || !to) return { sent: false, reason: 'not-configured' };
    const buttonUrl = buttonPath ? new URL(buttonPath, appBaseUrl).toString() : null;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: truncate(subject, 180),
        html: `<!doctype html><html><body style="margin:0;background:#090a0b;color:#f6f7f2;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:36px"><p style="letter-spacing:.18em;color:#d8ff54;font-size:12px">NAYL</p><h1 style="font-size:30px">${escapeHtml(heading)}</h1><p style="color:#b7bbc1;line-height:1.7">${escapeHtml(body)}</p>${buttonUrl ? `<a href="${escapeHtml(buttonUrl)}" style="display:inline-block;margin-top:18px;padding:14px 20px;background:#d8ff54;color:#090a0b;text-decoration:none;font-weight:700;border-radius:999px">${escapeHtml(buttonLabel || 'Open NAYL')}</a>` : ''}</div></body></html>`
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Email provider returned ${response.status}: ${details.slice(0, 180)}`);
    }
    return { sent: true };
  }

  return {
    descriptor: {
      id: 'resend-email',
      name: 'Email Notifications',
      sourceType: 'notification',
      mode: configured ? 'live' : 'not-configured',
      configured,
      description: 'Transactional quote and booking notifications through Resend.'
    },
    send
  };
}

// The browser-enforced rule that the app may only load its own files and may not
// send anything anywhere. It is added to the built page (not the dev server, which
// needs extra permissions to reload on save). See PROGRESS.md.
//
//   default-src 'none'   nothing is allowed unless a line below allows it
//   connect-src 'none'   no fetch, XMLHttpRequest, WebSocket or beacon: the app cannot
//                        send data out, even if some code tried to
//   script-src 'self'    only our own script files run (no inline or injected scripts)
//   style-src            our own styles, plus style="..." attributes that React sets
//   img-src / font-src   our own images and fonts (data: images allowed for tiny inlined ones)
//   manifest-src, worker-src   our own manifest and service worker
//   base-uri, form-action, object-src 'none'   closes a few smaller doors
//
// The service worker has its own network access to save the app's files for offline use;
// it only ever asks for files from this site (see vite.config.ts).
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ')

/** Adds the policy to a page, right after the charset line. Fails loudly if it cannot. */
export function injectContentSecurityPolicy(html: string): string {
  const charset = /<meta charset[^>]*>/i
  if (!charset.test(html)) throw new Error('index.html needs a <meta charset> line first.')
  return html.replace(
    charset,
    (match) =>
      `${match}\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
  )
}

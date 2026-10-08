import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTENT_SECURITY_POLICY, injectContentSecurityPolicy } from './security.ts'

const directive = (name: string) =>
  CONTENT_SECURITY_POLICY.split('; ').find((d) => d.startsWith(`${name} `))

describe('content security policy', () => {
  it('blocks every outgoing network request', () => {
    expect(directive('connect-src')).toBe("connect-src 'none'")
    expect(directive('default-src')).toBe("default-src 'none'")
  })

  it('only allows scripts from our own files', () => {
    expect(directive('script-src')).toBe("script-src 'self'")
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-eval')
  })

  it('does not allow any other website, anywhere', () => {
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/https?:|\*/)
  })

  it('is added right after the charset line of a page', () => {
    const html = '<!doctype html><html><head>\n    <meta charset="UTF-8" />\n    <title>x</title></head></html>'
    const out = injectContentSecurityPolicy(html)
    expect(out).toContain(`<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`)
    expect(out.indexOf('charset')).toBeLessThan(out.indexOf('Content-Security-Policy'))
    expect(out.indexOf('Content-Security-Policy')).toBeLessThan(out.indexOf('<title>'))
  })

  it('fails loudly if the page has no charset line', () => {
    expect(() => injectContentSecurityPolicy('<html><head></head></html>')).toThrow()
  })

  it('is not hand-written into index.html (the dev server needs it left out)', () => {
    const source = readFileSync(new URL('../index.html', import.meta.url), 'utf-8')
    expect(source).not.toContain('Content-Security-Policy')
  })
})

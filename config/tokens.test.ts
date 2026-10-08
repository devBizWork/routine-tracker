import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const tokensCss = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf-8')

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(tokensCss)
  if (!match?.[1]) throw new Error(`Missing token --${name}`)
  return match[1].trim()
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

describe('Option Z colors (CLAUDE.md role mapping)', () => {
  const expected: Record<string, string> = {
    'color-primary': '#0b6e99',
    'color-pill': '#d6f3f7',
    'color-ground': '#f2fafc',
    'color-ink': '#0e1a20',
    'color-muted': '#4e6670',
    'color-line': '#dff0f4',
    'color-line-strong': '#d3e9ef',
    'color-card': '#ffffff',
    'color-missed': '#f28a3c',
    'color-missed-text': '#b4501c',
    'color-unknown-stripe-a': '#dcedf1',
    'color-unknown-stripe-b': '#f8fcfd',
    'color-unknown-edge': '#8aa6ae',
    'color-now-fill': '#d9f4f8',
    'color-now-border': '#b5e4ec',
    'color-aqua': '#2ec4d6',
    'color-sunshine': '#ffd166',
    'color-cat-movement': '#e4f5cf',
    'color-cat-focus': '#d8e8fb',
    'color-cat-admin': '#fff0c2',
    'color-cat-meetings': '#ffdfd6',
    'color-cat-planning': '#d2f3f6',
    'color-cat-personal': '#fbe2ee',
  }

  it.each(Object.entries(expected))('%s is %s', (name, hex) => {
    expect(token(name).toLowerCase()).toBe(hex)
  })

  it('keeps Followed the same as the primary color', () => {
    expect(token('color-followed')).toBe('var(--color-primary)')
  })
})

describe('text contrast is at least 4.5:1', () => {
  const t = (name: string) => token(name)
  const pairs: [string, string, string][] = [
    ['ink on ground', t('color-ink'), t('color-ground')],
    ['ink on card', t('color-ink'), t('color-card')],
    ['muted on ground', t('color-muted'), t('color-ground')],
    ['muted on card', t('color-muted'), t('color-card')],
    ['primary on ground', t('color-primary'), t('color-ground')],
    ['primary on card', t('color-primary'), t('color-card')],
    ['primary on active tab pill', t('color-primary'), t('color-pill')],
    ['white on primary', t('color-on-primary'), t('color-primary')],
    ['small orange text on card', t('color-missed-text'), t('color-card')],
    ['ink on Now card', t('color-ink'), t('color-now-fill')],
    ['muted on Now card', t('color-muted'), t('color-now-fill')],
    ...['movement', 'focus', 'admin', 'meetings', 'planning', 'personal'].map(
      (c): [string, string, string] => [`ink on ${c}`, t('color-ink'), t(`color-cat-${c}`)],
    ),
  ]

  it.each(pairs)('%s', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('radii and font sizes cover every screen', () => {
  const screensDir = new URL('../design/screens/', import.meta.url)
  const html = readdirSync(screensDir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => readFileSync(new URL(f, screensDir), 'utf-8'))
    .join('\n')

  const name = (px: string) => px.replace('.', '-')

  it('has a radius token for every border-radius value', () => {
    const used = new Set<string>()
    for (const decl of html.matchAll(/border-radius:\s*([^;"]+)/g)) {
      for (const px of decl[1]!.matchAll(/(\d+(?:\.\d+)?)px/g)) used.add(px[1]!)
    }
    expect(used.size).toBeGreaterThan(10)
    for (const px of used) {
      if (px === '0') continue
      expect(tokensCss, `radius ${px}px`).toContain(`--radius-${name(px)}: ${px}px;`)
    }
  })

  it('has a font-size token for every font size', () => {
    const used = new Set<string>()
    for (const m of html.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) used.add(m[1]!)
    expect(used.size).toBeGreaterThan(10)
    for (const px of used) {
      expect(tokensCss, `font size ${px}px`).toContain(`--text-${name(px)}: ${px}px;`)
    }
  })
})

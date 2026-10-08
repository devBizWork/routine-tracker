import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BASE_PATH, GROUND_COLOR, REPO_NAME, manifest } from './app.config.ts'

const publicFile = (name: string) => readFileSync(new URL(`../public/${name}`, import.meta.url))

function pngSize(file: Buffer) {
  // A PNG starts with an 8 byte signature, then the IHDR chunk holding width and height.
  expect(file.subarray(1, 4).toString('ascii')).toBe('PNG')
  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) }
}

describe('PWA manifest', () => {
  it('lives under the repository name', () => {
    expect(BASE_PATH).toBe(`/${REPO_NAME}/`)
    expect(manifest.start_url).toBe(BASE_PATH)
    expect(manifest.scope).toBe(BASE_PATH)
  })

  it('installs as a portrait, full-screen app with the right names', () => {
    expect(manifest.name).toBe('Routine Tracker')
    expect(manifest.short_name).toBe('Routine')
    expect(manifest.display).toBe('standalone')
    expect(manifest.orientation).toBe('portrait')
  })

  it('takes its colors from the design tokens', () => {
    const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf-8')
    const ground = /--color-ground:\s*(#[0-9a-f]{6})/i.exec(tokens)?.[1]
    expect(ground?.toLowerCase()).toBe(GROUND_COLOR.toLowerCase())
    expect(manifest.theme_color).toBe(GROUND_COLOR)
    expect(manifest.background_color).toBe(GROUND_COLOR)
  })

  it('points at icon files that exist and have the size they claim', () => {
    for (const icon of manifest.icons ?? []) {
      const expected = Number(icon.sizes?.split('x')[0])
      expect(pngSize(publicFile(icon.src))).toEqual({ width: expected, height: expected })
    }
    expect(manifest.icons?.some((i) => i.purpose === 'maskable')).toBe(true)
  })

  it('has a 180 x 180 Home Screen icon for iPhone', () => {
    expect(pngSize(publicFile('apple-touch-icon.png'))).toEqual({ width: 180, height: 180 })
  })
})

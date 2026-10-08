// Draws the placeholder app icons into public/. Run with: npm run icons
// No libraries needed: it draws the shapes itself and writes the PNG files directly.
// To use your own icon later, replace the files in public/ (keep the same names and sizes).
import { mkdirSync, writeFileSync } from 'node:fs'
import { crc32, deflateSync } from 'node:zlib'

const PRIMARY = [0x0b, 0x6e, 0x99]
const WHITE = [0xff, 0xff, 0xff]
const SUNSHINE = [0xff, 0xd1, 0x66]

// Everything is described on a 512 x 512 canvas, then scaled to the size we need.
// The clock sits inside the middle 80% so it also survives the "maskable" crop.
const RING = { cx: 256, cy: 256, r: 170, width: 40 }
const HANDS = [
  { a: [256, 256], b: [256, 166] },
  { a: [256, 256], b: [316, 296] },
]
const HAND_WIDTH = 40
const DOT = { cx: 256, cy: 256, r: 26 }

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const abx = bx - ax
  const aby = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)))
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby))
}

function inRoundedSquare(x, y, size, radius) {
  const dx = Math.max(radius - x, 0, x - (size - radius))
  const dy = Math.max(radius - y, 0, y - (size - radius))
  return dx * dx + dy * dy <= radius * radius
}

// Colour at a point of the 512 canvas, or null where the icon is transparent.
function colorAt(x, y, rounded) {
  if (rounded && !inRoundedSquare(x, y, 512, 112)) return null
  if (Math.hypot(x - DOT.cx, y - DOT.cy) <= DOT.r) return SUNSHINE
  if (Math.abs(Math.hypot(x - RING.cx, y - RING.cy) - RING.r) <= RING.width / 2) return WHITE
  for (const h of HANDS) {
    if (distToSegment(x, y, h.a, h.b) <= HAND_WIDTH / 2) return WHITE
  }
  return PRIMARY
}

function render(size, rounded) {
  const samples = 4 // 4 x 4 samples per pixel for smooth edges
  const scale = 512 / size
  const rgba = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0
      let g = 0
      let b = 0
      let hits = 0
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const c = colorAt((px + (sx + 0.5) / samples) * scale, (py + (sy + 0.5) / samples) * scale, rounded)
          if (c) {
            r += c[0]
            g += c[1]
            b += c[2]
            hits++
          }
        }
      }
      const i = (py * size + px) * 4
      if (hits > 0) {
        rgba[i] = Math.round(r / hits)
        rgba[i + 1] = Math.round(g / hits)
        rgba[i + 2] = Math.round(b / hits)
        rgba[i + 3] = Math.round((hits / (samples * samples)) * 255)
      }
    }
  }
  return rgba
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const out = Buffer.alloc(body.length + 8)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), body.length + 4)
  return out
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const rows = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const OUT = new URL('../public/', import.meta.url)
mkdirSync(OUT, { recursive: true })

const files = [
  // Home Screen / install icons. The rounded corners are part of the picture.
  ['pwa-192x192.png', 192, true],
  ['pwa-512x512.png', 512, true],
  // Android crops this one into its own shape, so it fills the whole square.
  ['maskable-512x512.png', 512, false],
  // iPhone rounds the corners itself and wants no transparency.
  ['apple-touch-icon.png', 180, false],
]
for (const [name, size, rounded] of files) {
  writeFileSync(new URL(name, OUT), encodePng(size, render(size, rounded)))
  console.log(`wrote public/${name}`)
}

writeFileSync(
  new URL('favicon.svg', OUT),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0B6E99"/>
  <circle cx="256" cy="256" r="${RING.r}" fill="none" stroke="#FFFFFF" stroke-width="${RING.width}"/>
  <path d="M256 256V166M256 256l60 40" fill="none" stroke="#FFFFFF" stroke-width="${HAND_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="256" cy="256" r="${DOT.r}" fill="#FFD166"/>
</svg>
`,
)
console.log('wrote public/favicon.svg')

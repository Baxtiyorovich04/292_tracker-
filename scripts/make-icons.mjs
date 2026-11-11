import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FONT = {
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '11100'],
}

function crc32(buffer) {
  let crc = ~0
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return ~crc >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function draw(size) {
  const pixels = new Uint8Array(size * size * 4)
  const set = (x, y, red, green, blue) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const index = (y * size + x) * 4
    pixels[index] = red
    pixels[index + 1] = green
    pixels[index + 2] = blue
    pixels[index + 3] = 255
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) set(x, y, 6, 6, 7)
  }

  const text = '292'
  const scale = Math.max(1, Math.round(size / 22))
  const glyphWidth = 5 * scale
  const gap = scale
  const totalWidth = text.length * glyphWidth + (text.length - 1) * gap
  const totalHeight = 7 * scale
  const originX = Math.round((size - totalWidth) / 2)
  const originY = Math.round((size - totalHeight) / 2) - Math.round(scale * 0.6)

  for (let glyph = 0; glyph < text.length; glyph += 1) {
    const rows = FONT[text[glyph]]
    const glyphX = originX + glyph * (glyphWidth + gap)
    rows.forEach((row, rowIndex) => {
      ;[...row].forEach((cell, column) => {
        if (cell !== '1') return
        for (let py = 0; py < scale; py += 1) {
          for (let px = 0; px < scale; px += 1) {
            set(glyphX + column * scale + px, originY + rowIndex * scale + py, 250, 250, 250)
          }
        }
      })
    })
  }

  const barWidth = Math.round(totalWidth * 0.42)
  const barHeight = Math.max(2, Math.round(scale * 0.62))
  const barX = Math.round((size - barWidth) / 2)
  const barY = originY + totalHeight + Math.round(scale * 1.15)
  for (let y = 0; y < barHeight; y += 1) {
    for (let x = 0; x < barWidth; x += 1) set(barX + x, barY + y, 255, 81, 0)
  }

  return pixels
}

function png(size) {
  const pixels = draw(size)
  const stride = size * 4
  const raw = Buffer.alloc(size * (stride + 1))
  for (let y = 0; y < size; y += 1) {
    const offset = y * (stride + 1)
    raw[offset] = 0
    raw.set(pixels.subarray(y * stride, y * stride + stride), offset + 1)
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(root, { recursive: true })

for (const [name, size] of [
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]) {
  writeFileSync(join(root, name), png(size))
}

console.log('icons written')

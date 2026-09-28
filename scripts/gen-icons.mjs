// 生成 PWA 图标：只用 Node 内置模块手写 PNG 编码（zlib + 自实现 CRC32）
// 用法：npm run icons
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// ---------- CRC32 ----------
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c >>> 0
}
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ---------- PNG 编码 ----------
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  // compression / filter / interlace 均为 0
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- 绘制 ----------
const BG = [0xa8, 0xc7, 0xfa] // 柔和蓝 #A8C7FA
const FG = [0xff, 0xff, 0xff] // 白色小鱼

// 超采样抗锯齿：以 ss 倍分辨率绘制再平均缩小
function drawIcon(size, { maskable = false } = {}) {
  const ss = 4
  const S = size * ss
  const buf = Buffer.alloc(S * S * 4)
  const corner = maskable ? 0 : 0.22 // 圆角半径（占边长比例），maskable 满血方形
  const scale = maskable ? 0.62 : 1.0 // maskable 内容留出约 20% 安全边距

  // 小鱼形状（归一化坐标，相对中心）
  const body = { cx: -0.06 * scale, cy: 0, rx: 0.21 * scale, ry: 0.14 * scale }
  const tail = [
    [0.1 * scale, 0],
    [0.27 * scale, -0.12 * scale],
    [0.27 * scale, 0.12 * scale],
  ]
  const eye = { cx: -0.16 * scale, cy: -0.045 * scale, r: 0.03 * scale }

  function inRoundedRect(nx, ny) {
    if (corner === 0) return true
    const ax = Math.abs(nx)
    const ay = Math.abs(ny)
    const half = 0.5
    if (ax > half || ay > half) return false
    const r = corner
    const ix = half - r
    const iy = half - r
    if (ax <= ix || ay <= iy) return true
    const dx = ax - ix
    const dy = ay - iy
    return dx * dx + dy * dy <= r * r
  }

  function inEllipse(nx, ny, e) {
    const dx = (nx - e.cx) / e.rx
    const dy = (ny - e.cy) / e.ry
    return dx * dx + dy * dy <= 1
  }

  function inTriangle(nx, ny, [p1, p2, p3]) {
    const d1 = (nx - p2[0]) * (p1[1] - p2[1]) - (p1[0] - p2[0]) * (ny - p2[1])
    const d2 = (nx - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (ny - p3[1])
    const d3 = (nx - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (ny - p1[1])
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0
    return !(hasNeg && hasPos)
  }

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = x / S - 0.5
      const ny = y / S - 0.5
      let color = null
      if (inRoundedRect(nx, ny)) {
        color = BG
        const inFish = inEllipse(nx, ny, body) || inTriangle(nx, ny, tail)
        if (inFish) {
          color = FG
          const dx = nx - eye.cx
          const dy = ny - eye.cy
          if (dx * dx + dy * dy <= eye.r * eye.r) color = BG
        }
      }
      const i = (y * S + x) * 4
      if (color) {
        buf[i] = color[0]
        buf[i + 1] = color[1]
        buf[i + 2] = color[2]
        buf[i + 3] = 255
      } else {
        buf[i + 3] = 0
      }
    }
  }

  // 缩小到目标尺寸（盒式平均）
  const out = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const i = ((y * ss + sy) * S + (x * ss + sx)) * 4
          r += buf[i]
          g += buf[i + 1]
          b += buf[i + 2]
          a += buf[i + 3]
        }
      }
      const n = ss * ss
      const o = (y * size + x) * 4
      out[o] = Math.round(r / n)
      out[o + 1] = Math.round(g / n)
      out[o + 2] = Math.round(b / n)
      out[o + 3] = Math.round(a / n)
    }
  }
  return out
}

for (const size of [192, 512]) {
  const rgba = drawIcon(size)
  writeFileSync(join(outDir, `icon-${size}.png`), encodePNG(size, size, rgba))
  const rgbaM = drawIcon(size, { maskable: true })
  writeFileSync(join(outDir, `maskable-${size}.png`), encodePNG(size, size, rgbaM))
  console.log(`generated icon-${size}.png & maskable-${size}.png`)
}
console.log(`icons written to ${outDir}`)

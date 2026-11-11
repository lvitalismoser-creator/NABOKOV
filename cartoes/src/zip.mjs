/* ZIP mínimo, sem compressão ("stored"), para montar .docx e .odt sem dependência.
 * Entrada: [{ name, data: Uint8Array }], na ordem em que devem ficar no arquivo
 * (o .odt exige "mimetype" primeiro, sem compressão e sem campo extra: é o que sai aqui).
 * Nomes só em ASCII. */

const TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function zip(files, date = new Date()) {
  const enc = new TextEncoder()
  // data e hora no formato do DOS (o ZIP não conhece datas antes de 1980)
  const y = Math.max(1980, date.getFullYear())
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
  const dosDate = ((y - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()

  const entries = files.map((f) => ({ name: enc.encode(f.name), data: f.data, crc: crc32(f.data) }))
  const size = entries.reduce((n, e) => n + 30 + e.name.length + e.data.length + 46 + e.name.length, 22)
  const out = new Uint8Array(size)
  const v = new DataView(out.buffer)
  let p = 0
  const u16 = (x) => { v.setUint16(p, x, true); p += 2 }
  const u32 = (x) => { v.setUint32(p, x, true); p += 4 }
  const put = (b) => { out.set(b, p); p += b.length }

  for (const e of entries) {
    e.offset = p
    u32(0x04034b50); u16(20); u16(0); u16(0)          // assinatura, versão, flags, método 0 = sem compressão
    u16(dosTime); u16(dosDate); u32(e.crc)
    u32(e.data.length); u32(e.data.length)             // tamanho comprimido = tamanho real
    u16(e.name.length); u16(0)                         // sem campo extra
    put(e.name); put(e.data)
  }
  const cdStart = p
  for (const e of entries) {
    u32(0x02014b50); u16(20); u16(20); u16(0); u16(0)
    u16(dosTime); u16(dosDate); u32(e.crc)
    u32(e.data.length); u32(e.data.length)
    u16(e.name.length); u16(0); u16(0); u16(0); u16(0) // extra, comentário, disco, atributos internos
    u32(0); u32(e.offset)
    put(e.name)
  }
  const cdSize = p - cdStart
  u32(0x06054b50); u16(0); u16(0); u16(entries.length); u16(entries.length)
  u32(cdSize); u32(cdStart); u16(0)
  return out
}

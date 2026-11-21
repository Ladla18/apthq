const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32ToBytes(secret: string): Uint8Array {
  const cleaned = secret.replace(/[\s=-]/g, '').toUpperCase()
  let bits = ''
  for (const char of cleaned) {
    const value = BASE32_ALPHABET.indexOf(char)
    if (value < 0) throw new Error('Authenticator secret is not valid base32')
    bits += value.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  }
  return Uint8Array.from(bytes)
}

export async function generateTotp(
  secret: string,
  now = Date.now(),
  digits = 6,
  stepSeconds = 30,
): Promise<{ code: string; secondsLeft: number }> {
  const counter = Math.floor(now / 1000 / stepSeconds)
  const secondsLeft = stepSeconds - (Math.floor(now / 1000) % stepSeconds)
  const counterBytes = new ArrayBuffer(8)
  const view = new DataView(counterBytes)
  view.setUint32(0, Math.floor(counter / 0x100000000), false)
  view.setUint32(4, counter >>> 0, false)

  const key = await crypto.subtle.importKey(
    'raw',
    base32ToBytes(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes))
  const offset = signature[signature.length - 1] & 0x0f
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff)
  const code = (binary % 10 ** digits).toString().padStart(digits, '0')
  return { code, secondsLeft }
}

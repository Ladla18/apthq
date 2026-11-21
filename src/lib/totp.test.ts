import { describe, expect, it } from 'vitest'
import { generateTotp } from './totp'

const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

describe('generateTotp', () => {
  it('matches the RFC 6238 SHA-1 vectors', async () => {
    await expect(generateTotp(RFC_SECRET, 59_000, 8)).resolves.toMatchObject({ code: '94287082' })
    await expect(generateTotp(RFC_SECRET, 1_111_111_109_000, 8)).resolves.toMatchObject({
      code: '07081804',
    })
    await expect(generateTotp(RFC_SECRET, 1_234_567_890_000, 8)).resolves.toMatchObject({
      code: '89005924',
    })
  })
})

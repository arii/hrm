/**
 * @jest-environment node
 */
import { ClientCommandMessageSchema } from '@/types/websocket'

describe('ClientCommandMessageSchema metadata gender', () => {
  const base = { type: 'HRM_METADATA_UPDATE' as const, data: { name: 'T' } }

  it('accepts canonical genders and omits', () => {
    for (const gender of ['MALE', 'FEMALE', 'NEUTRAL'] as const) {
      const result = ClientCommandMessageSchema.safeParse({
        ...base,
        data: { ...base.data, gender },
      })
      expect(result.success).toBe(true)
    }
    expect(ClientCommandMessageSchema.safeParse(base).success).toBe(true)
  })

  it('rejects non-canonical genders', () => {
    for (const gender of ['female', 'OTHER', '']) {
      const result = ClientCommandMessageSchema.safeParse({
        ...base,
        data: { ...base.data, gender },
      })
      expect(result.success).toBe(false)
    }
  })
})

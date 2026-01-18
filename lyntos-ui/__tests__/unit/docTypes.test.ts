import { describe, it, expect } from 'vitest'
import { BIG_6_DOC_TYPES, DOC_TYPE_INFO, type Big6DocType } from '@/app/v2/_lib/constants/docTypes'

describe('Document Types Constants', () => {
  describe('BIG_6_DOC_TYPES', () => {
    it('should have exactly 6 document types', () => {
      expect(BIG_6_DOC_TYPES).toHaveLength(6)
    })

    it('should include all required document types', () => {
      expect(BIG_6_DOC_TYPES).toContain('MIZAN')
      expect(BIG_6_DOC_TYPES).toContain('BEYANNAME')
      expect(BIG_6_DOC_TYPES).toContain('TAHAKKUK')
      expect(BIG_6_DOC_TYPES).toContain('BANKA')
      expect(BIG_6_DOC_TYPES).toContain('EDEFTER_BERAT')
      expect(BIG_6_DOC_TYPES).toContain('EFATURA_ARSIV')
    })

    it('should be a readonly array', () => {
      // Type check - BIG_6_DOC_TYPES should be readonly
      const types: readonly string[] = BIG_6_DOC_TYPES
      expect(types).toBeDefined()
    })
  })

  describe('DOC_TYPE_INFO', () => {
    it('should have info for all 6 document types', () => {
      const keys = Object.keys(DOC_TYPE_INFO)
      expect(keys).toHaveLength(6)
    })

    it('should have Turkish labels for all types', () => {
      BIG_6_DOC_TYPES.forEach(type => {
        const info = DOC_TYPE_INFO[type]
        expect(info).toBeDefined()
        expect(info.labelTr).toBeTruthy()
        expect(typeof info.labelTr).toBe('string')
      })
    })

    it('should have English labels for all types', () => {
      BIG_6_DOC_TYPES.forEach(type => {
        const info = DOC_TYPE_INFO[type]
        expect(info.label).toBeTruthy()
        expect(typeof info.label).toBe('string')
      })
    })

    it('should have descriptions for all types', () => {
      BIG_6_DOC_TYPES.forEach(type => {
        const info = DOC_TYPE_INFO[type]
        expect(info.description).toBeTruthy()
        expect(typeof info.description).toBe('string')
      })
    })

    it('should have icons defined for all types', () => {
      BIG_6_DOC_TYPES.forEach(type => {
        const info = DOC_TYPE_INFO[type]
        expect(info.icon).toBeTruthy()
        expect(typeof info.icon).toBe('string')
      })
    })

    it('should mark all types as required', () => {
      BIG_6_DOC_TYPES.forEach(type => {
        const info = DOC_TYPE_INFO[type]
        expect(info.required).toBe(true)
      })
    })

    it('should have matching keys', () => {
      BIG_6_DOC_TYPES.forEach(type => {
        const info = DOC_TYPE_INFO[type]
        expect(info.key).toBe(type)
      })
    })
  })

  describe('Specific document type info', () => {
    it('MIZAN should have correct Turkish label', () => {
      expect(DOC_TYPE_INFO.MIZAN.labelTr).toBe('Mizan')
    })

    it('BEYANNAME should have correct Turkish label', () => {
      expect(DOC_TYPE_INFO.BEYANNAME.labelTr).toBe('Beyanname')
    })

    it('TAHAKKUK should have correct Turkish label', () => {
      expect(DOC_TYPE_INFO.TAHAKKUK.labelTr).toBe('Tahakkuk')
    })

    it('BANKA should have correct Turkish label', () => {
      expect(DOC_TYPE_INFO.BANKA.labelTr).toBe('Banka Ekstre')
    })

    it('EDEFTER_BERAT should have correct Turkish label', () => {
      expect(DOC_TYPE_INFO.EDEFTER_BERAT.labelTr).toBe('e-Defter Berat')
    })

    it('EFATURA_ARSIV should have correct Turkish label', () => {
      expect(DOC_TYPE_INFO.EFATURA_ARSIV.labelTr).toBe('e-Fatura/Arsiv')
    })
  })
})

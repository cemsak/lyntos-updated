import { describe, it, expect } from 'vitest'
import {
  calculateDocStatuses,
  getDocStatusSummary,
  getMissingDocTypes,
  isPeriodComplete
} from '@/app/v2/_lib/utils/docStatusHelper'

describe('Document Status Helper', () => {
  describe('calculateDocStatuses', () => {
    it('should return all missing when byDocType is empty object', () => {
      const statuses = calculateDocStatuses({})
      expect(statuses).toHaveLength(6)
      statuses.forEach(status => {
        expect(status.status).toBe('missing')
        expect(status.count).toBe(0)
      })
    })

    it('should return all missing when byDocType is null', () => {
      const statuses = calculateDocStatuses(null)
      expect(statuses).toHaveLength(6)
      statuses.forEach(status => {
        expect(status.status).toBe('missing')
        expect(status.count).toBe(0)
      })
    })

    it('should return all missing when byDocType is undefined', () => {
      const statuses = calculateDocStatuses(undefined)
      expect(statuses).toHaveLength(6)
      statuses.forEach(status => {
        expect(status.status).toBe('missing')
        expect(status.count).toBe(0)
      })
    })

    it('should correctly identify present documents from number values', () => {
      const byDocType = {
        MIZAN: 1,
        BEYANNAME: 3,
        BANKA: 2,
      }
      const statuses = calculateDocStatuses(byDocType)

      const mizanStatus = statuses.find(s => s.docType === 'MIZAN')
      expect(mizanStatus?.status).toBe('present')
      expect(mizanStatus?.count).toBe(1)

      const beyannameStatus = statuses.find(s => s.docType === 'BEYANNAME')
      expect(beyannameStatus?.status).toBe('present')
      expect(beyannameStatus?.count).toBe(3)

      const bankaStatus = statuses.find(s => s.docType === 'BANKA')
      expect(bankaStatus?.status).toBe('present')
      expect(bankaStatus?.count).toBe(2)

      const tahakkukStatus = statuses.find(s => s.docType === 'TAHAKKUK')
      expect(tahakkukStatus?.status).toBe('missing')
      expect(tahakkukStatus?.count).toBe(0)
    })

    it('should correctly identify present documents from array values', () => {
      const byDocType = {
        MIZAN: [{ id: '1' }],
        BEYANNAME: [{ id: '1' }, { id: '2' }, { id: '3' }],
      }
      const statuses = calculateDocStatuses(byDocType)

      const mizanStatus = statuses.find(s => s.docType === 'MIZAN')
      expect(mizanStatus?.status).toBe('present')
      expect(mizanStatus?.count).toBe(1)

      const beyannameStatus = statuses.find(s => s.docType === 'BEYANNAME')
      expect(beyannameStatus?.status).toBe('present')
      expect(beyannameStatus?.count).toBe(3)
    })

    it('should include doc info for each status', () => {
      const statuses = calculateDocStatuses({})
      statuses.forEach(status => {
        expect(status.info).toBeDefined()
        expect(status.info.labelTr).toBeTruthy()
        expect(status.info.description).toBeTruthy()
      })
    })

    it('should set expectedMin to 1 for all categories', () => {
      const statuses = calculateDocStatuses({})
      statuses.forEach(status => {
        expect(status.expectedMin).toBe(1)
      })
    })
  })

  describe('getDocStatusSummary', () => {
    it('should calculate correct summary for empty data', () => {
      const statuses = calculateDocStatuses({})
      const summary = getDocStatusSummary(statuses)

      expect(summary.total).toBe(6)
      expect(summary.present).toBe(0)
      expect(summary.missing).toBe(6)
      expect(summary.error).toBe(0)
      expect(summary.completionPercent).toBe(0)
    })

    it('should calculate correct summary for partial data', () => {
      const byDocType = {
        MIZAN: 1,
        BEYANNAME: 2,
        BANKA: 1,
      }
      const statuses = calculateDocStatuses(byDocType)
      const summary = getDocStatusSummary(statuses)

      expect(summary.total).toBe(6)
      expect(summary.present).toBe(3)
      expect(summary.missing).toBe(3)
      expect(summary.completionPercent).toBe(50)
    })

    it('should return 100% for complete data', () => {
      const byDocType = {
        MIZAN: 1,
        BEYANNAME: 1,
        TAHAKKUK: 1,
        BANKA: 1,
        EDEFTER_BERAT: 1,
        EFATURA_ARSIV: 1,
      }
      const statuses = calculateDocStatuses(byDocType)
      const summary = getDocStatusSummary(statuses)

      expect(summary.completionPercent).toBe(100)
      expect(summary.missing).toBe(0)
      expect(summary.present).toBe(6)
    })

    it('should round completion percent', () => {
      const byDocType = {
        MIZAN: 1,
      }
      const statuses = calculateDocStatuses(byDocType)
      const summary = getDocStatusSummary(statuses)

      // 1/6 = 16.666... should round to 17
      expect(summary.completionPercent).toBe(17)
    })
  })

  describe('getMissingDocTypes', () => {
    it('should return all types when nothing is present', () => {
      const statuses = calculateDocStatuses({})
      const missing = getMissingDocTypes(statuses)

      expect(missing).toHaveLength(6)
      missing.forEach(m => {
        expect(m.status).toBe('missing')
      })
    })

    it('should return only missing types', () => {
      const byDocType = {
        MIZAN: 1,
        BEYANNAME: 1,
      }
      const statuses = calculateDocStatuses(byDocType)
      const missing = getMissingDocTypes(statuses)

      expect(missing).toHaveLength(4)
      const missingTypes = missing.map(m => m.docType)
      expect(missingTypes).toContain('TAHAKKUK')
      expect(missingTypes).toContain('BANKA')
      expect(missingTypes).toContain('EDEFTER_BERAT')
      expect(missingTypes).toContain('EFATURA_ARSIV')
      expect(missingTypes).not.toContain('MIZAN')
      expect(missingTypes).not.toContain('BEYANNAME')
    })

    it('should return empty array when all present', () => {
      const byDocType = {
        MIZAN: 1,
        BEYANNAME: 1,
        TAHAKKUK: 1,
        BANKA: 1,
        EDEFTER_BERAT: 1,
        EFATURA_ARSIV: 1,
      }
      const statuses = calculateDocStatuses(byDocType)
      const missing = getMissingDocTypes(statuses)

      expect(missing).toHaveLength(0)
    })
  })

  describe('isPeriodComplete', () => {
    it('should return false for empty period', () => {
      const statuses = calculateDocStatuses({})
      expect(isPeriodComplete(statuses)).toBe(false)
    })

    it('should return false for incomplete period', () => {
      const byDocType = { MIZAN: 1, BEYANNAME: 1 }
      const statuses = calculateDocStatuses(byDocType)
      expect(isPeriodComplete(statuses)).toBe(false)
    })

    it('should return true for complete period', () => {
      const byDocType = {
        MIZAN: 1,
        BEYANNAME: 1,
        TAHAKKUK: 1,
        BANKA: 1,
        EDEFTER_BERAT: 1,
        EFATURA_ARSIV: 1,
      }
      const statuses = calculateDocStatuses(byDocType)
      expect(isPeriodComplete(statuses)).toBe(true)
    })

    it('should return true even with multiple documents per type', () => {
      const byDocType = {
        MIZAN: 2,
        BEYANNAME: 5,
        TAHAKKUK: 3,
        BANKA: 4,
        EDEFTER_BERAT: 1,
        EFATURA_ARSIV: 10,
      }
      const statuses = calculateDocStatuses(byDocType)
      expect(isPeriodComplete(statuses)).toBe(true)
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch before importing
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import after mocking
import { syncMizanToBackend, getMizanSummary, getMizanEntries, clearMizanData } from '@/app/v2/_lib/api/mizanSync'

describe('Mizan Sync API', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('syncMizanToBackend', () => {
    it('should return success response on valid sync', async () => {
      const mockResponse = {
        success: true,
        synced_count: 5,
        error_count: 0,
        period_id: '2024-Q4',
        totals: {
          borc_toplam: 100000,
          alacak_toplam: 100000,
          borc_bakiye: 50000,
          alacak_bakiye: 50000,
        },
        errors: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const payload = {
        meta: {
          tenant_id: 'test',
          client_id: 'test',
          period_id: '2024-Q4',
        },
        entries: [
          {
            hesap_kodu: '100',
            hesap_adi: 'Kasa',
            borc_toplam: 10000,
            alacak_toplam: 5000,
            borc_bakiye: 5000,
            alacak_bakiye: 0,
          },
        ],
      }

      const result = await syncMizanToBackend(payload)

      expect(result.success).toBe(true)
      expect(result.synced_count).toBe(5)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/mizan/sync'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('should handle network error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const payload = {
        meta: {
          tenant_id: 'test',
          client_id: 'test',
          period_id: '2024-Q4',
        },
        entries: [],
      }

      const result = await syncMizanToBackend(payload)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Network error')
    })

    it('should handle HTTP error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      const payload = {
        meta: {
          tenant_id: 'test',
          client_id: 'test',
          period_id: '2024-Q4',
        },
        entries: [],
      }

      const result = await syncMizanToBackend(payload)

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('HTTP 500')
    })
  })

  describe('getMizanSummary', () => {
    it('should return null on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await getMizanSummary('2024-Q4', 'test', 'test')
      expect(result).toBeNull()
    })

    it('should return summary on success', async () => {
      const mockSummary = {
        period_id: '2024-Q4',
        entry_count: 100,
        aktif_toplam: 500000,
        pasif_toplam: 500000,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummary,
      })

      const result = await getMizanSummary('2024-Q4', 'test', 'test')
      expect(result).toEqual(mockSummary)
    })

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getMizanSummary('2024-Q4', 'test', 'test')
      expect(result).toBeNull()
    })
  })

  describe('getMizanEntries', () => {
    it('should return entries on success', async () => {
      const mockEntries = {
        period_id: '2024-Q4',
        entries: [
          { hesap_kodu: '100', hesap_adi: 'Kasa' },
          { hesap_kodu: '102', hesap_adi: 'Bankalar' },
        ],
        total: 2,
        limit: 100,
        offset: 0,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntries,
      })

      const result = await getMizanEntries('2024-Q4', 'test', 'test')
      expect(result?.entries).toHaveLength(2)
      expect(result?.total).toBe(2)
    })

    it('should return null on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await getMizanEntries('2024-Q4', 'test', 'test')
      expect(result).toBeNull()
    })

    it('should pass hesap_prefix option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [], total: 0, limit: 100, offset: 0 }),
      })

      await getMizanEntries('2024-Q4', 'test', 'test', { hesapPrefix: '102' })

      // Verify fetch was called with URL containing hesap_prefix
      expect(mockFetch).toHaveBeenCalled()
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('hesap_prefix=102')
    })
  })

  describe('clearMizanData', () => {
    it('should return success on delete', async () => {
      const mockResponse = {
        success: true,
        deleted_count: 50,
        period_id: '2024-Q4',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await clearMizanData('2024-Q4', 'test', 'test')
      expect(result?.success).toBe(true)
      expect(result?.deleted_count).toBe(50)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/mizan/clear/2024-Q4'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('should return null on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await clearMizanData('2024-Q4', 'test', 'test')
      expect(result).toBeNull()
    })
  })
})

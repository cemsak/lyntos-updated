/**
 * LYNTOS Mock Data for Development
 * Sprint 7.3 - Stripe Dashboard Shell
 */
import type { User, Client, Period } from './types';

export const MOCK_USER: User = {
  id: 'user-1',
  name: 'Ahmet Yılmaz',
  title: 'SMMM',
  email: 'ahmet@example.com',
  initials: 'AY',
};

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'client-1',
    name: 'ÖZKAN KIRTASİYE TİC. LTD. ŞTİ.',
    shortName: 'ÖZKAN KIRTASİYE',
    vkn: '1234567890',
    riskLevel: 'kritik',
    riskScore: 87,
    sector: 'Perakende',
    naceCode: '47.62',
    isFavorite: true,
  },
  {
    id: 'client-2',
    name: 'YILDIZ TEKSTİL SAN. A.Ş.',
    shortName: 'YILDIZ TEKSTİL',
    vkn: '9876543210',
    riskLevel: 'orta',
    riskScore: 45,
    sector: 'Tekstil',
    naceCode: '13.92',
    isFavorite: true,
  },
  {
    id: 'client-3',
    name: 'ANADOLU GIDA PAZ. LTD. ŞTİ.',
    shortName: 'ANADOLU GIDA',
    vkn: '5678901234',
    riskLevel: 'dusuk',
    riskScore: 23,
    sector: 'Gıda',
    naceCode: '46.31',
    isFavorite: false,
  },
  {
    id: 'client-4',
    name: 'DEMİR İNŞAAT TAAH. A.Ş.',
    shortName: 'DEMİR İNŞAAT',
    vkn: '3456789012',
    riskLevel: 'yuksek',
    riskScore: 72,
    sector: 'İnşaat',
    naceCode: '41.20',
    isFavorite: false,
  },
];

export const MOCK_PERIODS: Period[] = [
  {
    id: 'period-1',
    code: '2025-Q2',
    label: '2025 Q2',
    description: 'Nisan - Haziran 2025',
    startDate: '2025-04-01',
    endDate: '2025-06-30',
    isActive: true,
    isCurrent: true,
  },
  {
    id: 'period-2',
    code: '2025-Q1',
    label: '2025 Q1',
    description: 'Ocak - Mart 2025',
    startDate: '2025-01-01',
    endDate: '2025-03-31',
    isActive: false,
    isCurrent: false,
  },
  {
    id: 'period-3',
    code: '2024-Q4',
    label: '2024 Q4',
    description: 'Ekim - Aralık 2024',
    startDate: '2024-10-01',
    endDate: '2024-12-31',
    isActive: false,
    isCurrent: false,
  },
];

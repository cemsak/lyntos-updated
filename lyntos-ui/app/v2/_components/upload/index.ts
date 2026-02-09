// LYNTOS Upload Module - Public API
// Sprint 5: SMMM-friendly document upload with auto-classification

// Types
export type {
  DocumentType,
  AccountingSoftware,
  BeratType,
  TurkishBank,
  UploadedFile,
  UploadSession,
  RequiredDocument,
  MizanRow,
  EBeratData,
} from './types';

// File classification
export { classifyFile } from './fileClassifier';
export type { ClassificationResult } from './fileClassifier';

// Bank utilities
export {
  TURKISH_BANKS,
  getBankFromIBAN,
  findIBANsInText,
  getBankCount,
  getTaxPaymentBanks,
  getKatilimBanks,
} from './bankRegistry';

// Sprint 5.3: Mizan parsing and VDK validation
export { parseMizanFile, getAccountBalance, getAccountGroupTotal } from './mizanParser';
export type { ParsedMizan, AccountBalance } from './mizanParser';

export { aggregateMizanData, mergeExternalData } from './dataAggregator';
export type { TaxpayerData } from './dataAggregator';

export { useVdkValidation } from './useVdkValidation';
export type { VdkAssessmentResult, VdkCriterionResult, UseVdkValidationReturn } from './useVdkValidation';

export { UploadValidationBadge } from './UploadValidationBadge';
export { QuickRiskSummary } from './QuickRiskSummary';

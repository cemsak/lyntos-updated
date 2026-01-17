// Old rule-engine based evidence system
export {
  generateEvidenceBundle,
  type EvidenceBundle,
  type EvidenceItem,
  type EvidenceSection,
  type BundleGeneratorOptions
} from './bundleGenerator';
export { useEvidenceBundle } from './useEvidenceBundle';
export { generatePDFContent, type PDFContent } from './pdfGenerator';

// New quarterly cross-check based evidence system
export {
  generateQuarterlyEvidenceBundle,
  downloadQuarterlyPDFOnly,
  generateManifest,
  generatePDFReport,
  type EvidenceManifest,
  type QuarterlyBundleOptions
} from './quarterly';

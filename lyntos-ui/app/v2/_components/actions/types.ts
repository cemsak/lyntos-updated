/**
 * LYNTOS Action Types
 * Sprint 4.3 - Standardized Action Contract
 */

export type ActionKind = 'navigate' | 'upload' | 'note' | 'calculate' | 'external';

export interface ActionDefinition {
  id: string;
  kind: ActionKind;
  label: string;
  description?: string;

  // Kind-specific properties
  href?: string;           // navigate
  uploadType?: string;     // upload
  noteType?: string;       // note
  calcType?: string;       // calculate
  externalUrl?: string;    // external
}

/**
 * Parse action string to structured object
 * Format: "{kind}:{target}" or just "{kind}"
 * Examples:
 *   "navigate:/v2/mizan-analiz?hesap=100"
 *   "upload:kasa-sayim"
 *   "note:kasa-yuksek-gerekce"
 *   "calculate:ortak-faiz"
 */
export function parseAction(actionString: string, label: string): ActionDefinition {
  const colonIndex = actionString.indexOf(':');

  if (colonIndex === -1) {
    // Simple action without target
    return {
      id: actionString,
      kind: actionString as ActionKind,
      label,
    };
  }

  const kind = actionString.substring(0, colonIndex) as ActionKind;
  const target = actionString.substring(colonIndex + 1);

  const action: ActionDefinition = {
    id: actionString,
    kind,
    label,
  };

  switch (kind) {
    case 'navigate':
      action.href = target;
      action.description = 'Detay sayfasina git';
      break;
    case 'upload':
      action.uploadType = target;
      action.description = getUploadDescription(target);
      break;
    case 'note':
      action.noteType = target;
      action.description = 'Not veya gerekce ekle';
      break;
    case 'calculate':
      action.calcType = target;
      action.description = getCalculateDescription(target);
      break;
    case 'external':
      action.externalUrl = target;
      action.description = 'Harici kaynaga git';
      break;
  }

  return action;
}

function getUploadDescription(uploadType: string): string {
  const descriptions: Record<string, string> = {
    'kasa-sayim': 'Kasa sayim tutanagi yukle',
    'stok-sayim': 'Stok sayim raporu yukle',
    'banka-ekstre': 'Banka ekstresi yukle',
    'ortak-sozlesme': 'Ortak borc sozlesmesi yukle',
    'alici-mutabakat': 'Alici mutabakat mektubu yukle',
    'satici-mutabakat': 'Satici mutabakat mektubu yukle',
    'kdv-beyan': 'KDV beyannamesi yukle',
    'sermaye-belge': 'Sermaye belgesi yukle',
  };
  return descriptions[uploadType] || 'Belge yukle';
}

function getCalculateDescription(calcType: string): string {
  const descriptions: Record<string, string> = {
    'ortak-faiz': 'Ortaklar icin emsal faiz hesapla',
    'amortisman': 'Amortisman hesapla',
    'karsilik': 'Karsilik hesapla',
  };
  return descriptions[calcType] || 'Hesaplama yap';
}

// ═══════════════════════════════════════════════════════════════════
// ACTION HANDLERS (UI'dan cagrilacak)
// ═══════════════════════════════════════════════════════════════════

export interface ActionHandlers {
  onNavigate: (href: string) => void;
  onUpload: (uploadType: string) => void;
  onNote: (noteType: string, signalId: string) => void;
  onCalculate: (calcType: string, signalId: string) => void;
  onExternal: (url: string) => void;
}

export function executeAction(
  action: ActionDefinition,
  signalId: string,
  handlers: ActionHandlers
): void {
  switch (action.kind) {
    case 'navigate':
      if (action.href) handlers.onNavigate(action.href);
      break;
    case 'upload':
      if (action.uploadType) handlers.onUpload(action.uploadType);
      break;
    case 'note':
      if (action.noteType) handlers.onNote(action.noteType, signalId);
      break;
    case 'calculate':
      if (action.calcType) handlers.onCalculate(action.calcType, signalId);
      break;
    case 'external':
      if (action.externalUrl) handlers.onExternal(action.externalUrl);
      break;
  }
}

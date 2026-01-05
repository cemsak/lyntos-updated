// LYNTOS Upload Module Types
// NO DUMMY DATA - All based on real Turkish accounting standards

export type DocumentType =
  | 'beyanname_pdf'
  | 'tahakkuk_pdf'
  | 'mizan_excel'
  | 'mizan_csv'
  | 'e_berat_xml'
  | 'banka_ekstresi'
  | 'e_fatura_xml'
  | 'unknown';

export type AccountingSoftware =
  | 'luca' | 'logo' | 'mikro' | 'eta'
  | 'zirve' | 'netsis' | 'parasut' | 'dia' | 'unknown';

export type BeratType = 'YB' | 'KB' | 'DR';

export interface TurkishBank {
  code: string;
  name: string;
  shortName: string;
  isTaxPayment: boolean;
  isKatilim: boolean;
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: DocumentType;
  status: 'pending' | 'analyzing' | 'ready' | 'uploading' | 'complete' | 'error';
  progress: number;
  detectedPeriod?: string;
  detectedBank?: TurkishBank;
  detectedSoftware?: AccountingSoftware;
  beratType?: BeratType;
  vkn?: string;
  errors: string[];
  warnings: string[];
}

export interface UploadSession {
  id: string;
  smmm_id: string;
  client_id: string;
  period: string;
  files: UploadedFile[];
  requiredDocs: RequiredDocument[];
  createdAt: Date;
}

export interface RequiredDocument {
  type: DocumentType;
  label_tr: string;
  required: boolean;
  uploaded: boolean;
  fileId?: string;
}

export interface MizanRow {
  hesap_kodu: string;
  hesap_adi: string;
  borc: number;
  alacak: number;
  borc_bakiye: number;
  alacak_bakiye: number;
  donem?: string;
}

export interface EBeratData {
  vkn: string;
  donem: string;
  beratType: BeratType;
  parcaNo: string;
  toplamBorc: number;
  toplamAlacak: number;
  yevmiyeAdet: number;
  imzaTarihi: string;
  hash: string;
}

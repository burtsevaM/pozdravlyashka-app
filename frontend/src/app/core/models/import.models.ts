export type ImportedPerson = {
  fullName: string;
  birthDate: string;
  email?: string;
  department?: string;
};

export type ImportedGiftHistory = {
  giftName?: string;
  year?: number;
  comment?: string;
};

export type ImportPreviewRow = {
  rowNumber: number;
  valid: boolean;
  person: ImportedPerson | null;
  giftHistory: ImportedGiftHistory | null;
  errors: string[];
};

export type ImportPreviewResponse = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ImportPreviewRow[];
};

export type CommitImportRequestRow = {
  rowNumber?: number;
  person: ImportedPerson;
  giftHistory?: ImportedGiftHistory | null;
};

export type CommitImportRequest = {
  rows: CommitImportRequestRow[];
};

export type CommitImportError = {
  rowNumber?: number;
  fullName?: string;
  message: string;
};

export type CommitImportResponse = {
  createdPeople: number;
  createdGiftHistory: number;
  skippedRows: number;
  errors: CommitImportError[];
};

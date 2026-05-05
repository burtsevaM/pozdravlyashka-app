export type GiftHistory = {
  id: string;
  year: number | null;
  occasion: string | null;
  giftName: string;
  amount: number | null;
  organizerName: string | null;
  comment: string | null;
};

export type CreateGiftHistoryRequest = {
  giftName: string;
  year?: number;
  occasion?: string;
  amount?: number;
  organizerName?: string;
  comment?: string;
};

export type UpdateGiftHistoryRequest = Partial<CreateGiftHistoryRequest>;

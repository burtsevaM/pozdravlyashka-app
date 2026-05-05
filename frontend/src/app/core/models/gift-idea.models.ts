export type GiftIdea = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  link: string | null;
  proposedById: string | null;
  proposedByName: string | null;
  voteCount: number;
  votedByCurrentUser: boolean;
  isSelected: boolean;
  createdAt: string | null;
};

export type SelectedGiftIdea = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  link: string | null;
  proposedById: string | null;
  proposedByName: string | null;
};

export type CreateGiftIdeaRequest = {
  title: string;
  description?: string | null;
  price?: number | null;
  link?: string | null;
};

export type UpdateGiftIdeaRequest = Partial<CreateGiftIdeaRequest>;

export type VoteResult = GiftIdea[];

export type SelectedGiftRequest = {
  giftIdeaId: string;
};

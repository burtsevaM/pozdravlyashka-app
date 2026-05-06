export type ContributionStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export type Contribution = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  status: ContributionStatus;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContributionSummary = {
  budget: number | null;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paidCount: number;
  pendingCount: number;
  progressPercent: number;
  items: Contribution[];
};

export type CreateContributionRequest = {
  userId: string;
  amount: number;
  status?: ContributionStatus;
  comment?: string;
};

export type UpdateContributionRequest = {
  amount?: number;
  status?: ContributionStatus;
  comment?: string;
};

export type UpdateContributionStatusRequest = {
  status: ContributionStatus;
};

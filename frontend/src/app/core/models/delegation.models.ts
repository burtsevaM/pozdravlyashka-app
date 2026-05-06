export type Delegation = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  toUserId: string;
  toUserName: string;
  toUserEmail: string;
  startDate: string;
  endDate: string | null;
  reason: string | null;
  active: boolean;
  createdAt: string;
};

export type CreateDelegationRequest = {
  toUserId: string;
  startDate: string;
  endDate?: string;
  reason?: string;
};

export type AccountType = 'BANK' | 'MOBILE_MONEY' | 'CASH' | 'SAVINGS' | 'INVESTMENT';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string;
  icon: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountDto {
  name: string;
  type: AccountType;
  balance?: number;
  currency?: string;
  color: string;
  icon: string;
}

export interface UpdateAccountDto {
  name?: string;
  balance?: number;
  color?: string;
  icon?: string;
  isArchived?: boolean;
}

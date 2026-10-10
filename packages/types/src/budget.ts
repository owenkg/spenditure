export type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetDto {
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string;
}

export interface UpdateBudgetDto {
  amount?: number;
  period?: BudgetPeriod;
  endDate?: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  description: string;
  note?: string;
  date: string;
  toAccountId?: string;
  importSource?: string;
  externalRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionDto {
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  description: string;
  note?: string;
  date: string;
  toAccountId?: string;
}

export interface UpdateTransactionDto {
  categoryId?: string;
  description?: string;
  note?: string;
  date?: string;
}

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

import type { TransactionType } from './transaction';

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  parentId?: string;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  parentId?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  icon?: string;
  color?: string;
  parentId?: string;
}

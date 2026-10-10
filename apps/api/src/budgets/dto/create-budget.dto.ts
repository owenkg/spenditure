import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

enum BudgetPeriod {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export class CreateBudgetDto {
  @IsString()
  categoryId!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsEnum(BudgetPeriod)
  period!: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

import { IsDateString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateBudgetDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsEnum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
  period?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

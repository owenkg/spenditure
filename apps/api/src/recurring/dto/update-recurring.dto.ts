import { IsString, IsNumber, IsPositive, IsIn, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRecurringDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount?: number = undefined;

  @IsOptional()
  @IsString()
  description?: string = undefined;

  @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
  frequency?: string = undefined;

  @IsOptional()
  @IsDateString()
  nextDate?: string = undefined;

  @IsOptional()
  @IsDateString()
  endDate?: string = undefined;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = undefined;

  @IsOptional()
  @IsString()
  categoryId?: string = undefined;
}

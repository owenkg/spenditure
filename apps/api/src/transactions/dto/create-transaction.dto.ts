import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

export class CreateTransactionDto {
  @IsString()
  accountId!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsDateString()
  date!: string;

  @ValidateIf((o: CreateTransactionDto) => o.type === TransactionType.TRANSFER)
  @IsString()
  toAccountId?: string;

  @IsOptional()
  @IsString()
  importSource?: string;

  @IsOptional()
  @IsString()
  externalRef?: string;
}

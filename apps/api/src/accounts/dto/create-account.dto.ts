import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';

export enum AccountType {
  BANK = 'BANK',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CASH = 'CASH',
  SAVINGS = 'SAVINGS',
  INVESTMENT = 'INVESTMENT',
}

export class CreateAccountDto {
  @IsString()
  @Length(1, 60)
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color' })
  color!: string;

  @IsString()
  @Length(1, 40)
  icon!: string;
}

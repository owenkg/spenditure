import { IsEnum, IsHexColor, IsOptional, IsString, MinLength } from 'class-validator';

enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(CategoryType)
  type!: 'INCOME' | 'EXPENSE';

  @IsString()
  @MinLength(1)
  icon!: string;

  @IsHexColor()
  color!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

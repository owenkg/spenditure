import { IsString, Length, Matches } from 'class-validator';

export class SetupDto {
  @IsString()
  @Length(1, 60)
  name!: string;

  @IsString()
  @Matches(/^\d{4}$/, { message: 'pin must be exactly 4 digits' })
  pin!: string;
}

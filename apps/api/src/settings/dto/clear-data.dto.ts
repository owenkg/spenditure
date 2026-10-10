import { IsString, Length } from 'class-validator';

export class ClearDataDto {
  @IsString()
  @Length(4, 4)
  pin!: string;
}

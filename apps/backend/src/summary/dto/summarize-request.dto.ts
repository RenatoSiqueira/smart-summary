import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class SummarizeRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000, { message: 'Text must be less than 50,000 characters' })
  @MinLength(10, { message: 'Text must be at least 10 characters' })
  text: string;
}

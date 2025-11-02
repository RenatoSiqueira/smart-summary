import { IsString, IsNotEmpty } from 'class-validator';

export class SummarizeRequestDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

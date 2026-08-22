import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

// One field per seat rather than an array — keeps team/color assignment
// explicit at creation time instead of relying on array-index convention.
export class CreateGameDto {
  @IsString()
  @IsNotEmpty()
  whitePlayer1Id!: string;

  @IsString()
  @IsNotEmpty()
  whitePlayer2Id!: string;

  @IsString()
  @IsNotEmpty()
  blackPlayer1Id!: string;

  @IsString()
  @IsNotEmpty()
  blackPlayer2Id!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeControl?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  increment?: number;
}

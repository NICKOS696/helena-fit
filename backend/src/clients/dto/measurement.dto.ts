import { IsNumber, IsOptional, IsString, IsDateString, Min, Max } from 'class-validator';

// Один замер: все поля необязательны — клиент вносит что измерил.
export class CreateMeasurementDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(400)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(250)
  chest?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(250)
  waist?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(250)
  belly?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(250)
  hips?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(150)
  thigh?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  arm?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

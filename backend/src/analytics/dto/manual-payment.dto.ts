import {
  IsString,
  IsInt,
  IsPositive,
  IsIn,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateManualPaymentDto {
  @IsString()
  collectionId: string;

  @IsIn(['WORKOUT_COLLECTION', 'RECIPE_COLLECTION'])
  collectionType: 'WORKOUT_COLLECTION' | 'RECIPE_COLLECTION';

  @IsInt()
  @IsPositive()
  amount: number; // в сумах

  @IsOptional()
  @IsString()
  telegramId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}

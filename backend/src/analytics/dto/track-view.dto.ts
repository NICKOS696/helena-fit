import { IsEnum, IsString } from 'class-validator';

export enum ContentType {
  WORKOUT_COLLECTION = 'WORKOUT_COLLECTION',
  RECIPE_COLLECTION = 'RECIPE_COLLECTION',
  WORKOUT = 'WORKOUT',
  RECIPE = 'RECIPE',
  NEWS = 'NEWS',
}

export class TrackViewDto {
  @IsEnum(ContentType)
  itemType: ContentType;

  @IsString()
  itemId: string;
}

import { IsString, IsDateString, MaxLength, MinLength } from 'class-validator';

// Первичная анкета клиента — заполняется один раз в начале работы
export class QuestionnaireDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName: string;

  @IsDateString()
  birthDate: string;

  @IsString()
  @MaxLength(3000)
  health: string;
}

// Впечатление от тренировок — комментарий тренеру
export class FeedbackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}

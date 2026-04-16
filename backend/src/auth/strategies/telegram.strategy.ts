import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';

@Injectable()
export class TelegramStrategy extends PassportStrategy(Strategy, 'telegram') {
  async validate(req: any): Promise<any> {
    return req.user;
  }
}

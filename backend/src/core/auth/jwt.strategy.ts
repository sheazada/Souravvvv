import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('jwtSecret') ?? process.env.JWT_SECRET ?? 'change-me',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateJwtPayload(
      payload.sub,
      payload.organizationId,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    return user;
  }
}

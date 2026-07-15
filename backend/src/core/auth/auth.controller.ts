import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SendOtpDto,
  VerifyOtpDto,
} from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Headers('x-device-id') deviceId: string | undefined,
    @Req() req: Request,
  ) {
    return this.authService.login(dto, {
      deviceId,
      ipAddress: req.ip,
    });
  }

  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('verify-otp')
  verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Headers('x-device-id') deviceId: string | undefined,
    @Req() req: Request,
  ) {
    return this.authService.verifyOtp(dto, {
      deviceId,
      ipAddress: req.ip,
    });
  }

  @Post('login-otp')
  loginOtp(
    @Body() dto: VerifyOtpDto,
    @Headers('x-device-id') deviceId: string | undefined,
    @Req() req: Request,
  ) {
    return this.authService.verifyOtp(dto, {
      deviceId,
      ipAddress: req.ip,
    });
  }

  @Post('refresh')
  refresh(
    @Body() dto: RefreshTokenDto,
    @Headers('x-device-id') deviceId: string | undefined,
    @Req() req: Request,
  ) {
    return this.authService.refreshToken(dto, {
      deviceId,
      ipAddress: req.ip,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.logout(currentUser);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  logoutAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.logoutAll(currentUser);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.getCurrentUser(currentUser);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-permissions')
  myPermissions(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.getMyPermissions(currentUser);
  }
}

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SendOtpDto,
  VerifyOtpDto,
} from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

type UserWithAccess = User & {
  userRoles: Array<{
    role: {
      code: string;
      rolePermissions: Array<{
        permission: {
          code: string;
        };
      }>;
    };
  }>;
};

@Injectable()
export class AuthService {
  private readonly otpStore = new Map<
    string,
    { otp: string; purpose: string; expiresAt: number }
  >();

  private readonly passwordResetStore = new Map<
    string,
    { userId: string; expiresAt: number }
  >();

  private readonly accessTokenTtl: string;
  private readonly refreshTokenTtlDays: number;
  private readonly devSeedPassword: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenTtl =
      process.env.AUTH_ACCESS_TOKEN_TTL ??
      this.configService.get<string>('authAccessTokenTtl') ??
      '12h';
    this.refreshTokenTtlDays = Number(
      process.env.AUTH_REFRESH_TOKEN_TTL_DAYS ??
        this.configService.get<number>('authRefreshTokenTtlDays') ??
        30,
    );
    this.devSeedPassword =
      process.env.DEV_SEED_PASSWORD ??
      this.configService.get<string>('devSeedPassword') ??
      'Password@123';
  }

  async login(dto: LoginDto, requestMeta?: { deviceId?: string; ipAddress?: string }) {
    const user = await this.findActiveUserByLogin(dto.login);

    if (!user) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    const passwordValid = await this.verifyPassword(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    return this.issueTokens(user, requestMeta);
  }

  async sendOtp(dto: SendOtpDto) {
    const otp = this.generateOtp();
    this.otpStore.set(dto.mobile, {
      otp,
      purpose: dto.purpose ?? 'login',
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return {
      success: true,
      message: 'OTP generated successfully',
      data: {
        mobile: dto.mobile,
        purpose: dto.purpose ?? 'login',
        expiresInSeconds: 300,
        devOtp:
          this.configService.get<string>('nodeEnv') === 'production' ? undefined : otp,
      },
    };
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    requestMeta?: { deviceId?: string; ipAddress?: string },
  ) {
    const otpState = this.otpStore.get(dto.mobile);

    if (!otpState || otpState.expiresAt < Date.now()) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    if (otpState.otp !== dto.otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const user = await this.findActiveUserByLogin(dto.mobile);
    if (!user) {
      throw new UnauthorizedException('User not found for OTP login');
    }

    this.otpStore.delete(dto.mobile);
    return this.issueTokens(user, requestMeta);
  }

  async refreshToken(
    dto: RefreshTokenDto,
    requestMeta?: { deviceId?: string; ipAddress?: string },
  ) {
    const refreshTokenHash = this.hashToken(dto.refreshToken);

    const session = await this.prisma.userSession.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.findActiveUserById(session.userId);
    if (!user) {
      throw new UnauthorizedException('User session is no longer valid');
    }

    return this.issueTokens(user, requestMeta, session.id);
  }

  async logout(currentUser?: AuthenticatedUser) {
    if (!currentUser?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    await this.prisma.userSession.updateMany({
      where: {
        userId: currentUser.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Logged out successfully',
      data: { userId: currentUser.id },
    };
  }

  async logoutAll(currentUser?: AuthenticatedUser) {
    return this.logout(currentUser);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findActiveUserByLogin(dto.login);

    if (!user) {
      return {
        success: true,
        message: 'If the account exists, a reset instruction has been generated',
        data: {},
      };
    }

    const resetToken = randomUUID();
    this.passwordResetStore.set(resetToken, {
      userId: user.id,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    return {
      success: true,
      message: 'Password reset token generated',
      data: {
        login: dto.login,
        expiresInSeconds: 900,
        devResetToken:
          this.configService.get<string>('nodeEnv') === 'production'
            ? undefined
            : resetToken,
      },
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetState = this.passwordResetStore.get(dto.token);

    if (!resetState || resetState.expiresAt < Date.now()) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: resetState.userId },
      data: { passwordHash },
    });

    await this.prisma.userSession.updateMany({
      where: { userId: resetState.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.passwordResetStore.delete(dto.token);

    return {
      success: true,
      message: 'Password reset successfully',
      data: {},
    };
  }

  async getCurrentUser(currentUser?: AuthenticatedUser) {
    if (!currentUser?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.findActiveUserById(currentUser.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      success: true,
      message: 'Current user fetched successfully',
      data: this.toAuthenticatedUser(user),
    };
  }

  async getMyPermissions(currentUser?: AuthenticatedUser) {
    if (!currentUser?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.findActiveUserById(currentUser.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const authUser = this.toAuthenticatedUser(user);

    return {
      success: true,
      message: 'Permissions fetched successfully',
      data: {
        roles: authUser.roles,
        permissions: authUser.permissions,
      },
    };
  }

  async validateJwtPayload(userId: string, organizationId: string) {
    const user = await this.findActiveUserById(userId);

    if (!user || user.organizationId !== organizationId) {
      return null;
    }

    return this.toAuthenticatedUser(user);
  }

  private async findActiveUserByLogin(login: string) {
    return this.prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [
          { mobile: login },
          { email: { equals: login, mode: 'insensitive' } },
        ],
      },
      include: this.userAccessInclude,
    });
  }

  private async findActiveUserById(userId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
      },
      include: this.userAccessInclude,
    });
  }

  private get userAccessInclude() {
    return {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    } as const;
  }

  private async verifyPassword(password: string, passwordHash: string | null) {
    if (!passwordHash) {
      return false;
    }

    if (passwordHash === 'replace-with-real-password-hash') {
      return password === this.devSeedPassword;
    }

    return bcrypt.compare(password, passwordHash);
  }

  private toAuthenticatedUser(user: UserWithAccess): AuthenticatedUser {
    const roles = user.userRoles.map((item) => item.role.code);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((item) =>
          item.role.rolePermissions.map((permission) => permission.permission.code),
        ),
      ),
    );

    return {
      id: user.id,
      organizationId: user.organizationId,
      retailerId: user.retailerId,
      employeeId: user.employeeId,
      fullName: user.fullName,
      mobile: user.mobile,
      userType: user.userType,
      roles,
      permissions,
    };
  }

  private async issueTokens(
    user: UserWithAccess,
    requestMeta?: { deviceId?: string; ipAddress?: string },
    existingSessionId?: string,
  ) {
    const authUser = this.toAuthenticatedUser(user);
    const payload: JwtPayload = {
      sub: authUser.id,
      organizationId: authUser.organizationId,
      retailerId: authUser.retailerId,
      employeeId: authUser.employeeId,
      userType: authUser.userType,
      roles: authUser.roles,
      permissions: authUser.permissions,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.accessTokenTtl,
    });

    const refreshToken = randomBytes(48).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);
    const refreshTokenExpiresAt = new Date(
      Date.now() + this.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );

    if (existingSessionId) {
      await this.prisma.userSession.update({
        where: { id: existingSessionId },
        data: {
          refreshTokenHash,
          expiresAt: refreshTokenExpiresAt,
          revokedAt: null,
          deviceId: requestMeta?.deviceId,
          ipAddress: requestMeta?.ipAddress,
        },
      });
    } else {
      await this.prisma.userSession.create({
        data: {
          userId: authUser.id,
          deviceId: requestMeta?.deviceId,
          ipAddress: requestMeta?.ipAddress,
          refreshTokenHash,
          expiresAt: refreshTokenExpiresAt,
        },
      });
    }

    await this.prisma.user.update({
      where: { id: authUser.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      success: true,
      message: 'Authentication successful',
      data: {
        accessToken,
        refreshToken,
        user: authUser,
        expiresIn: this.accessTokenTtl,
      },
    };
  }

  private generateOtp() {
    if (this.configService.get<string>('nodeEnv') !== 'production') {
      return '123456';
    }

    return String(randomInt(100000, 999999));
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}

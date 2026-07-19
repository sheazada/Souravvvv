import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { UpdateOrganizationDto } from './dto';
import { OrganizationService } from './organization.service';

@UseGuards(JwtAuthGuard)
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get('profile')
  getProfile(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.organizationService.getProfile(currentUser);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: UpdateOrganizationDto) {
    return this.organizationService.updateProfile(currentUser, dto);
  }
}

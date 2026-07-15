export interface JwtPayload {
  sub: string;
  organizationId: string;
  retailerId?: string | null;
  employeeId?: string | null;
  userType: string;
  roles: string[];
  permissions: string[];
}

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  retailerId?: string | null;
  employeeId?: string | null;
  fullName: string;
  mobile: string;
  userType: string;
  roles: string[];
  permissions: string[];
}

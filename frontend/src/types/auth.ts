export type AppRole = 'OWNER' | 'OPERATIONS_ADMIN' | 'ACCOUNTANT' | 'SALESPERSON' | 'DRIVER' | 'RETAILER';

export type CurrentUser = {
  id: string;
  organizationId: string;
  retailerId?: string | null;
  employeeId?: string | null;
  fullName: string;
  mobile: string;
  userType: string;
  roles: AppRole[];
  permissions: string[];
};

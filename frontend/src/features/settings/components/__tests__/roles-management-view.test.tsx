import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RolesManagementView } from '../roles-management-view';

const mockGetRoles = vi.fn();
const mockCreateRole = vi.fn();
const mockDeleteRole = vi.fn();
const mockGetPermissions = vi.fn();
const mockAssignRolePermissions = vi.fn();

vi.mock('../../api', () => ({
  SettingsApi: {
    getRoles: (...args: any[]) => mockGetRoles(...args),
    createRole: (...args: any[]) => mockCreateRole(...args),
    deleteRole: (...args: any[]) => mockDeleteRole(...args),
    getPermissions: (...args: any[]) => mockGetPermissions(...args),
    assignRolePermissions: (...args: any[]) => mockAssignRolePermissions(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'settings-roles') {
        return {
          data: mockGetRoles(),
          isLoading: false,
        };
      }
      if (queryKey[0] === 'settings-permissions-all') {
        return {
          data: mockGetPermissions(),
          isLoading: false,
        };
      }
      return { data: null, isLoading: false };
    },
    useMutation: ({ mutationFn, onSuccess }: any) => ({
      mutate: async (...args: any[]) => {
        const res = await mutationFn(...args);
        onSuccess?.(res);
      },
      isPending: false,
    }),
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

describe('RolesManagementView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRoles.mockReturnValue({
      success: true,
      data: [
        {
          id: 'role-1',
          code: 'WAREHOUSE_MGR',
          name: 'Warehouse Manager',
          description: 'Handles stock',
          isSystemRole: false,
          permissions: [{ id: 'perm-1', code: 'inventory:read', module: 'inventory' }],
          _count: { userRoles: 1, rolePermissions: 1 },
        },
        {
          id: 'role-2',
          code: 'SYS_ADMIN',
          name: 'System Admin',
          description: 'Protected role',
          isSystemRole: true,
          permissions: [],
          _count: { userRoles: 1, rolePermissions: 10 },
        },
      ],
      meta: { page: 1, limit: 15, total: 2, totalPages: 1 },
    });
    mockGetPermissions.mockReturnValue({
      success: true,
      data: [
        { id: 'perm-1', code: 'inventory:read', module: 'inventory' },
        { id: 'perm-2', code: 'inventory:write', module: 'inventory' },
      ],
    });
  });

  it('renders roles list with system protection tags', () => {
    render(<RolesManagementView />);
    expect(screen.getByText('Roles & Access Permissions Checklist')).toBeInTheDocument();
    expect(screen.getByText('WAREHOUSE_MGR')).toBeInTheDocument();
    expect(screen.getByText('SYS_ADMIN')).toBeInTheDocument();
    expect(screen.getByText('Predefined System')).toBeInTheDocument();
  });

  it('opens custom role creation modal and submits new role', async () => {
    mockCreateRole.mockResolvedValue({ success: true });

    render(<RolesManagementView />);
    fireEvent.click(screen.getByText('Create Custom Role'));

    expect(screen.getByText('Create Custom Backoffice Role')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('e.g. WAREHOUSE_MGR'), { target: { value: 'LOGISTICS_REP' } });
    fireEvent.change(screen.getByPlaceholderText('Warehouse Manager'), { target: { value: 'Logistics Rep' } });

    fireEvent.click(screen.getByText('Save Role'));

    await waitFor(() => {
      expect(mockCreateRole).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'LOGISTICS_REP',
          name: 'Logistics Rep',
        }),
      );
    });
  });

  it('opens capabilities checklist modal for custom role and assigns permissions', async () => {
    mockAssignRolePermissions.mockResolvedValue({ success: true });

    render(<RolesManagementView />);
    fireEvent.click(screen.getByText('Edit Checklist'));

    expect(screen.getByText('Edit Capabilities:')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Update Capabilities'));

    await waitFor(() => {
      expect(mockAssignRolePermissions).toHaveBeenCalledWith('role-1', ['inventory:read']);
    });
  });
});

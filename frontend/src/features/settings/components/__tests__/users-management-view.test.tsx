import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UsersManagementView } from '../users-management-view';

const mockGetUsers = vi.fn();
const mockCreateUser = vi.fn();
const mockResetUserPassword = vi.fn();
const mockDeactivateUser = vi.fn();
const mockGetRoles = vi.fn();

vi.mock('../../api', () => ({
  SettingsApi: {
    getUsers: (...args: any[]) => mockGetUsers(...args),
    createUser: (...args: any[]) => mockCreateUser(...args),
    resetUserPassword: (...args: any[]) => mockResetUserPassword(...args),
    deactivateUser: (...args: any[]) => mockDeactivateUser(...args),
    getRoles: (...args: any[]) => mockGetRoles(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'settings-users') {
        return {
          data: mockGetUsers(),
          isLoading: false,
          isError: false,
        };
      }
      if (queryKey[0] === 'settings-roles-all') {
        return {
          data: mockGetRoles(),
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

describe('UsersManagementView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUsers.mockReturnValue({
      success: true,
      data: [
        {
          id: 'user-1',
          fullName: 'Ravi Kumar',
          mobile: '9999999999',
          email: 'ravi@sudha.com',
          userType: 'employee',
          isActive: true,
          createdAt: '2026-07-15T10:00:00.000Z',
          roles: [{ id: 'role-1', code: 'STAFF', name: 'Staff' }],
        },
      ],
      meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
    });
    mockGetRoles.mockReturnValue({
      success: true,
      data: [{ id: 'role-1', code: 'STAFF', name: 'Staff' }],
    });
  });

  it('renders user list and displays assigned roles', () => {
    render(<UsersManagementView />);
    expect(screen.getByText('User & Account Administration')).toBeInTheDocument();
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getByText('STAFF')).toBeInTheDocument();
  });

  it('opens create account modal and provisions account upon submit', async () => {
    mockCreateUser.mockResolvedValue({ success: true, data: { id: 'user-new' } });

    render(<UsersManagementView />);
    fireEvent.click(screen.getByText('Create New Account'));

    expect(screen.getByText('Create Backoffice Account')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('e.g. Ravi Kumar'), { target: { value: 'Amit Sales' } });
    fireEvent.change(screen.getByPlaceholderText('10-digit mobile'), { target: { value: '9898989898' } });
    fireEvent.change(screen.getByPlaceholderText('Min 6 chars'), { target: { value: 'Secret@123' } });

    fireEvent.click(screen.getByText('Provision Account'));

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Amit Sales',
          mobile: '9898989898',
          password: 'Secret@123',
        }),
      );
    });
  });

  it('opens force password reset modal and submits new key', async () => {
    mockResetUserPassword.mockResolvedValue({ success: true });
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<UsersManagementView />);
    fireEvent.click(screen.getByTitle('Force Password Reset'));

    expect(screen.getByText('Force Password Reset')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Enter new 6+ char password'), { target: { value: 'NewSecure@456' } });

    fireEvent.click(screen.getByText('Reset Key & Revoke Sessions'));

    await waitFor(() => {
      expect(mockResetUserPassword).toHaveBeenCalledWith('user-1', 'NewSecure@456');
    });
  });
});

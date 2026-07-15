import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditLogsView } from '../audit-logs-view';

const mockGetAuditLogs = vi.fn();

vi.mock('../../api', () => ({
  SettingsApi: {
    getAuditLogs: (...args: any[]) => mockGetAuditLogs(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'audit-logs') {
        return {
          data: mockGetAuditLogs(),
          isLoading: false,
          isError: false,
        };
      }
      return { data: null, isLoading: false };
    },
  };
});

describe('AuditLogsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuditLogs.mockReturnValue({
      success: true,
      data: [
        {
          id: 'log-1',
          organizationId: 'org-1',
          module: 'procurement',
          entityType: 'purchase_order',
          entityId: 'PO-001',
          action: 'update_demand_extras',
          beforeJson: { extraQty: 2 },
          afterJson: { extraQty: 5 },
          createdAt: '2026-07-15T12:00:00.000Z',
          user: { id: 'user-1', fullName: 'Ravi Manager', userType: 'owner' },
        },
      ],
      meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
    });
  });

  it('renders system audit trail table with action and user details', () => {
    render(<AuditLogsView />);
    expect(screen.getByText('System Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('update_demand_extras')).toBeInTheDocument();
    expect(screen.getByText('procurement')).toBeInTheDocument();
    expect(screen.getByText('Ravi Manager')).toBeInTheDocument();
  });

  it('opens mutation details modal when Inspect button is clicked', () => {
    render(<AuditLogsView />);
    fireEvent.click(screen.getByText('Inspect'));

    expect(screen.getByText('Audit Mutation Details')).toBeInTheDocument();
    expect(screen.getByText('Before Mutation')).toBeInTheDocument();
    expect(screen.getByText('After Mutation')).toBeInTheDocument();
  });
});

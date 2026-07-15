import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseQuery = vi.fn();
let capturedProps: Record<string, unknown> | null = null;

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock('@/components/ui/searchable-select', () => ({
  SearchableSelect: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid="searchable-select-props">{String(props.placeholder ?? '')}</div>;
  },
}));

import { LookupInput } from '../lookup-input';

describe('LookupInput', () => {
  beforeEach(() => {
    capturedProps = null;
    mockUseQuery.mockReset();
  });

  it('shows loading placeholder while lookup query is loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(
      <LookupInput
        resource="brands"
        value=""
        onChange={() => undefined}
        placeholder="Select brand"
      />,
    );

    expect(screen.getByTestId('searchable-select-props')).toHaveTextContent('Loading options...');
    expect(capturedProps?.placeholder).toBe('Loading options...');
  });

  it('maps fetched tax code lookups into searchable select options', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: 'tax-1',
          code: 'GST5',
          hsnCode: '0401',
          gstRate: 5,
          cgstRate: 2.5,
          sgstRate: 2.5,
          igstRate: 5,
          isActive: true,
        },
      ],
      isLoading: false,
      error: null,
    });

    render(
      <LookupInput
        resource="taxCodes"
        value="tax-1"
        onChange={() => undefined}
        placeholder="Select tax code"
      />,
    );

    expect(capturedProps?.options).toEqual([
      {
        value: 'tax-1',
        label: 'GST5',
        description: 'HSN 0401 • GST 5%',
      },
    ]);
  });

  it('uses non-custom error empty text when lookup fails and custom values are disabled', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Lookup failed') });

    render(
      <LookupInput
        resource="units"
        value=""
        onChange={() => undefined}
        placeholder="Select unit"
        allowCustomValue={false}
        allowClear
      />,
    );

    expect(capturedProps?.emptyText).toBe('Lookup failed. Retry or refresh.');
    expect(capturedProps?.allowClear).toBe(true);
    expect(capturedProps?.allowCustomValue).toBe(false);
  });
});

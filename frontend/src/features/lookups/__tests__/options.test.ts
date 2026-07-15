import { describe, expect, it } from 'vitest';
import { lookupOptions } from '../options';

describe('lookupOptions', () => {
  it('maps brand lookups to simple label/value options', () => {
    const result = lookupOptions.brands([
      { id: 'brand-1', name: 'Sudha', isActive: true },
      { id: 'brand-2', name: 'Paras', isActive: true },
    ]);

    expect(result).toEqual([
      { value: 'brand-1', label: 'Sudha' },
      { value: 'brand-2', label: 'Paras' },
    ]);
  });

  it('maps product category lookups with parent description', () => {
    const result = lookupOptions.productCategories([
      {
        id: 'cat-1',
        name: 'Milk',
        isActive: true,
        parentId: 'cat-parent',
        parent: { id: 'cat-parent', name: 'Dairy' },
      },
    ]);

    expect(result).toEqual([
      {
        value: 'cat-1',
        label: 'Milk',
        description: 'Parent: Dairy',
      },
    ]);
  });

  it('maps tax code lookups with HSN and GST rate summary', () => {
    const result = lookupOptions.taxCodes([
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
    ]);

    expect(result).toEqual([
      {
        value: 'tax-1',
        label: 'GST5',
        description: 'HSN 0401 • GST 5%',
      },
    ]);
  });

  it('maps unit and crate type lookups to readable admin selector labels', () => {
    const unitOptions = lookupOptions.units([
      {
        id: 'unit-1',
        code: 'LTR',
        name: 'Litre',
        decimalPlaces: 3,
      },
    ]);

    const crateOptions = lookupOptions.crateTypes([
      {
        id: 'crate-1',
        code: 'CR24',
        name: '24 Bottle Crate',
      },
    ]);

    expect(unitOptions).toEqual([
      {
        value: 'unit-1',
        label: 'Litre (LTR)',
        description: 'Decimals: 3',
      },
    ]);

    expect(crateOptions).toEqual([
      {
        value: 'crate-1',
        label: '24 Bottle Crate (CR24)',
      },
    ]);
  });
});

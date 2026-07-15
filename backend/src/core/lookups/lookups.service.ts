import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryLookupDto } from './dto';

@Injectable()
export class LookupsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRetailers(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.RetailerWhereInput = {
      organizationId: actor.organizationId,
      businessStatus: { not: 'inactive' },
    };

    if (query.search) {
      where.OR = [
        { shopName: { contains: query.search, mode: 'insensitive' } },
        { retailerCode: { contains: query.search, mode: 'insensitive' } },
        { ownerName: { contains: query.search, mode: 'insensitive' } },
        { mobile: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.retailer.findMany({
      where,
      orderBy: { shopName: 'asc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        retailerCode: true,
        shopName: true,
        ownerName: true,
        mobile: true,
        orderingMode: true,
      },
    });
  }

  async getSuppliers(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.SupplierWhereInput = {
      organizationId: actor.organizationId,
      isActive: true,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { supplierCode: { contains: query.search, mode: 'insensitive' } },
        { mobile: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        supplierCode: true,
        name: true,
        contactPerson: true,
        mobile: true,
      },
    });
  }

  async getRoutes(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.RouteWhereInput = {
      organizationId: actor.organizationId,
      isActive: true,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.route.findMany({
      where,
      orderBy: { name: 'asc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        code: true,
        name: true,
        deliveryShift: true,
        areaId: true,
      },
    });
  }

  async getDeliveryCycles(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.DeliveryCycleWhereInput = {
      organizationId: actor.organizationId,
    };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { cycleCode: { contains: query.search, mode: 'insensitive' } },
        { deliveryShift: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.deliveryCycle.findMany({
      where,
      orderBy: [{ deliveryDate: 'desc' }, { cycleCode: 'asc' }],
      take: query.limit ?? 100,
      select: {
        id: true,
        cycleCode: true,
        orderDate: true,
        deliveryDate: true,
        deliveryShift: true,
        status: true,
      },
    });
  }

  async getVehicles(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.VehicleWhereInput = {
      organizationId: actor.organizationId,
      isActive: true,
    };
    if (query.search) {
      where.OR = [
        { vehicleNo: { contains: query.search, mode: 'insensitive' } },
        { vehicleType: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.vehicle.findMany({
      where,
      orderBy: { vehicleNo: 'asc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        vehicleNo: true,
        vehicleType: true,
        driverEmployeeId: true,
      },
    });
  }

  async getEmployees(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.EmployeeWhereInput = {
      organizationId: actor.organizationId,
      isActive: true,
    };
    if (query.designation) {
      where.designation = { contains: query.designation, mode: 'insensitive' };
    }
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { employeeCode: { contains: query.search, mode: 'insensitive' } },
        { mobile: { contains: query.search, mode: 'insensitive' } },
        { designation: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.employee.findMany({
      where,
      orderBy: { fullName: 'asc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        designation: true,
        mobile: true,
      },
    });
  }

  async getWarehouses(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.WarehouseWhereInput = {
      organizationId: actor.organizationId,
      isActive: true,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.warehouse.findMany({
      where,
      orderBy: { name: 'asc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        code: true,
        name: true,
        warehouseType: true,
      },
    });
  }

  async getProductVariants(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.ProductVariantWhereInput = {
      organizationId: actor.organizationId,
      status: 'active',
    };
    if (query.search) {
      where.OR = [
        { sku: { contains: query.search, mode: 'insensitive' } },
        { variantName: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
        { product: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }
    return this.prisma.productVariant.findMany({
      where,
      orderBy: [{ product: { name: 'asc' } }, { variantName: 'asc' }],
      take: query.limit ?? 100,
      select: {
        id: true,
        sku: true,
        variantName: true,
        barcode: true,
        product: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getDemandConsolidations(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.DemandConsolidationWhereInput = {
      organizationId: actor.organizationId,
    };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { consolidationNo: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.demandConsolidation.findMany({
      where,
      orderBy: { consolidationDate: 'desc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        consolidationNo: true,
        status: true,
        deliveryCycleId: true,
        deliveryCycle: {
          select: {
            cycleCode: true,
            deliveryDate: true,
            deliveryShift: true,
          },
        },
      },
    });
  }

  async getSalesOrders(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.SalesOrderWhereInput = {
      organizationId: actor.organizationId,
    };
    if (query.status) where.status = query.status;
    if (query.routeId) where.routeId = query.routeId;
    if (query.deliveryCycleId) where.deliveryCycleId = query.deliveryCycleId;
    if (query.search) {
      where.OR = [
        { orderNo: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.salesOrder.findMany({
      where,
      orderBy: { orderDate: 'desc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        orderNo: true,
        status: true,
        source: true,
        retailerId: true,
      },
    });

    const retailerIds = [...new Set(rows.map((row) => row.retailerId))];
    const retailers = retailerIds.length
      ? await this.prisma.retailer.findMany({
          where: { organizationId: actor.organizationId, id: { in: retailerIds } },
          select: { id: true, retailerCode: true, shopName: true },
        })
      : [];
    const retailerMap = new Map<string, any>(retailers.map((row): [string, any] => [row.id, row]));

    return rows.map((row) => ({
      ...row,
      retailer: retailerMap.get(row.retailerId) ?? null,
    }));
  }

  async getDispatchTrips(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.DispatchTripWhereInput = {
      organizationId: actor.organizationId,
    };
    if (query.status) where.status = query.status;
    if (query.routeId) where.routeId = query.routeId;
    if (query.deliveryCycleId) where.deliveryCycleId = query.deliveryCycleId;
    if (query.search) {
      where.OR = [{ tripNo: { contains: query.search, mode: 'insensitive' } }];
    }

    const rows = await this.prisma.dispatchTrip.findMany({
      where,
      orderBy: { dispatchDate: 'desc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        tripNo: true,
        status: true,
        routeId: true,
      },
    });

    const routeIds = [...new Set(rows.map((row) => row.routeId))];
    const routes = routeIds.length
      ? await this.prisma.route.findMany({
          where: { organizationId: actor.organizationId, id: { in: routeIds } },
          select: { id: true, code: true, name: true },
        })
      : [];
    const routeMap = new Map<string, any>(routes.map((row): [string, any] => [row.id, row]));

    return rows.map((row) => ({
      ...row,
      route: routeMap.get(row.routeId) ?? null,
    }));
  }

  async getSalesInvoices(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.SalesInvoiceWhereInput = {
      organizationId: actor.organizationId,
    };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [{ invoiceNo: { contains: query.search, mode: 'insensitive' } }];
    }

    const rows = await this.prisma.salesInvoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        invoiceNo: true,
        status: true,
        retailerId: true,
      },
    });

    const retailerIds = [...new Set(rows.map((row) => row.retailerId))];
    const retailers = retailerIds.length
      ? await this.prisma.retailer.findMany({
          where: { organizationId: actor.organizationId, id: { in: retailerIds } },
          select: { id: true, retailerCode: true, shopName: true },
        })
      : [];
    const retailerMap = new Map<string, any>(retailers.map((row): [string, any] => [row.id, row]));

    return rows.map((row) => ({
      ...row,
      retailer: retailerMap.get(row.retailerId) ?? null,
    }));
  }

  async getPurchaseOrders(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.PurchaseOrderWhereInput = {
      organizationId: actor.organizationId,
    };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [{ poNo: { contains: query.search, mode: 'insensitive' } }];
    }

    const rows = await this.prisma.purchaseOrder.findMany({
      where,
      orderBy: { poDate: 'desc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        poNo: true,
        status: true,
        supplierId: true,
      },
    });

    const supplierIds = [...new Set(rows.map((row) => row.supplierId))];
    const suppliers = supplierIds.length
      ? await this.prisma.supplier.findMany({
          where: { organizationId: actor.organizationId, id: { in: supplierIds } },
          select: { id: true, supplierCode: true, name: true },
        })
      : [];
    const supplierMap = new Map<string, any>(suppliers.map((row): [string, any] => [row.id, row]));

    return rows.map((row) => ({
      ...row,
      supplier: supplierMap.get(row.supplierId) ?? null,
    }));
  }

  async getPurchaseOrderItems(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.PurchaseOrderItemWhereInput = {
      organizationId: actor.organizationId,
    };
    if (query.purchaseOrderId) where.purchaseOrderId = query.purchaseOrderId;

    const rows = await this.prisma.purchaseOrderItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        purchaseOrderId: true,
        orderedQty: true,
        variantId: true,
      },
    });

    const purchaseOrderIds = [...new Set(rows.map((row) => row.purchaseOrderId))];
    const variantIds = [...new Set(rows.map((row) => row.variantId))];

    const [purchaseOrders, variants] = await Promise.all([
      purchaseOrderIds.length
        ? this.prisma.purchaseOrder.findMany({
            where: { organizationId: actor.organizationId, id: { in: purchaseOrderIds } },
            select: { id: true, poNo: true, status: true },
          })
        : [],
      variantIds.length
        ? this.prisma.productVariant.findMany({
            where: {
              organizationId: actor.organizationId,
              id: { in: variantIds },
              ...(query.search
                ? {
                    OR: [
                      { sku: { contains: query.search, mode: 'insensitive' } },
                      { variantName: { contains: query.search, mode: 'insensitive' } },
                      { product: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
                    ],
                  }
                : {}),
            },
            select: {
              id: true,
              sku: true,
              variantName: true,
              product: { select: { name: true } },
            },
          })
        : [],
    ]);

    const poMap = new Map<string, any>(purchaseOrders.map((row): [string, any] => [row.id, row]));
    const variantMap = new Map<string, any>(variants.map((row): [string, any] => [row.id, row]));

    return rows
      .filter((row) => !query.search || variantMap.has(row.variantId))
      .map((row) => ({
        ...row,
        purchaseOrder: poMap.get(row.purchaseOrderId) ?? null,
        variant: variantMap.get(row.variantId) ?? null,
      }));
  }

  async getPurchaseInvoices(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.PurchaseInvoiceWhereInput = {
      organizationId: actor.organizationId,
    };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [{ invoiceNo: { contains: query.search, mode: 'insensitive' } }];
    }

    const rows = await this.prisma.purchaseInvoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        invoiceNo: true,
        status: true,
        supplierId: true,
      },
    });

    const supplierIds = [...new Set(rows.map((row) => row.supplierId))];
    const suppliers = supplierIds.length
      ? await this.prisma.supplier.findMany({
          where: { organizationId: actor.organizationId, id: { in: supplierIds } },
          select: { id: true, supplierCode: true, name: true },
        })
      : [];
    const supplierMap = new Map<string, any>(suppliers.map((row): [string, any] => [row.id, row]));

    return rows.map((row) => ({
      ...row,
      supplier: supplierMap.get(row.supplierId) ?? null,
    }));
  }

  async getInventoryBatches(actor: AuthenticatedUser, query: QueryLookupDto) {
    const variantIds = query.search
      ? (
          await this.prisma.productVariant.findMany({
            where: {
              organizationId: actor.organizationId,
              OR: [
                { sku: { contains: query.search, mode: 'insensitive' } },
                { variantName: { contains: query.search, mode: 'insensitive' } },
                { product: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
              ],
            },
            select: { id: true },
          })
        ).map((row) => row.id)
      : undefined;

    const where: Prisma.InventoryBatchWhereInput = {
      organizationId: actor.organizationId,
      ...(query.search
        ? {
            OR: [
              { batchNo: { contains: query.search, mode: 'insensitive' } },
              ...(variantIds?.length ? [{ variantId: { in: variantIds } }] : []),
            ],
          }
        : {}),
    };

    const rows = await this.prisma.inventoryBatch.findMany({
      where,
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
      take: query.limit ?? 100,
      select: {
        id: true,
        batchNo: true,
        expiryDate: true,
        variantId: true,
      },
    });

    const batchVariantIds = [...new Set(rows.map((row) => row.variantId))];
    const variants = batchVariantIds.length
      ? await this.prisma.productVariant.findMany({
          where: { organizationId: actor.organizationId, id: { in: batchVariantIds } },
          select: {
            id: true,
            sku: true,
            variantName: true,
            product: { select: { name: true } },
          },
        })
      : [];
    const variantMap = new Map<string, any>(variants.map((row): [string, any] => [row.id, row]));

    return rows.map((row) => ({
      ...row,
      variant: variantMap.get(row.variantId) ?? null,
    }));
  }

  async getBrands(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.BrandWhereInput = {
      organizationId: actor.organizationId,
      isActive: true,
    };
    if (query.search) {
      where.OR = [{ name: { contains: query.search, mode: 'insensitive' } }];
    }
    return this.prisma.brand.findMany({
      where,
      orderBy: { name: 'asc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });
  }

  async getProductCategories(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.ProductCategoryWhereInput = {
      organizationId: actor.organizationId,
      isActive: true,
    };
    if (query.search) {
      where.OR = [{ name: { contains: query.search, mode: 'insensitive' } }];
    }
    return this.prisma.productCategory.findMany({
      where,
      orderBy: [{ parentId: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }],
      take: query.limit ?? 100,
      select: {
        id: true,
        name: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        isActive: true,
      },
    });
  }

  async getTaxCodes(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.TaxCodeWhereInput = {
      organizationId: actor.organizationId,
      isActive: true,
    };
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { hsnCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.taxCode.findMany({
      where,
      orderBy: { code: 'asc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        code: true,
        hsnCode: true,
        gstRate: true,
        cgstRate: true,
        sgstRate: true,
        igstRate: true,
        isActive: true,
      },
    });
  }

  async getUnits(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.UnitWhereInput = {
      organizationId: actor.organizationId,
    };
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.unit.findMany({
      where,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
      take: query.limit ?? 100,
      select: {
        id: true,
        code: true,
        name: true,
        decimalPlaces: true,
      },
    });
  }

  async getCrateTypes(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.CrateTypeWhereInput = {
      organizationId: actor.organizationId,
      isActive: true,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.crateType.findMany({
      where,
      orderBy: { name: 'asc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        code: true,
        name: true,
      },
    });
  }

  async getBankAccounts(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.BankAccountWhereInput = {
      organizationId: actor.organizationId,
      isActive: true,
    };
    if (query.search) {
      where.OR = [
        { bankName: { contains: query.search, mode: 'insensitive' } },
        { branchName: { contains: query.search, mode: 'insensitive' } },
        { accountNoMasked: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.bankAccount.findMany({
      where,
      orderBy: { bankName: 'asc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        bankName: true,
        branchName: true,
        accountNoMasked: true,
      },
    });
  }

  async getCashRegisters(actor: AuthenticatedUser, query: QueryLookupDto) {
    const where: Prisma.CashRegisterWhereInput = {
      organizationId: actor.organizationId,
      isActive: true,
    };
    if (query.search) {
      where.OR = [{ name: { contains: query.search, mode: 'insensitive' } }];
    }
    return this.prisma.cashRegister.findMany({
      where,
      orderBy: { name: 'asc' },
      take: query.limit ?? 100,
      select: {
        id: true,
        name: true,
      },
    });
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      throw new ForbiddenException('Backoffice access required');
    }
  }

  ensureAccess(actor?: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
  }
}

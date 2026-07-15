import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { QueryLookupDto } from './dto';
import { LookupsService } from './lookups.service';

@UseGuards(JwtAuthGuard)
@Controller('lookups')
export class LookupsController {
  constructor(private readonly lookupsService: LookupsService) {}

  @Get('retailers')
  retailers(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getRetailers(currentUser, query);
  }

  @Get('suppliers')
  suppliers(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getSuppliers(currentUser, query);
  }

  @Get('routes')
  routes(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getRoutes(currentUser, query);
  }

  @Get('delivery-cycles')
  deliveryCycles(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getDeliveryCycles(currentUser, query);
  }

  @Get('vehicles')
  vehicles(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getVehicles(currentUser, query);
  }

  @Get('employees')
  employees(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getEmployees(currentUser, query);
  }

  @Get('warehouses')
  warehouses(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getWarehouses(currentUser, query);
  }

  @Get('product-variants')
  productVariants(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getProductVariants(currentUser, query);
  }

  @Get('demand-consolidations')
  demandConsolidations(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getDemandConsolidations(currentUser, query);
  }

  @Get('sales-orders')
  salesOrders(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getSalesOrders(currentUser, query);
  }

  @Get('dispatch-trips')
  dispatchTrips(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getDispatchTrips(currentUser, query);
  }

  @Get('sales-invoices')
  salesInvoices(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getSalesInvoices(currentUser, query);
  }

  @Get('purchase-orders')
  purchaseOrders(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getPurchaseOrders(currentUser, query);
  }

  @Get('purchase-order-items')
  purchaseOrderItems(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getPurchaseOrderItems(currentUser, query);
  }

  @Get('purchase-invoices')
  purchaseInvoices(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getPurchaseInvoices(currentUser, query);
  }

  @Get('inventory-batches')
  inventoryBatches(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getInventoryBatches(currentUser, query);
  }

  @Get('brands')
  brands(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getBrands(currentUser, query);
  }

  @Get('product-categories')
  productCategories(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getProductCategories(currentUser, query);
  }

  @Get('tax-codes')
  taxCodes(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getTaxCodes(currentUser, query);
  }

  @Get('units')
  units(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getUnits(currentUser, query);
  }

  @Get('crate-types')
  crateTypes(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getCrateTypes(currentUser, query);
  }

  @Get('bank-accounts')
  bankAccounts(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getBankAccounts(currentUser, query);
  }

  @Get('cash-registers')
  cashRegisters(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryLookupDto) {
    this.lookupsService.ensureAccess(currentUser);
    return this.lookupsService.getCashRegisters(currentUser, query);
  }
}

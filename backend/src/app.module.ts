import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { validationSchema } from './config/validation.schema';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './core/auth/auth.module';
import { UsersModule } from './core/users/users.module';
import { RolesModule } from './core/roles/roles.module';
import { OrganizationModule } from './core/organization/organization.module';
import { SettingsModule } from './core/settings/settings.module';
import { DashboardModule } from './core/dashboard/dashboard.module';
import { LookupsModule } from './core/lookups/lookups.module';
import { AreasModule } from './masters/areas/areas.module';
import { RoutesModule } from './masters/routes/routes.module';
import { EmployeesModule } from './masters/employees/employees.module';
import { VehiclesModule } from './masters/vehicles/vehicles.module';
import { SuppliersModule } from './masters/suppliers/suppliers.module';
import { RetailersModule } from './masters/retailers/retailers.module';
import { ProductsModule } from './masters/products/products.module';
import { PricingModule } from './masters/pricing/pricing.module';
import { DeliveryCyclesModule } from './masters/delivery-cycles/delivery-cycles.module';
import { SalesOrdersModule } from './operations/sales-orders/sales-orders.module';
import { DemandConsolidationsModule } from './operations/demand-consolidations/demand-consolidations.module';
import { PurchaseOrdersModule } from './operations/purchase-orders/purchase-orders.module';
import { GoodsReceiptsModule } from './operations/goods-receipts/goods-receipts.module';
import { PurchaseInvoicesModule } from './operations/purchase-invoices/purchase-invoices.module';
import { InventoryModule } from './operations/inventory/inventory.module';
import { DispatchModule } from './operations/dispatch/dispatch.module';
import { DeliveryModule } from './operations/delivery/delivery.module';
import { CratesModule } from './operations/crates/crates.module';
import { SalesInvoicesModule } from './operations/sales-invoices/sales-invoices.module';
import { PaymentsModule } from './operations/payments/payments.module';
import { ReturnsModule } from './operations/returns/returns.module';
import { ClaimsModule } from './operations/claims/claims.module';
import { AccountingModule } from './finance/accounting/accounting.module';
import { ReportsModule } from './finance/reports/reports.module';
import { NotificationsModule } from './integrations/notifications/notifications.module';
import { FilesModule } from './integrations/files/files.module';
import { SyncModule } from './integrations/sync/sync.module';
import { AiModule } from './integrations/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      validationSchema,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    OrganizationModule,
    SettingsModule,
    DashboardModule,
    LookupsModule,
    AreasModule,
    RoutesModule,
    EmployeesModule,
    VehiclesModule,
    SuppliersModule,
    RetailersModule,
    ProductsModule,
    PricingModule,
    DeliveryCyclesModule,
    SalesOrdersModule,
    DemandConsolidationsModule,
    PurchaseOrdersModule,
    GoodsReceiptsModule,
    PurchaseInvoicesModule,
    InventoryModule,
    DispatchModule,
    DeliveryModule,
    CratesModule,
    SalesInvoicesModule,
    PaymentsModule,
    ReturnsModule,
    ClaimsModule,
    AccountingModule,
    ReportsModule,
    NotificationsModule,
    FilesModule,
    SyncModule,
    AiModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

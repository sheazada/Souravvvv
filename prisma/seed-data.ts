export const IDS = {
  organization: '00000000-0000-0000-0000-000000000001',

  roles: {
    owner: '00000000-0000-0000-0000-000000000101',
    operationsAdmin: '00000000-0000-0000-0000-000000000102',
    accountant: '00000000-0000-0000-0000-000000000103',
    driver: '00000000-0000-0000-0000-000000000104',
    salesperson: '00000000-0000-0000-0000-000000000105',
    retailer: '00000000-0000-0000-0000-000000000106',
  },

  permissions: {
    dashboardRead: '00000000-0000-0000-0000-000000000201',
    retailersManage: '00000000-0000-0000-0000-000000000202',
    productsManage: '00000000-0000-0000-0000-000000000203',
    ordersManage: '00000000-0000-0000-0000-000000000204',
    assistedOrders: '00000000-0000-0000-0000-000000000205',
    invoicesManage: '00000000-0000-0000-0000-000000000206',
    procurementManage: '00000000-0000-0000-0000-000000000207',
    inventoryManage: '00000000-0000-0000-0000-000000000208',
    dispatchManage: '00000000-0000-0000-0000-000000000209',
    accountingManage: '00000000-0000-0000-0000-000000000210',
    reportsRead: '00000000-0000-0000-0000-000000000211',
  },

  areas: {
    patnaUrban: '00000000-0000-0000-0000-000000000301',
  },

  routes: {
    patnaMorning: '00000000-0000-0000-0000-000000000401',
  },

  employees: {
    owner: '00000000-0000-0000-0000-000000000501',
    operations: '00000000-0000-0000-0000-000000000502',
    accountant: '00000000-0000-0000-0000-000000000503',
    driver1: '00000000-0000-0000-0000-000000000504',
    sales1: '00000000-0000-0000-0000-000000000505',
  },

  vehicles: {
    van1: '00000000-0000-0000-0000-000000000601',
  },

  suppliers: {
    sudhaDepot: '00000000-0000-0000-0000-000000000701',
  },

  retailers: {
    anandStore: '00000000-0000-0000-0000-000000000801',
    guptaSweets: '00000000-0000-0000-0000-000000000802',
    freshMart: '00000000-0000-0000-0000-000000000803',
  },

  users: {
    owner: '00000000-0000-0000-0000-000000000901',
    operations: '00000000-0000-0000-0000-000000000902',
    accountant: '00000000-0000-0000-0000-000000000903',
    driver1: '00000000-0000-0000-0000-000000000904',
    sales1: '00000000-0000-0000-0000-000000000905',
    retailerAnand: '00000000-0000-0000-0000-000000000906',
    retailerFreshMart: '00000000-0000-0000-0000-000000000907',
  },

  accounts: {
    receivables: '00000000-0000-0000-0000-000000001001',
    payables: '00000000-0000-0000-0000-000000001002',
    sales: '00000000-0000-0000-0000-000000001003',
    purchase: '00000000-0000-0000-0000-000000001004',
    inventory: '00000000-0000-0000-0000-000000001005',
    cash: '00000000-0000-0000-0000-000000001006',
    bank: '00000000-0000-0000-0000-000000001007',
    deliveryExpense: '00000000-0000-0000-0000-000000001008',
  },

  bankAccounts: {
    mainBank: '00000000-0000-0000-0000-000000001101',
  },

  cashRegisters: {
    mainCash: '00000000-0000-0000-0000-000000001201',
  },

  expenseCategories: {
    fuel: '00000000-0000-0000-0000-000000001301',
  },

  brands: {
    sudha: '00000000-0000-0000-0000-000000001401',
  },

  categories: {
    milk: '00000000-0000-0000-0000-000000001501',
    curd: '00000000-0000-0000-0000-000000001502',
    paneer: '00000000-0000-0000-0000-000000001503',
  },

  units: {
    litre: '00000000-0000-0000-0000-000000001601',
    packet: '00000000-0000-0000-0000-000000001602',
    gram: '00000000-0000-0000-0000-000000001603',
    kg: '00000000-0000-0000-0000-000000001604',
  },

  taxCodes: {
    dairyZero: '00000000-0000-0000-0000-000000001701',
    dairyFive: '00000000-0000-0000-0000-000000001702',
  },

  crateTypes: {
    milkCrate: '00000000-0000-0000-0000-000000001801',
  },

  products: {
    tonedMilk: '00000000-0000-0000-0000-000000001901',
    dahi: '00000000-0000-0000-0000-000000001902',
    paneer: '00000000-0000-0000-0000-000000001903',
  },

  variants: {
    tonedMilk500: '00000000-0000-0000-0000-000000002001',
    tonedMilk1L: '00000000-0000-0000-0000-000000002002',
    dahi200: '00000000-0000-0000-0000-000000002003',
    paneer1Kg: '00000000-0000-0000-0000-000000002004',
  },

  images: {
    tonedMilk500: '00000000-0000-0000-0000-000000002101',
    tonedMilk1L: '00000000-0000-0000-0000-000000002102',
    dahi200: '00000000-0000-0000-0000-000000002103',
  },

  priceBooks: {
    defaultRetailer: '00000000-0000-0000-0000-000000002201',
    patnaWholesale: '00000000-0000-0000-0000-000000002202',
  },

  priceBookAssignments: {
    defaultCategory: '00000000-0000-0000-0000-000000002301',
    patnaRouteWholesale: '00000000-0000-0000-0000-000000002302',
  },

  priceBookItems: {
    milk500Default: '00000000-0000-0000-0000-000000002401',
    milk1LDefault: '00000000-0000-0000-0000-000000002402',
    dahi200Default: '00000000-0000-0000-0000-000000002403',
    paneer1KgDefault: '00000000-0000-0000-0000-000000002404',
  },

  promotions: {
    sawanOffer: '00000000-0000-0000-0000-000000002501',
  },

  warehouses: {
    mainWarehouse: '00000000-0000-0000-0000-000000002601',
    returnsWarehouse: '00000000-0000-0000-0000-000000002602',
  },

  deliveryCycles: {
    morning_2026_07_10: '00000000-0000-0000-0000-000000002701',
  },

  salesOrders: {
    anand: '00000000-0000-0000-0000-000000002801',
    gupta: '00000000-0000-0000-0000-000000002802',
    freshMart: '00000000-0000-0000-0000-000000002803',
  },

  salesOrderItems: {
    anandMilk500: '00000000-0000-0000-0000-000000002901',
    anandDahi: '00000000-0000-0000-0000-000000002902',
    guptaMilk1L: '00000000-0000-0000-0000-000000002903',
    guptaPaneer: '00000000-0000-0000-0000-000000002904',
    freshMilk500: '00000000-0000-0000-0000-000000002905',
  },

  demandConsolidations: {
    dcMorning: '00000000-0000-0000-0000-000000003001',
  },

  demandItems: {
    milk500: '00000000-0000-0000-0000-000000003101',
    milk1L: '00000000-0000-0000-0000-000000003102',
    dahi200: '00000000-0000-0000-0000-000000003103',
    paneer1Kg: '00000000-0000-0000-0000-000000003104',
  },

  purchaseOrders: {
    poMorning: '00000000-0000-0000-0000-000000003201',
  },

  purchaseOrderItems: {
    milk500: '00000000-0000-0000-0000-000000003301',
    milk1L: '00000000-0000-0000-0000-000000003302',
    dahi200: '00000000-0000-0000-0000-000000003303',
    paneer1Kg: '00000000-0000-0000-0000-000000003304',
  },

  goodsReceipts: {
    grnMorning: '00000000-0000-0000-0000-000000003401',
  },

  goodsReceiptItems: {
    milk500: '00000000-0000-0000-0000-000000003501',
    milk1L: '00000000-0000-0000-0000-000000003502',
    dahi200: '00000000-0000-0000-0000-000000003503',
    paneer1Kg: '00000000-0000-0000-0000-000000003504',
  },

  purchaseInvoices: {
    supplierInvoice: '00000000-0000-0000-0000-000000003601',
  },

  purchaseInvoiceItems: {
    milk500: '00000000-0000-0000-0000-000000003701',
    milk1L: '00000000-0000-0000-0000-000000003702',
    dahi200: '00000000-0000-0000-0000-000000003703',
    paneer1Kg: '00000000-0000-0000-0000-000000003704',
  },

  inventoryBatches: {
    milk500: '00000000-0000-0000-0000-000000003801',
    milk1L: '00000000-0000-0000-0000-000000003802',
    dahi200: '00000000-0000-0000-0000-000000003803',
    paneer1Kg: '00000000-0000-0000-0000-000000003804',
  },

  stockMovements: {
    grnMilk500: '00000000-0000-0000-0000-000000003901',
    grnMilk1L: '00000000-0000-0000-0000-000000003902',
    grnDahi200: '00000000-0000-0000-0000-000000003903',
    grnPaneer1Kg: '00000000-0000-0000-0000-000000003904',
  },

  dispatchTrips: {
    morningTrip: '00000000-0000-0000-0000-000000004001',
  },

  dispatchTripItems: {
    milk500: '00000000-0000-0000-0000-000000004101',
    milk1L: '00000000-0000-0000-0000-000000004102',
    dahi200: '00000000-0000-0000-0000-000000004103',
    paneer1Kg: '00000000-0000-0000-0000-000000004104',
  },

  deliveryChallans: {
    morningTrip: '00000000-0000-0000-0000-000000004201',
  },

  deliveryStops: {
    anand: '00000000-0000-0000-0000-000000004301',
    gupta: '00000000-0000-0000-0000-000000004302',
    freshMart: '00000000-0000-0000-0000-000000004303',
  },

  deliveryStopItems: {
    anandMilk500: '00000000-0000-0000-0000-000000004401',
    anandDahi: '00000000-0000-0000-0000-000000004402',
    guptaMilk1L: '00000000-0000-0000-0000-000000004403',
    guptaPaneer: '00000000-0000-0000-0000-000000004404',
    freshMilk500: '00000000-0000-0000-0000-000000004405',
  },

  tripReconciliations: {
    morningTrip: '00000000-0000-0000-0000-000000004501',
  },

  salesInvoices: {
    anand: '00000000-0000-0000-0000-000000004601',
    gupta: '00000000-0000-0000-0000-000000004602',
    freshMart: '00000000-0000-0000-0000-000000004603',
  },

  salesInvoiceItems: {
    anandMilk500: '00000000-0000-0000-0000-000000004701',
    anandDahi: '00000000-0000-0000-0000-000000004702',
    guptaMilk1L: '00000000-0000-0000-0000-000000004703',
    guptaPaneer: '00000000-0000-0000-0000-000000004704',
    freshMilk500: '00000000-0000-0000-0000-000000004705',
  },

  paymentReceipts: {
    anand: '00000000-0000-0000-0000-000000004801',
    gupta: '00000000-0000-0000-0000-000000004802',
  },

  paymentAllocations: {
    anand: '00000000-0000-0000-0000-000000004901',
    gupta: '00000000-0000-0000-0000-000000004902',
  },

  crateTransactions: {
    anandIssue: '00000000-0000-0000-0000-000000005001',
    anandReturn: '00000000-0000-0000-0000-000000005002',
    guptaIssue: '00000000-0000-0000-0000-000000005003',
  },

  crateBalanceSnapshots: {
    anand: '00000000-0000-0000-0000-000000005101',
    gupta: '00000000-0000-0000-0000-000000005102',
  },

  journalEntries: {
    purchase: '00000000-0000-0000-0000-000000005201',
    saleAnand: '00000000-0000-0000-0000-000000005202',
    saleGupta: '00000000-0000-0000-0000-000000005203',
    receiptAnand: '00000000-0000-0000-0000-000000005204',
    receiptGupta: '00000000-0000-0000-0000-000000005205',
  },

  journalLines: {
    purchaseInventoryDr: '00000000-0000-0000-0000-000000005301',
    purchaseSupplierCr: '00000000-0000-0000-0000-000000005302',
    saleAnandReceivableDr: '00000000-0000-0000-0000-000000005303',
    saleAnandSalesCr: '00000000-0000-0000-0000-000000005304',
    saleGuptaReceivableDr: '00000000-0000-0000-0000-000000005305',
    saleGuptaSalesCr: '00000000-0000-0000-0000-000000005306',
    receiptAnandCashDr: '00000000-0000-0000-0000-000000005307',
    receiptAnandReceivableCr: '00000000-0000-0000-0000-000000005308',
    receiptGuptaCashDr: '00000000-0000-0000-0000-000000005309',
    receiptGuptaReceivableCr: '00000000-0000-0000-0000-000000005310',
  },

  expenseEntries: {
    fuel: '00000000-0000-0000-0000-000000005401',
  },

  dayClosings: {
    sample: '00000000-0000-0000-0000-000000005501',
  },

  notificationTemplates: {
    orderConfirmedWhatsApp: '00000000-0000-0000-0000-000000005601',
    paymentReceivedSms: '00000000-0000-0000-0000-000000005602',
  },

  notificationLogs: {
    anandOrderConfirmed: '00000000-0000-0000-0000-000000005701',
  },

  fileAttachments: {
    anandGst: '00000000-0000-0000-0000-000000005801',
  },

  syncEvents: {
    deliveryUpdate: '00000000-0000-0000-0000-000000005901',
  },

  forecastRuns: {
    demand: '00000000-0000-0000-0000-000000006001',
  },

  forecastItems: {
    milk500: '00000000-0000-0000-0000-000000006101',
    milk1L: '00000000-0000-0000-0000-000000006102',
  },
} as const

export const SEED_DATES = {
  orderDate: new Date('2026-07-09T18:30:00+05:30'),
  deliveryDate: new Date('2026-07-10T00:00:00+05:30'),
  cutoffAt: new Date('2026-07-09T21:00:00+05:30'),
  grnDate: new Date('2026-07-10T04:30:00+05:30'),
  dispatchDate: new Date('2026-07-10T00:00:00+05:30'),
  invoiceDate: new Date('2026-07-10T00:00:00+05:30'),
  paymentDate: new Date('2026-07-10T11:00:00+05:30'),
  closingDate: new Date('2026-07-10T00:00:00+05:30'),
} as const

export const PERMISSIONS = [
  { id: IDS.permissions.dashboardRead, code: 'dashboard.read', module: 'dashboard', action: 'read', description: 'Read dashboard KPIs' },
  { id: IDS.permissions.retailersManage, code: 'retailers.manage', module: 'retailers', action: 'manage', description: 'Manage retailers' },
  { id: IDS.permissions.productsManage, code: 'products.manage', module: 'products', action: 'manage', description: 'Manage products and variants' },
  { id: IDS.permissions.ordersManage, code: 'orders.manage', module: 'orders', action: 'manage', description: 'Manage sales orders' },
  { id: IDS.permissions.assistedOrders, code: 'orders.assisted', module: 'orders', action: 'assisted', description: 'Create orders/invoices on behalf of retailer' },
  { id: IDS.permissions.invoicesManage, code: 'invoices.manage', module: 'invoices', action: 'manage', description: 'Manage invoices' },
  { id: IDS.permissions.procurementManage, code: 'procurement.manage', module: 'procurement', action: 'manage', description: 'Manage purchase orders and GRN' },
  { id: IDS.permissions.inventoryManage, code: 'inventory.manage', module: 'inventory', action: 'manage', description: 'Manage stock and batches' },
  { id: IDS.permissions.dispatchManage, code: 'dispatch.manage', module: 'dispatch', action: 'manage', description: 'Manage routes and dispatch' },
  { id: IDS.permissions.accountingManage, code: 'accounting.manage', module: 'accounting', action: 'manage', description: 'Manage finance and ledgers' },
  { id: IDS.permissions.reportsRead, code: 'reports.read', module: 'reports', action: 'read', description: 'Read reports' },
] as const

export const ROLE_PERMISSIONS = {
  [IDS.roles.owner]: Object.values(IDS.permissions),
  [IDS.roles.operationsAdmin]: [
    IDS.permissions.dashboardRead,
    IDS.permissions.retailersManage,
    IDS.permissions.productsManage,
    IDS.permissions.ordersManage,
    IDS.permissions.assistedOrders,
    IDS.permissions.invoicesManage,
    IDS.permissions.procurementManage,
    IDS.permissions.inventoryManage,
    IDS.permissions.dispatchManage,
    IDS.permissions.reportsRead,
  ],
  [IDS.roles.accountant]: [
    IDS.permissions.dashboardRead,
    IDS.permissions.invoicesManage,
    IDS.permissions.accountingManage,
    IDS.permissions.reportsRead,
  ],
  [IDS.roles.driver]: [
    IDS.permissions.dashboardRead,
    IDS.permissions.dispatchManage,
  ],
  [IDS.roles.salesperson]: [
    IDS.permissions.dashboardRead,
    IDS.permissions.retailersManage,
    IDS.permissions.ordersManage,
    IDS.permissions.assistedOrders,
    IDS.permissions.reportsRead,
  ],
  [IDS.roles.retailer]: [
    IDS.permissions.dashboardRead,
  ],
} as const

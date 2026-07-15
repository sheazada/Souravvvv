export type DeliveryStopDetail = {
  id: string;
  dispatchTripId: string;
  retailerId: string;
  salesOrderId?: string | null;
  stopSequence: number;
  plannedArrivalAt?: string | null;
  actualArrivalAt?: string | null;
  actualDepartureAt?: string | null;
  status: 'pending' | 'delivered' | 'partial' | 'refused' | 'failed';
  failureReason?: string | null;
  cratesIssued: number;
  emptyCratesReceived: number;
  notes?: string | null;
  retailer?: {
    id: string;
    retailerCode: string;
    shopName: string;
    ownerName?: string | null;
    mobile: string;
    locality?: string | null;
  } | null;
  salesOrder?: {
    id: string;
    orderNo: string;
    status: string;
    source: string;
  } | null;
  trip?: {
    id: string;
    tripNo: string;
    status: string;
    dispatchDate: string;
  } | null;
  items: Array<{
    id: string;
    variantId: string;
    orderedQty: number;
    loadedQty: number;
    deliveredQty: number;
    returnedQty: number;
    damagedQty: number;
    refusedQty: number;
    unitPrice: number;
    taxAmount: number;
    lineTotal: number;
    variant: {
      id: string;
      sku: string;
      variantName: string | null;
      productId: string;
      productName: string;
    } | null;
  }>;
  attachments?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType?: string | null;
    metaJson?: Record<string, unknown> | null;
  }>;
};

export type UpdateDeliveryStopPayload = {
  status: 'pending' | 'delivered' | 'partial' | 'refused' | 'failed';
  actualArrivalAt?: string;
  actualDepartureAt?: string;
  failureReason?: string;
  notes?: string;
  items?: Array<{
    variantId: string;
    deliveredQty: number;
    returnedQty?: number;
    damagedQty?: number;
  }>;
};

export type DeliveryCollectionPayload = {
  amount: number;
  paymentMode: string;
  salesInvoiceId?: string;
  referenceNo?: string;
  notes?: string;
};

export type DeliveryCratePayload = {
  crateTypeId: string;
  transactionType: 'issue' | 'return' | 'damage' | 'missing' | 'adjustment';
  quantity: number;
  remarks?: string;
};

export type DeliveryProofPayload = {
  recipientName?: string;
  signatureUrl?: string;
  photoUrl?: string;
  notes?: string;
};

export type NotificationLogRow = {
  id: string;
  channel: 'sms' | 'whatsapp' | 'email' | 'in_app';
  eventKey: string;
  recipientMobile?: string | null;
  providerMessageId?: string | null;
  status: 'queued' | 'sent' | 'failed';
  sentAt?: string | null;
  createdAt: string;
  payloadJson?: Record<string, unknown> | null;
  template?: {
    id: string;
    channel: string;
    eventKey: string;
    languageCode: string;
    isActive: boolean;
  } | null;
  recipientUser?: {
    id: string;
    fullName: string;
    mobile: string;
    userType: string;
  } | null;
};

export type NotificationTemplateRow = {
  id: string;
  channel: 'sms' | 'whatsapp' | 'email' | 'in_app';
  eventKey: string;
  languageCode: string;
  templateText: string;
  isActive: boolean;
  createdAt: string;
};

export type NotificationLogFilters = {
  page?: number;
  limit?: number;
  search?: string;
  channel?: string;
  status?: string;
  eventKey?: string;
};

export type NotificationTemplateFilters = {
  page?: number;
  limit?: number;
  search?: string;
  channel?: string;
  eventKey?: string;
  isActive?: string;
};

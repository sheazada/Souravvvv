import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryPaymentGatewayWebhooksDto, ReprocessPaymentGatewayWebhookDto } from './dto';
import { PaymentIntentsService } from './payment-intents.service';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentWebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentIntentsService: PaymentIntentsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async handleWebhook(
    gateway: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | undefined,
    parsedBody: Record<string, unknown>,
  ) {
    const resolution = await this.resolveIntentFromPayload(gateway, parsedBody);
    const organizationId = resolution.organizationId ?? (await this.resolveFallbackOrganizationId(parsedBody));
    if (!organizationId) {
      throw new NotFoundException('Unable to resolve organization for gateway webhook');
    }

    const externalReference = resolution.intentId ?? this.extractString(parsedBody, ['paymentIntentId', 'intentId', 'id']) ?? this.extractString(parsedBody, ['order_id', 'orderId']);
    const signature = this.readSignature(headers);
    const verificationStatus = this.verifySignature(gateway, signature, rawBody, parsedBody);

    const webhook = await this.prisma.paymentGatewayWebhook.create({
      data: {
        organizationId,
        gatewayName: gateway,
        eventType: this.extractString(parsedBody, ['event', 'eventType', 'status']) ?? 'unknown',
        externalReference: externalReference ?? null,
        payloadJson: parsedBody as Prisma.InputJsonValue,
        signature,
        verificationStatus,
        processedStatus: 'pending',
      },
    });

    if (verificationStatus === 'failed') {
      await this.prisma.paymentGatewayWebhook.update({
        where: { id: webhook.id },
        data: {
          processedStatus: 'failed',
          errorMessage: 'Webhook signature verification failed',
          processedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Webhook rejected due to signature verification failure',
        data: { webhookId: webhook.id },
      };
    }

    if (!resolution.intentId) {
      await this.prisma.paymentGatewayWebhook.update({
        where: { id: webhook.id },
        data: {
          processedStatus: 'failed',
          errorMessage: 'Unable to resolve payment intent from webhook payload',
          processedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Webhook stored but payment intent could not be resolved',
        data: { webhookId: webhook.id },
      };
    }

    const status = this.resolveGatewayStatus(parsedBody);
    try {
      if (status === 'success') {
        await this.paymentIntentsService.markWebhookSuccess(organizationId, resolution.intentId, {
          gatewayName: gateway,
          gatewayOrderId: resolution.gatewayOrderId,
          gatewayPaymentId: resolution.gatewayPaymentId,
          gatewaySignature: this.readSignature(headers),
          paidAt: this.extractDate(parsedBody, ['paidAt', 'captured_at', 'created_at']) ?? new Date(),
        });

        const receipt = await this.paymentsService.createConfirmedGatewayReceiptForIntent(
          organizationId,
          resolution.intentId,
          {
            gatewayName: gateway,
            gatewayOrderId: resolution.gatewayOrderId,
            gatewayPaymentId: resolution.gatewayPaymentId,
            paymentMethod: this.extractString(parsedBody, ['method', 'paymentMethod']) ?? 'upi',
            paidAt: this.extractDate(parsedBody, ['paidAt', 'captured_at', 'created_at']) ?? new Date(),
            remarks: 'Gateway payment auto-confirmed from webhook',
          },
        );

        await this.prisma.paymentGatewayWebhook.update({
          where: { id: webhook.id },
          data: {
            processedStatus: 'processed',
            processedAt: new Date(),
          },
        });

        return {
          success: true,
          message: 'Gateway webhook processed successfully',
          data: {
            webhookId: webhook.id,
            paymentIntentId: resolution.intentId,
            paymentReceiptId: receipt.id,
          },
        };
      }

      if (status === 'failed') {
        await this.paymentIntentsService.markWebhookFailure(organizationId, resolution.intentId, {
          gatewayName: gateway,
          reason: this.extractString(parsedBody, ['failureReason', 'error', 'description']) ?? 'Gateway payment failed',
        });
      }

      await this.prisma.paymentGatewayWebhook.update({
        where: { id: webhook.id },
        data: {
          processedStatus: 'processed',
          processedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Gateway webhook stored successfully',
        data: {
          webhookId: webhook.id,
          paymentIntentId: resolution.intentId,
          status,
        },
      };
    } catch (error: any) {
      await this.prisma.paymentGatewayWebhook.update({
        where: { id: webhook.id },
        data: {
          processedStatus: 'failed',
          errorMessage: error?.message ?? 'Webhook processing failed',
          processedAt: new Date(),
        },
      });
      throw error;
    }
  }

  async findAllWebhooks(actor: AuthenticatedUser, query: QueryPaymentGatewayWebhooksDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: any = { organizationId: actor.organizationId };
    if (query.gatewayName) where.gatewayName = query.gatewayName;
    if (query.processedStatus) where.processedStatus = query.processedStatus;
    if (query.verificationStatus) where.verificationStatus = query.verificationStatus;
    if (query.externalReference) where.externalReference = query.externalReference;
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.paymentGatewayWebhook.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paymentGatewayWebhook.count({ where }),
    ]);

    return {
      success: true,
      message: 'Payment gateway webhooks fetched successfully',
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findWebhookById(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const webhook = await this.prisma.paymentGatewayWebhook.findFirst({
      where: { organizationId: actor.organizationId, id },
    });
    if (!webhook) throw new NotFoundException('Payment gateway webhook not found');

    return {
      success: true,
      message: 'Payment gateway webhook fetched successfully',
      data: webhook,
    };
  }

  async reprocessWebhook(actor: AuthenticatedUser, id: string, dto: ReprocessPaymentGatewayWebhookDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const webhook = await this.prisma.paymentGatewayWebhook.findFirst({
      where: { organizationId: actor.organizationId, id },
    });
    if (!webhook) throw new NotFoundException('Payment gateway webhook not found');

    const parsedBody = webhook.payloadJson as Record<string, unknown>;
    return this.handleWebhook(webhook.gatewayName, { 'x-reprocess': 'true' }, undefined, {
      ...parsedBody,
      reprocessRemarks: dto.remarks ?? null,
      reprocessForce: dto.force ?? false,
    });
  }

  private async resolveIntentFromPayload(gateway: string, payload: Record<string, unknown>) {
    const directIntentId = this.extractString(payload, ['paymentIntentId', 'intentId']);
    if (directIntentId) {
      const intent = await this.prisma.retailerPaymentIntent.findFirst({
        where: { id: directIntentId },
        select: { id: true, organizationId: true, gatewayOrderId: true, gatewayPaymentId: true },
      });
      if (intent) {
        return {
          intentId: intent.id,
          organizationId: intent.organizationId,
          gatewayOrderId: intent.gatewayOrderId,
          gatewayPaymentId: intent.gatewayPaymentId,
        };
      }
    }

    const gatewayOrderId = this.extractString(payload, ['order_id', 'orderId', 'gatewayOrderId']);
    if (gatewayOrderId) {
      const intent = await this.prisma.retailerPaymentIntent.findFirst({
        where: { gatewayOrderId },
        select: { id: true, organizationId: true, gatewayOrderId: true, gatewayPaymentId: true },
      });
      if (intent) {
        return {
          intentId: intent.id,
          organizationId: intent.organizationId,
          gatewayOrderId,
          gatewayPaymentId: this.extractString(payload, ['payment_id', 'paymentId', 'gatewayPaymentId']) ?? intent.gatewayPaymentId,
        };
      }
    }

    const gatewayPaymentId = this.extractString(payload, ['payment_id', 'paymentId', 'gatewayPaymentId']);
    if (gatewayPaymentId) {
      const intent = await this.prisma.retailerPaymentIntent.findFirst({
        where: { gatewayPaymentId },
        select: { id: true, organizationId: true, gatewayOrderId: true, gatewayPaymentId: true },
      });
      if (intent) {
        return {
          intentId: intent.id,
          organizationId: intent.organizationId,
          gatewayOrderId: intent.gatewayOrderId,
          gatewayPaymentId,
        };
      }
    }

    return {
      intentId: null as string | null,
      organizationId: null as string | null,
      gatewayOrderId,
      gatewayPaymentId: this.extractString(payload, ['payment_id', 'paymentId', 'gatewayPaymentId']),
      gatewayName: gateway,
    };
  }

  private async resolveFallbackOrganizationId(payload: Record<string, unknown>) {
    const fromPayload = this.extractString(payload, ['organizationId'])
      ?? this.extractString(payload, ['metadata.organizationId'])
      ?? this.extractString(payload, ['notes.organizationId']);
    if (fromPayload) return fromPayload;

    const org = await this.prisma.organization.findFirst({ select: { id: true } });
    return org?.id ?? null;
  }

  private resolveGatewayStatus(payload: Record<string, unknown>) {
    const status = (this.extractString(payload, ['status', 'payload.payment.entity.status']) ?? '').toLowerCase();
    const event = (this.extractString(payload, ['event', 'eventType']) ?? '').toLowerCase();

    if (['paid', 'captured', 'success'].includes(status) || event.includes('captured') || event.includes('paid')) {
      return 'success';
    }
    if (['failed', 'error'].includes(status) || event.includes('failed')) {
      return 'failed';
    }
    return 'pending';
  }

  private readSignature(headers: Record<string, string | string[] | undefined>) {
    return (
      (headers['x-signature'] as string | undefined) ??
      (headers['x-razorpay-signature'] as string | undefined) ??
      null
    );
  }

  private verifySignature(
    gateway: string,
    signature: string | null,
    rawBody: string | undefined,
    payload: Record<string, unknown>,
  ): 'verified' | 'pending' | 'failed' {
    const normalizedGateway = gateway.toLowerCase();

    if (normalizedGateway === 'razorpay') {
      const secret = process.env.PAYMENT_GATEWAY_RAZORPAY_WEBHOOK_SECRET;
      if (!secret || !signature) return 'pending';
      const body = rawBody ?? JSON.stringify(payload);
      const computed = createHmac('sha256', secret).update(body).digest('hex');
      return this.safeCompare(computed, signature) ? 'verified' : 'failed';
    }

    return signature ? 'verified' : 'pending';
  }

  private safeCompare(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) return false;
    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private extractString(payload: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = this.readPath(payload, key);
      if (typeof value === 'string' && value.trim()) return value;
    }
    return null;
  }

  private extractDate(payload: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = this.readPath(payload, key);
      if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) return date;
      }
    }
    return null;
  }

  private readPath(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((value, segment) => {
      if (value && typeof value === 'object' && segment in (value as Record<string, unknown>)) {
        return (value as Record<string, unknown>)[segment];
      }
      return undefined;
    }, obj);
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
}

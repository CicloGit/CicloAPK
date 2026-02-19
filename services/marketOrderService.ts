import { CartItem } from '../types';
import { backendApi, ConsumerMarketChannel, EvidencePayload } from './backendApi';

export type CheckoutPaymentMethod = 'pix' | 'boleto' | 'credit' | 'corporate';

const buildContractEvidence = (transactionId: string, listingId: string): EvidencePayload[] => [
  {
    type: 'TYPE_B',
    documents: [
      {
        kind: 'DIGITAL_ACCEPTANCE',
        hash: `ack-${transactionId}-${listingId}`,
      },
    ],
  },
];

const resolveDomain = (item: CartItem): 'MARKETPLACE' | 'CONSUMER_MARKET' =>
  item.listingCategory === 'OUTPUTS_PRODUCER'
    ? 'CONSUMER_MARKET'
    : item.source === 'LOCAL'
      ? 'CONSUMER_MARKET'
      : 'MARKETPLACE';

const resolveChannel = (item: CartItem): ConsumerMarketChannel =>
  item.listingCategory === 'OUTPUTS_PRODUCER'
    ? 'WHOLESALE_DIRECT'
    : item.source === 'LOCAL'
      ? 'RETAIL_MARKETS'
      : 'WHOLESALE_DIRECT';

export const marketOrderService = {
  async createCheckout(cart: CartItem[], paymentMethod: CheckoutPaymentMethod): Promise<{ transactionId: string; orderIds: string[] }> {
    if (cart.length === 0) {
      throw new Error('Carrinho vazio.');
    }

    const transactionId = `TRX-${Date.now()}`;
    const supplierOrderIds: string[] = [];

    for (const item of cart) {
      const domain = resolveDomain(item);
      const channel = resolveChannel(item);

      const order = await backendApi.marketPlaceOrder({
        listingId: item.id,
        listing: {
          productName: item.productName,
          b2bSupplier: item.b2bSupplier,
          price: item.price,
          availableQuantity: item.source === 'LOCAL' ? item.localStock : item.b2bStock,
          listingCategory: item.listingCategory,
          listingMode: item.listingMode,
          status: 'PUBLISHED',
        },
        quantity: item.quantity,
        unitPrice: item.price,
        paymentMethod,
        domain,
        channel,
        transactionId,
      });

      await backendApi.marketReserveStock({ orderId: order.orderId });

      await backendApi.marketSignContract({
        orderId: order.orderId,
        contractTerms: 'Safe Deal - aceite digital de checkout',
        evidences: buildContractEvidence(transactionId, item.id),
      });

      await backendApi.marketCreateEscrow({
        orderId: order.orderId,
        amount: Number((item.price * item.quantity).toFixed(2)),
      });

      supplierOrderIds.push(order.supplierOrderId);
    }

    return {
      transactionId,
      orderIds: supplierOrderIds.sort(),
    };
  },
};

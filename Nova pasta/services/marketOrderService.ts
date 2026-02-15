import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { CartItem, SupplierOrder, SupplierOrderStatus } from '../types';

export type CheckoutPaymentMethod = 'pix' | 'boleto' | 'credit' | 'corporate';

interface MarketplaceOrder {
  id: string;
  customer: string;
  paymentMethod: CheckoutPaymentMethod;
  transactionId: string;
  totalValue: number;
  fees: number;
  grossValue: number;
  status: 'PAID_ESCROW' | 'FAILED';
  createdAtLabel: string;
  items: {
    listingId: string;
    productName: string;
    supplier: string;
    quantity: number;
    unitPrice: number;
    source: 'LOCAL' | 'B2B';
  }[];
}

const marketplaceOrdersCollection = collection(db, 'marketplaceOrders');

const formatTodayBR = () => new Date().toLocaleDateString('pt-BR');

const toSupplierStatus = (): SupplierOrderStatus => 'PENDENTE';

export const marketOrderService = {
  async createCheckout(cart: CartItem[], paymentMethod: CheckoutPaymentMethod): Promise<{ transactionId: string; orderIds: string[] }> {
    if (cart.length === 0) {
      throw new Error('Carrinho vazio.');
    }

    const uid = getAuth().currentUser?.uid ?? 'anonymous';
    const customer = getAuth().currentUser?.email ?? 'cliente@ciclo.plus';

    const now = Date.now();
    const transactionId = `TRX-${now}`;
    const grossValue = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const fees = Number((grossValue * 0.01).toFixed(2));
    const totalValue = Number((grossValue + fees).toFixed(2));

    const groupedBySupplier = cart.reduce<Record<string, CartItem[]>>((acc, item) => {
      acc[item.b2bSupplier] = acc[item.b2bSupplier] ?? [];
      acc[item.b2bSupplier].push(item);
      return acc;
    }, {});

    const supplierOrderIds: string[] = [];
    const writes = Object.entries(groupedBySupplier).map(async ([supplier, supplierItems], index) => {
      const orderId = `ORD-${now + index}`;
      supplierOrderIds.push(orderId);

      const supplierOrder: SupplierOrder = {
        id: orderId,
        customer,
        items: supplierItems.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
        })),
        totalValue: Number(supplierItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)),
        date: formatTodayBR(),
        status: toSupplierStatus(),
      };

      await setDoc(doc(db, 'supplierOrders', orderId), {
        ...supplierOrder,
        supplier,
        transactionId,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    const marketplaceOrderId = `MKT-${now}`;
    const marketplaceOrder: MarketplaceOrder = {
      id: marketplaceOrderId,
      customer,
      paymentMethod,
      transactionId,
      totalValue,
      fees,
      grossValue,
      status: 'PAID_ESCROW',
      createdAtLabel: formatTodayBR(),
      items: cart.map((item) => ({
        listingId: item.id,
        productName: item.productName,
        supplier: item.b2bSupplier,
        quantity: item.quantity,
        unitPrice: item.price,
        source: item.source,
      })),
    };

    await Promise.all([
      ...writes,
      setDoc(doc(marketplaceOrdersCollection, marketplaceOrderId), {
        ...marketplaceOrder,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ]);

    return {
      transactionId,
      orderIds: supplierOrderIds.sort(),
    };
  },
};

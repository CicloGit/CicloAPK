
import React, { useEffect, useMemo, useState } from 'react';
import ShoppingCartIcon from '../../icons/ShoppingCartIcon';
import { CartItem, MarketplaceListing, CorporateCard, PartnerStore } from '../../../types';
import TrashIcon from '../../icons/TrashIcon';
import XIcon from '../../icons/XIcon';
import ShieldCheckIcon from '../../icons/ShieldCheckIcon';
import { CashIcon } from '../../icons/CashIcon';
import LockClosedIcon from '../../icons/LockClosedIcon';
import CheckCircleIcon from '../../icons/CheckCircleIcon';
import SearchIcon from '../../icons/SearchIcon';
import FilterIcon from '../../icons/FilterIcon';
import { CubeIcon } from '../../icons/CubeIcon';
import { useToast } from '../../../contexts/ToastContext';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { commercialService, MarketplaceOrderHistory } from '../../../services/commercialService';
import { marketOrderService } from '../../../services/marketOrderService';

const CommercialView: React.FC = () => {
    const { addToast } = useToast();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment' | 'processing' | 'success'>('cart');
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'boleto' | 'credit' | 'corporate'>('pix');
    const [selectedCardId, setSelectedCardId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([]);
    const [corporateCards, setCorporateCards] = useState<CorporateCard[]>([]);
    const [partnerStores, setPartnerStores] = useState<PartnerStore[]>([]);

    // Search and Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
    const [userLocation, setUserLocation] = useState('Sorriso, MT'); // Mocked User Location
    const [sortBy, setSortBy] = useState<'price_asc' | 'rating_desc'>('price_asc');
    const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);

    const [orders, setOrders] = useState<MarketplaceOrderHistory[]>([]);

    useEffect(() => {
        const loadCommercialData = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [loadedListings, loadedCards, loadedStores] = await Promise.all([
                    commercialService.listMarketplaceListings(),
                    commercialService.listCorporateCards(),
                    commercialService.listPartnerStores()
                ]);
                const loadedOrders = await commercialService.listMarketplaceOrderHistory();
                setMarketplaceListings(loadedListings);
                setCorporateCards(loadedCards);
                setPartnerStores(loadedStores);
                setOrders(loadedOrders);
                if (loadedCards.length > 0) {
                    setSelectedCardId(loadedCards[0].id);
                }
            } catch {
                setLoadError('Nao foi possivel carregar os dados comerciais.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadCommercialData();
    }, []);

    // Categories derived from data
    const categories = ['Todos', ...Array.from(new Set(marketplaceListings.map(item => item.category)))];

    const addToCart = (item: MarketplaceListing) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                addToast({ type: 'info', title: 'Item Atualizado', message: `Quantidade de ${item.productName} aumentada.`, duration: 2000 });
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            addToast({ type: 'success', title: 'Adicionado ao Carrinho', message: `${item.productName} incluído.`, duration: 2000 });
            return [...prev, { ...item, quantity: 1, source: 'B2B' }];
        });
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
        addToast({ type: 'info', title: 'Item Removido', message: 'Produto retirado do carrinho.', duration: 2000 });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }));
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const handleCheckout = () => {
        setIsCheckoutOpen(true);
        setCheckoutStep('cart');
    };

    const processPayment = async () => {
        if (cart.length === 0) {
            return;
        }
        setCheckoutStep('processing');
        try {
            const result = await marketOrderService.createCheckout(cart, paymentMethod);
            const newOrders = cart.map((item, index) => ({
                id: result.orderIds[index] ?? `ORD-${Date.now() + index}`,
                product: item.productName,
                supplier: item.b2bSupplier,
                value: item.price * item.quantity,
                status: 'Aguardando Envio',
                date: new Date().toLocaleDateString('pt-BR'),
            }));
            setOrders([...newOrders, ...orders]);
            setCart([]);
            setLastTransactionId(result.transactionId);
            setCheckoutStep('success');
            addToast({ type: 'success', title: 'Pagamento Confirmado', message: 'Ordem de compra gravada e valor protegido em Escrow.', duration: 5000 });
        } catch (error) {
            setCheckoutStep('payment');
            addToast({
                type: 'error',
                title: 'Falha no pagamento',
                message: error instanceof Error ? error.message : 'Nao foi possivel registrar a compra no banco de dados.',
                duration: 5000,
            });
        }
    };

    const closeCheckout = () => {
        setIsCheckoutOpen(false);
        setCheckoutStep('cart');
    };

    // Advanced Filtering Logic
    const filteredListings = useMemo(() => {
        const listingsWithLocation = marketplaceListings.map(item => {
            const store = partnerStores.find(s => s.id === item.localPartnerStoreId);
            return { ...item, location: store?.location || '' };
        });

        return listingsWithLocation.filter(item => {
            const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  item.b2bSupplier.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
            return matchesSearch && matchesCategory;
        }).sort((a, b) => {
            // Priority logic: Items in user location come first, then sort by selected criteria
            const aLocationMatch = a.location === userLocation ? 1 : 0;
            const bLocationMatch = b.location === userLocation ? 1 : 0;

            if (aLocationMatch !== bLocationMatch) {
                return bLocationMatch - aLocationMatch; // Local items first
            }

            if (sortBy === 'price_asc') return a.price - b.price;
            if (sortBy === 'rating_desc') return b.rating - a.rating;
            return 0;
        });
    }, [searchTerm, selectedCategory, userLocation, sortBy, marketplaceListings, partnerStores]);

    const selectedCard = corporateCards.find(c => c.id === selectedCardId);

    if (isLoading) {
        return <LoadingSpinner text="Carregando marketplace..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div className="relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-1">Marketplace B2B</h2>
                    <p className="text-slate-600 flex items-center text-sm">
                        <span className="mr-2">Localização do Produtor:</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">{userLocation}</span>
                    </p>
                </div>
                <button 
                    onClick={handleCheckout}
                    className="relative p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md group w-full md:w-auto flex justify-center items-center"
                >
                    <ShoppingCartIcon className="h-6 w-6 mr-2 md:mr-0" />
                    <span className="md:hidden font-bold">Ver Carrinho</span>
                    {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-100">
                            {cart.reduce((acc, item) => acc + item.quantity, 0)}
                        </span>
                    )}
                </button>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar produtos, serviços ou fornecedores..." 
                            className="w-full pl-10 p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                        <FilterIcon className="h-5 w-5 text-slate-500 flex-shrink-0" />
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 text-sm font-semibold rounded-full whitespace-nowrap transition-colors ${
                                    selectedCategory === cat 
                                    ? 'bg-emerald-500 text-white' 
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 border-t pt-3">
                    <span>{filteredListings.length} ofertas encontradas na rede credenciada.</span>
                    <div className="flex items-center">
                        <span className="mr-2">Ordenar por:</span>
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value as 'price_asc' | 'rating_desc')}
                            className="p-1 border border-slate-300 rounded text-slate-700 bg-slate-50 focus:outline-none"
                        >
                            <option value="price_asc">Menor Preço Médio (Padrão)</option>
                            <option value="rating_desc">Melhor Avaliação</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Catalog Grid */}
            <div className="mb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredListings.map(item => (
                        <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200 hover:shadow-lg transition-all group">
                            <div className="h-40 bg-slate-100 flex items-center justify-center relative group-hover:bg-slate-50 transition-colors">
                                <span className="text-slate-400 text-5xl">📦</span>
                                {item.isPartnerStore && (
                                    <div className="absolute top-2 left-2 bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold shadow-sm uppercase tracking-wide">
                                        Parceiro B2B
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-bold text-slate-600 shadow-sm border border-slate-100 flex items-center">
                                    <span className="mr-1">📍</span> {item.location}
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="mb-2">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{item.category}</span>
                                    <h4 className="font-bold text-lg text-slate-800 leading-tight">{item.productName}</h4>
                                </div>
                                <p className="text-xs text-slate-500 mb-3 flex items-center justify-between">
                                    <span>{item.b2bSupplier}</span>
                                    <span className="text-amber-500 font-semibold">★ {item.rating}</span>
                                </p>
                                <div className="flex justify-between items-center mb-4 bg-slate-50 p-2 rounded">
                                    <span className="text-emerald-600 font-bold text-xl">R$ {item.price.toFixed(2)}</span>
                                    <span className="text-xs text-slate-500">/ {item.unit}</span>
                                </div>
                                <button 
                                    onClick={() => addToCart(item)}
                                    className="w-full py-2 bg-slate-800 text-white rounded-md font-semibold hover:bg-slate-700 transition-colors flex justify-center items-center text-sm shadow-sm"
                                >
                                    <ShoppingCartIcon className="h-4 w-4 mr-2" />
                                    Adicionar ao Carrinho
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* My Orders Section */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Meus Pedidos de Compra</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                            <tr>
                                <th className="px-6 py-3">ID Pedido</th>
                                <th className="px-6 py-3">Produto</th>
                                <th className="px-6 py-3">Fornecedor</th>
                                <th className="px-6 py-3">Valor Total</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order, index) => (
                                <tr key={index} className="border-b hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono text-slate-600">{order.id}</td>
                                    <td className="px-6 py-4 font-semibold">{order.product}</td>
                                    <td className="px-6 py-4">{order.supplier}</td>
                                    <td className="px-6 py-4 text-slate-800 font-bold">{formatCurrency(order.value)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                            order.status === 'Entregue' ? 'bg-green-100 text-green-800' : 
                                            order.status === 'Aguardando Envio' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CHECKOUT OVERLAY (Conteúdo Mantido com melhorias visuais) */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={closeCheckout}></div>
                    <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
                        
                        {/* Checkout Header */}
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                {checkoutStep === 'success' ? 'Pedido Confirmado' : 'Carrinho de Compras'}
                            </h2>
                            <button onClick={closeCheckout} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
                                <XIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Checkout Content - Mantido a lógica visual anterior, omitido por brevidade no XML mas essencialmente o mesmo */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {checkoutStep === 'cart' && (
                                <>
                                    {cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <ShoppingCartIcon className="h-16 w-16 mb-4 opacity-20" />
                                            <p>Seu carrinho está vazio.</p>
                                            <button onClick={closeCheckout} className="mt-4 text-indigo-600 font-bold hover:underline">Voltar ao Catálogo</button>
                                        </div>
                                    ) : (
                                        <ul className="space-y-4">
                                            {cart.map(item => (
                                                <li key={item.id} className="flex gap-4 p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-md flex items-center justify-center flex-shrink-0 text-xl">📦</div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-slate-800 text-sm">{item.productName}</h4>
                                                        <p className="text-xs text-slate-500">{item.b2bSupplier}</p>
                                                        <p className="text-sm font-semibold text-emerald-600 mt-1">{formatCurrency(item.price)}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end justify-between">
                                                        <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500">
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                        <div className="flex items-center bg-slate-100 rounded">
                                                            <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-1 text-slate-600 hover:bg-slate-200">-</button>
                                                            <span className="text-xs font-bold px-1">{item.quantity}</span>
                                                            <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-1 text-slate-600 hover:bg-slate-200">+</button>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </>
                            )}

                            {checkoutStep === 'payment' && (
                                <div className="space-y-6">
                                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                        <h4 className="font-bold text-indigo-900 flex items-center text-sm mb-2">
                                            <ShieldCheckIcon className="h-5 w-5 mr-2 text-indigo-600" />
                                            Pagamento Seguro (Escrow)
                                        </h4>
                                        <p className="text-xs text-indigo-700">
                                            Seu pagamento ficará retido em uma conta de garantia (Escrow) e só será liberado ao fornecedor após você confirmar o recebimento.
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-slate-800 mb-3 text-sm">Método de Pagamento</h4>
                                        <div className="space-y-2">
                                            <button 
                                                onClick={() => setPaymentMethod('corporate')}
                                                className={`w-full flex flex-col p-3 border rounded-lg transition-all text-left relative ${paymentMethod === 'corporate' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                <div className="flex items-center mb-2">
                                                    <div className="w-4 h-4 rounded-full border border-slate-400 mr-3 flex items-center justify-center">
                                                        {paymentMethod === 'corporate' && <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>}
                                                    </div>
                                                    <span className="font-semibold text-sm text-indigo-900">Cartão Corporativo (Sub-conta)</span>
                                                </div>
                                                <p className="text-xs text-slate-500 ml-7 mb-2">Ideal para Gerentes. Vinculado à conta principal com auditoria total.</p>
                                                
                                                {paymentMethod === 'corporate' && (
                                                    <div className="ml-7 mt-2 p-3 bg-white border border-slate-200 rounded shadow-sm">
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Selecionar Cartão</label>
                                                        <select 
                                                            className="w-full p-2 text-sm border border-slate-300 rounded bg-slate-50"
                                                            value={selectedCardId}
                                                            onChange={(e) => setSelectedCardId(e.target.value)}
                                                        >
                                                            {corporateCards.map(card => (
                                                                <option key={card.id} value={card.id}>
                                                                    {card.network} final {card.last4Digits} - {card.holderName}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {selectedCard && (
                                                            <div className="mt-2 text-xs text-slate-500 flex justify-between border-t pt-2">
                                                                <span>Saldo Disponível:</span>
                                                                <span className="font-bold text-emerald-600">{formatCurrency(selectedCard.balance)}</span>
                                                            </div>
                                                        )}
                                                        <div className="mt-2 flex items-center justify-end">
                                                            <span className="text-[10px] text-slate-400 mr-1">Integrado com</span>
                                                            <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-1 rounded">Asaas</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </button>

                                            <button 
                                                onClick={() => setPaymentMethod('pix')}
                                                className={`w-full flex items-center p-3 border rounded-lg transition-all ${paymentMethod === 'pix' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                <div className="w-4 h-4 rounded-full border border-slate-400 mr-3 flex items-center justify-center">
                                                    {paymentMethod === 'pix' && <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>}
                                                </div>
                                                <span className="font-semibold text-sm">PIX (Aprovação Imediata)</span>
                                            </button>
                                            
                                            <button 
                                                onClick={() => setPaymentMethod('boleto')}
                                                className={`w-full flex items-center p-3 border rounded-lg transition-all ${paymentMethod === 'boleto' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                <div className="w-4 h-4 rounded-full border border-slate-400 mr-3 flex items-center justify-center">
                                                    {paymentMethod === 'boleto' && <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>}
                                                </div>
                                                <span className="font-semibold text-sm">Boleto Bancário</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-lg">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-slate-600">Subtotal</span>
                                            <span className="font-semibold">{formatCurrency(cartTotal)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-slate-600">Taxa de Escrow (1%)</span>
                                            <span className="font-semibold">{formatCurrency(cartTotal * 0.01)}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2 mt-2">
                                            <span className="text-slate-800">Total</span>
                                            <span className="text-emerald-600">{formatCurrency(cartTotal * 1.01)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {checkoutStep === 'processing' && (
                                <div className="h-full flex flex-col items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                                    <h3 className="text-lg font-bold text-slate-800">Processando Pagamento...</h3>
                                    <p className="text-sm text-slate-500">Validando transação na rede credenciada.</p>
                                </div>
                            )}

                            {checkoutStep === 'success' && (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                        <CheckCircleIcon className="h-10 w-10 text-green-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Compra Realizada!</h3>
                                    <p className="text-slate-600 mb-6 text-sm">
                                        Seu pagamento foi confirmado e o valor está protegido em Escrow. O fornecedor já foi notificado para envio.
                                    </p>
                                    <div className="bg-slate-50 p-4 rounded-lg w-full mb-6 text-left border border-slate-200">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Resumo</p>
                                        <p className="text-sm flex justify-between mb-1"><span>ID da Transação:</span> <span className="font-mono">{lastTransactionId ?? 'TRX-N/A'}</span></p>
                                        <p className="text-sm flex justify-between mb-1">
                                            <span>Método:</span> 
                                            <span className="font-bold text-slate-700">
                                                {paymentMethod === 'corporate' ? 'Cartão Ciclo+ (Sub-conta)' : paymentMethod.toUpperCase()}
                                            </span>
                                        </p>
                                        <p className="text-sm flex justify-between"><span>Status:</span> <span className="text-green-600 font-bold">Pago (Escrow)</span></p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Checkout Footer */}
                        {checkoutStep !== 'processing' && checkoutStep !== 'success' && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50">
                                {checkoutStep === 'cart' ? (
                                    <>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-slate-600 font-medium">Total Estimado</span>
                                            <span className="text-2xl font-bold text-slate-800">{formatCurrency(cartTotal)}</span>
                                        </div>
                                        <button 
                                            onClick={() => setCheckoutStep('payment')}
                                            disabled={cart.length === 0}
                                            className="w-full py-3 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-md"
                                        >
                                            Ir para Pagamento
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => setCheckoutStep('cart')}
                                            className="flex-1 py-3 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition-colors"
                                        >
                                            Voltar
                                        </button>
                                        <button 
                                            onClick={processPayment}
                                            className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-md flex items-center justify-center"
                                        >
                                            <LockClosedIcon className="h-5 w-5 mr-2" />
                                            {paymentMethod === 'corporate' ? 'Autorizar Débito' : 'Pagar com Segurança'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {checkoutStep === 'success' && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50">
                                <button 
                                    onClick={closeCheckout}
                                    className="w-full py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors shadow-md"
                                >
                                    Fechar e Voltar à Loja
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommercialView;

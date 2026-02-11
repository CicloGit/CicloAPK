import React, { useEffect, useState } from 'react';
import { SalesOffer, SalesOfferStatus } from '../../../types';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { salesService } from '../../../services/salesService';

const StatusBadge: React.FC<{ status: SalesOfferStatus }> = ({ status }) => {
    const statusStyles: Record<SalesOfferStatus, string> = {
        'ATIVA': 'bg-green-100 text-green-800',
        'VENDIDO': 'bg-blue-100 text-blue-800',
        'CANCELADA': 'bg-slate-100 text-slate-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>{status}</span>;
}

const SalesView: React.FC = () => {
    const [offers, setOffers] = useState<SalesOffer[]>([]);
    const [newOffer, setNewOffer] = useState({ product: '', quantity: '', price: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewOffer(prev => ({ ...prev, [name]: value }));
    };

    const handleAddOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        if (!newOffer.product || !newOffer.quantity || !newOffer.price) return;

        try {
            const created = await salesService.createOffer({
                product: newOffer.product,
                quantity: newOffer.quantity,
                price: parseFloat(newOffer.price),
            });
            setOffers((prev) => [created, ...prev]);
            setNewOffer({ product: '', quantity: '', price: '' });
        } catch {
            setSubmitError('Nao foi possivel publicar a oferta.');
        }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    useEffect(() => {
        const loadOffers = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const loadedOffers = await salesService.listOffers();
                setOffers(loadedOffers);
            } catch {
                setLoadError('Nao foi possivel carregar as ofertas.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadOffers();
    }, []);

    if (isLoading) {
        return <LoadingSpinner text="Carregando ofertas..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Vendas e Ofertas</h2>
            <p className="text-slate-600 mb-8">Crie e gerencie suas ofertas de venda de produtos.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Criar Nova Oferta</h3>
                        <form onSubmit={handleAddOffer} className="space-y-4">
                            <div>
                                <label htmlFor="product" className="block text-sm font-medium text-slate-700">Produto</label>
                                <input type="text" name="product" id="product" value={newOffer.product} onChange={handleInputChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" placeholder="Ex: Soja em Grãos" />
                            </div>
                            <div>
                                <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">Quantidade</label>
                                <input type="text" name="quantity" id="quantity" value={newOffer.quantity} onChange={handleInputChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" placeholder="Ex: 500 sacas" />
                            </div>
                            <div>
                                <label htmlFor="price" className="block text-sm font-medium text-slate-700">Preço (Unitário)</label>
                                <input type="number" name="price" id="price" value={newOffer.price} onChange={handleInputChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" placeholder="Ex: 135.50" />
                            </div>
                            <button type="submit" className="w-full p-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors">
                                Publicar Oferta
                            </button>
                            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-800">Minhas Ofertas Ativas</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                    <tr>
                                        <th className="px-6 py-3">Data</th>
                                        <th className="px-6 py-3">Produto</th>
                                        <th className="px-6 py-3">Quantidade</th>
                                        <th className="px-6 py-3">Preço</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {offers.map((offer) => (
                                        <tr key={offer.id} className="border-b last:border-b-0 hover:bg-slate-50">
                                            <td className="px-6 py-4">{offer.date}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-800">{offer.product}</td>
                                            <td className="px-6 py-4">{offer.quantity}</td>
                                            <td className="px-6 py-4">{formatCurrency(offer.price)}</td>
                                            <td className="px-6 py-4"><StatusBadge status={offer.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesView;

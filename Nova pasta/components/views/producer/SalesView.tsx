import React, { useEffect, useState } from 'react';
import { ConsumerMarketChannel, SalesOffer, SalesOfferStatus } from '../../../types';
import LoadingSpinner from '../../shared/LoadingSpinner';
import TrashIcon from '../../icons/TrashIcon';
import { salesService } from '../../../services/salesService';

const StatusBadge: React.FC<{ status: SalesOfferStatus }> = ({ status }) => {
  const statusStyles: Record<SalesOfferStatus, string> = {
    ATIVA: 'bg-green-100 text-green-800',
    VENDIDO: 'bg-blue-100 text-blue-800',
    CANCELADA: 'bg-slate-100 text-slate-800',
  };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>{status}</span>;
};

const channelLabel = (channel?: ConsumerMarketChannel) =>
  (channel ?? 'WHOLESALE_DIRECT') === 'WHOLESALE_DIRECT' ? 'Atacadista Direto' : 'Mercados';

const modeLabel = (mode?: SalesOffer['listingMode']) => (mode ?? 'FIXED_PRICE') === 'AUCTION' ? 'Leilao' : 'Preco Fixo';
const typeLabel = (offerType?: SalesOffer['offerType']) => {
  if (offerType === 'ANIMAL') return 'Animal';
  if (offerType === 'UTENSILIO') return 'Utensilio';
  return 'Produto';
};

const toDisplayDateTime = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('pt-BR');
};

const SalesView: React.FC = () => {
  const [offers, setOffers] = useState<SalesOffer[]>([]);
  const [newOffer, setNewOffer] = useState<{
    product: string;
    quantity: string;
    price: string;
    channel: ConsumerMarketChannel;
    offerType: 'PRODUTO' | 'ANIMAL' | 'UTENSILIO';
    listingMode: 'FIXED_PRICE' | 'AUCTION';
    description: string;
    location: string;
    auctionEndAt: string;
    minimumBid: string;
  }>({
    product: '',
    quantity: '',
    price: '',
    channel: 'WHOLESALE_DIRECT',
    offerType: 'PRODUTO',
    listingMode: 'FIXED_PRICE',
    description: '',
    location: '',
    auctionEndAt: '',
    minimumBid: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewOffer((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!newOffer.product || !newOffer.quantity || !newOffer.price) {
      setSubmitError('Preencha produto, quantidade e preco.');
      return;
    }

    if (newOffer.listingMode === 'AUCTION' && (!newOffer.auctionEndAt || !newOffer.minimumBid)) {
      setSubmitError('Para leilao, informe data de encerramento e lance minimo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await salesService.createOffer({
        product: newOffer.product,
        quantity: newOffer.quantity,
        price: Number(newOffer.price),
        channel: newOffer.channel,
        offerType: newOffer.offerType,
        listingMode: newOffer.listingMode,
        description: newOffer.description,
        location: newOffer.location,
        auctionEndAt: newOffer.listingMode === 'AUCTION' ? newOffer.auctionEndAt : undefined,
        minimumBid: newOffer.listingMode === 'AUCTION' ? Number(newOffer.minimumBid) : undefined,
      });
      setOffers((prev) => [created, ...prev]);
      setNewOffer((prev) => ({
        ...prev,
        product: '',
        quantity: '',
        price: '',
        description: '',
        location: '',
        auctionEndAt: '',
        minimumBid: '',
      }));
    } catch {
      setSubmitError('Nao foi possivel publicar a oferta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOffer = async (offer: SalesOffer) => {
    const confirmed = window.confirm(`Excluir a oferta "${offer.product}"? Esta acao nao pode ser desfeita.`);
    if (!confirmed) return;

    setSubmitError(null);
    setDeletingId(offer.id);
    try {
      await salesService.deleteOffer(offer.id);
      setOffers((prev) => prev.filter((entry) => entry.id !== offer.id));
    } catch {
      setSubmitError('Nao foi possivel excluir a oferta.');
    } finally {
      setDeletingId(null);
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
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Venda ao Mercado e Leilao</h2>
      <p className="text-slate-600 mb-8">Publique ofertas para consumidor final, atacado e leilao de animais/utensilios.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Publicar Nova Oferta</h3>
            <form onSubmit={handleAddOffer} className="space-y-4">
              <div>
                <label htmlFor="listingMode" className="block text-sm font-medium text-slate-700">Modo de venda</label>
                <select
                  name="listingMode"
                  id="listingMode"
                  value={newOffer.listingMode}
                  onChange={handleInputChange}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-md bg-white"
                >
                  <option value="FIXED_PRICE">Preco Fixo</option>
                  <option value="AUCTION">Leilao</option>
                </select>
              </div>

              <div>
                <label htmlFor="offerType" className="block text-sm font-medium text-slate-700">Tipo de oferta</label>
                <select
                  name="offerType"
                  id="offerType"
                  value={newOffer.offerType}
                  onChange={handleInputChange}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-md bg-white"
                >
                  <option value="PRODUTO">Produto</option>
                  <option value="ANIMAL">Animal</option>
                  <option value="UTENSILIO">Utensilio</option>
                </select>
              </div>

              <div>
                <label htmlFor="product" className="block text-sm font-medium text-slate-700">Produto / Item</label>
                <input type="text" name="product" id="product" value={newOffer.product} onChange={handleInputChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" placeholder="Ex: Bezerro Nelore / Trator / Soja" />
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">Quantidade</label>
                <input type="text" name="quantity" id="quantity" value={newOffer.quantity} onChange={handleInputChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" placeholder="Ex: 50 cabecas / 1 unidade / 500 sacas" />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-slate-700">Preco de referencia</label>
                <input type="number" name="price" id="price" value={newOffer.price} onChange={handleInputChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" placeholder="Ex: 135.50" min="0" step="0.01" />
              </div>

              {newOffer.listingMode === 'AUCTION' ? (
                <>
                  <div>
                    <label htmlFor="minimumBid" className="block text-sm font-medium text-slate-700">Lance minimo</label>
                    <input type="number" name="minimumBid" id="minimumBid" value={newOffer.minimumBid} onChange={handleInputChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" placeholder="Ex: 1000.00" min="0" step="0.01" />
                  </div>
                  <div>
                    <label htmlFor="auctionEndAt" className="block text-sm font-medium text-slate-700">Encerramento do leilao</label>
                    <input type="datetime-local" name="auctionEndAt" id="auctionEndAt" value={newOffer.auctionEndAt} onChange={handleInputChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" />
                  </div>
                </>
              ) : (
                <div>
                  <label htmlFor="channel" className="block text-sm font-medium text-slate-700">Subcanal</label>
                  <select name="channel" id="channel" value={newOffer.channel} onChange={handleInputChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md bg-white">
                    <option value="WHOLESALE_DIRECT">Atacadista Direto</option>
                    <option value="RETAIL_MARKETS">Mercados</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-slate-700">Localizacao</label>
                <input type="text" name="location" id="location" value={newOffer.location} onChange={handleInputChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" placeholder="Ex: Fazenda Santa Luzia - MT" />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">Descricao</label>
                <input type="text" name="description" id="description" value={newOffer.description} onChange={handleInputChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" placeholder="Observacoes da oferta" />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full p-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-70">
                {isSubmitting ? 'Publicando...' : 'Publicar Oferta'}
              </button>
              {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800">Ofertas Publicadas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                  <tr>
                    <th className="px-6 py-3">Data</th>
                    <th className="px-6 py-3">Item</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Modo</th>
                    <th className="px-6 py-3">Quantidade</th>
                    <th className="px-6 py-3">Preco/Lance</th>
                    <th className="px-6 py-3">Canal</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.length === 0 && (
                    <tr>
                      <td className="px-6 py-6 text-slate-500" colSpan={9}>
                        Nenhuma oferta cadastrada.
                      </td>
                    </tr>
                  )}
                  {offers.map((offer) => (
                    <tr key={offer.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-6 py-4">{offer.date}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        <div>{offer.product}</div>
                        {offer.location && <div className="text-xs text-slate-500">{offer.location}</div>}
                      </td>
                      <td className="px-6 py-4">{typeLabel(offer.offerType)}</td>
                      <td className="px-6 py-4">{modeLabel(offer.listingMode)}</td>
                      <td className="px-6 py-4">{offer.quantity}</td>
                      <td className="px-6 py-4">
                        <div>{formatCurrency(offer.price)}</div>
                        {offer.listingMode === 'AUCTION' && (
                          <div className="text-xs text-slate-500">
                            Min: {formatCurrency(offer.minimumBid ?? offer.price)} | Ate {toDisplayDateTime(offer.auctionEndAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">{offer.listingMode === 'AUCTION' ? 'Leilao P2P' : channelLabel(offer.channel)}</td>
                      <td className="px-6 py-4"><StatusBadge status={offer.status} /></td>
                      <td className="px-6 py-4 text-right">
                        {offer.status === 'ATIVA' && (
                          <button
                            onClick={() => void handleDeleteOffer(offer)}
                            disabled={deletingId === offer.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-60"
                          >
                            <TrashIcon className="h-4 w-4" />
                            {deletingId === offer.id ? 'Excluindo...' : 'Excluir'}
                          </button>
                        )}
                      </td>
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

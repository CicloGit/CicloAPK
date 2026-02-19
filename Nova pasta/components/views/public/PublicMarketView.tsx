import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowLeftIcon from '../../icons/ArrowLeftIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import {
  AggregatedStat,
  AuctionListing,
  MarketSaturation,
  MarketTrend,
  NewsItem,
  PublicInputCostIndex,
  PublicMarketPriceCategory,
  PublicMarketPriceItem,
  PublicMarketSummary,
} from '../../../types';
import { publicMarketService } from '../../../services/publicMarketService';

const CATEGORY_FILTERS: Array<{ label: string; value: 'ALL' | PublicMarketPriceCategory }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Commodities', value: 'COMMODITY' },
  { label: 'Animais', value: 'LIVESTOCK' },
  { label: 'Insumos', value: 'INPUT' },
];

const PublicMarketView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'about' | 'overview' | 'risk'>('about');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);

  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [regionalStats, setRegionalStats] = useState<AggregatedStat[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [auctionListings, setAuctionListings] = useState<AuctionListing[]>([]);
  const [marketSaturation, setMarketSaturation] = useState<MarketSaturation[]>([]);

  const [marketSummary, setMarketSummary] = useState<PublicMarketSummary | null>(null);
  const [inputCostIndex, setInputCostIndex] = useState<PublicInputCostIndex | null>(null);
  const [publicPrices, setPublicPrices] = useState<PublicMarketPriceItem[]>([]);
  const [priceFilter, setPriceFilter] = useState<'ALL' | PublicMarketPriceCategory>('ALL');

  const formatCurrency = (value: number, currency = 'BRL') =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);

  const formatPct = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  useEffect(() => {
    const loadPublicMarket = async () => {
      setIsLoading(true);
      setLoadError(null);
      setLoadNotice(null);
      try {
        const [
          trendsResult,
          statsResult,
          newsResult,
          auctionsResult,
          saturationResult,
          summaryResult,
          pricesResult,
          indexResult,
        ] = await Promise.allSettled([
          publicMarketService.listMarketTrends(),
          publicMarketService.listRegionalStats(),
          publicMarketService.listNewsItems(),
          publicMarketService.listAuctionListings(),
          publicMarketService.listMarketSaturation(),
          publicMarketService.getPublicMarketSummary(),
          publicMarketService.listPublicMarketPrices(),
          publicMarketService.getInputCostIndex(),
        ]);

        const publicPricesData = pricesResult.status === 'fulfilled' ? pricesResult.value : [];
        const inputCostIndexData =
          indexResult.status === 'fulfilled'
            ? indexResult.value
            : summaryResult.status === 'fulfilled'
            ? summaryResult.value.inputCostIndex
            : null;

        const fallbackSummary: PublicMarketSummary | null =
          publicPricesData.length > 0
            ? {
                updatedAt: new Date().toISOString(),
                countsByCategory: {
                  COMMODITY: publicPricesData.filter((item) => item.category === 'COMMODITY').length,
                  LIVESTOCK: publicPricesData.filter((item) => item.category === 'LIVESTOCK').length,
                  INPUT: publicPricesData.filter((item) => item.category === 'INPUT').length,
                },
                topCommodities: publicPricesData.filter((item) => item.category === 'COMMODITY').slice(0, 5),
                topLivestock: publicPricesData.filter((item) => item.category === 'LIVESTOCK').slice(0, 5),
                topInputs: publicPricesData.filter((item) => item.category === 'INPUT').slice(0, 5),
                inputCostIndex: inputCostIndexData,
              }
            : null;

        setMarketTrends(trendsResult.status === 'fulfilled' ? trendsResult.value : []);
        setRegionalStats(statsResult.status === 'fulfilled' ? statsResult.value : []);
        setNewsItems(newsResult.status === 'fulfilled' ? newsResult.value : []);
        setAuctionListings(auctionsResult.status === 'fulfilled' ? auctionsResult.value : []);
        setMarketSaturation(saturationResult.status === 'fulfilled' ? saturationResult.value : []);
        setPublicPrices(publicPricesData);
        setInputCostIndex(inputCostIndexData);
        setMarketSummary(summaryResult.status === 'fulfilled' ? summaryResult.value : fallbackSummary);

        const failedRequests = [
          trendsResult,
          statsResult,
          newsResult,
          auctionsResult,
          saturationResult,
          summaryResult,
          pricesResult,
          indexResult,
        ].filter((result) => result.status === 'rejected').length;

        if (failedRequests === 8) {
          setLoadError('Nao foi possivel carregar o mercado publico.');
        } else if (failedRequests > 0) {
          setLoadNotice('Alguns indicadores estao indisponiveis no momento, mas a visualizacao principal foi carregada.');
        }
      } catch {
        setLoadError('Nao foi possivel carregar o mercado publico.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadPublicMarket();
  }, []);

  const visiblePriceItems = useMemo(
    () => publicPrices.filter((item) => (priceFilter === 'ALL' ? true : item.category === priceFilter)),
    [priceFilter, publicPrices]
  );

  const SaturationBar: React.FC<{ value: number; riskLevel: string }> = ({ value, riskLevel }) => {
    let colorClass = 'bg-emerald-500';
    if (riskLevel === 'Warning') colorClass = 'bg-orange-500';
    if (riskLevel === 'Oversupply') colorClass = 'bg-red-600';
    return (
      <div className="w-full bg-slate-200 rounded-full h-4 mt-2">
        <div className={`h-4 rounded-full ${colorClass}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando intelligence..." />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-slate-900 text-white pb-24">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">
            Ciclo<span className="text-emerald-400">+</span> Intelligence
          </h1>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-semibold flex items-center bg-slate-800 px-4 py-2 rounded-full border border-slate-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Area do Cliente
          </button>
        </div>
        <div className="container mx-auto px-6 py-12 text-center">
          <h2 className="text-5xl font-extrabold mb-4">O Ecossistema Completo do Agro</h2>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto">
            Gestao, inteligencia de mercado e seguranca financeira em uma unica plataforma.
          </p>
        </div>
        <div className="container mx-auto px-6 mt-8 flex justify-center gap-4">
          <button
            onClick={() => setActiveTab('about')}
            className={`px-6 py-2 rounded-full font-bold ${activeTab === 'about' ? 'bg-emerald-500' : 'bg-slate-800'}`}
          >
            Solucoes
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2 rounded-full font-bold ${activeTab === 'overview' ? 'bg-emerald-500' : 'bg-slate-800'}`}
          >
            Mercado
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`px-6 py-2 rounded-full font-bold ${activeTab === 'risk' ? 'bg-emerald-500' : 'bg-slate-800'}`}
          >
            Risco
          </button>
        </div>
      </div>

      <div className="container mx-auto px-6 -mt-16 pb-12">
        {loadError && <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>}
        {loadNotice && <div className="mb-6 p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">{loadNotice}</div>}

        {activeTab !== 'about' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {marketTrends.map((m, i) => (
              <div key={`${m.commodity}-${i}`} className="bg-white rounded-lg shadow-lg p-6 border-b-4 border-emerald-500">
                <h3 className="font-semibold text-slate-700">{m.commodity}</h3>
                <div className="text-xl font-bold text-slate-800">{formatCurrency(m.price)}</div>
                <p className="text-sm text-emerald-600">{m.change}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-emerald-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-slate-800">Indices Publicos</h3>
                <span className="text-xs text-slate-500">
                  Atualizado: {marketSummary?.updatedAt ? new Date(marketSummary.updatedAt).toLocaleString('pt-BR') : '-'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Commodities</p>
                  <p className="text-2xl font-bold text-slate-800">{marketSummary?.countsByCategory.COMMODITY ?? 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Animais</p>
                  <p className="text-2xl font-bold text-slate-800">{marketSummary?.countsByCategory.LIVESTOCK ?? 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Insumos</p>
                  <p className="text-2xl font-bold text-slate-800">{marketSummary?.countsByCategory.INPUT ?? 0}</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs text-slate-500">Indice de Insumos (7d / 30d)</p>
                  <p className="text-lg font-bold text-slate-800">
                    {inputCostIndex ? `${formatPct(inputCostIndex.window7d)} / ${formatPct(inputCostIndex.window30d)}` : 'Sem dados'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="flex flex-wrap gap-2 mb-4">
                {CATEGORY_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setPriceFilter(filter.value)}
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      priceFilter === filter.value ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              {visiblePriceItems.length === 0 ? (
                <div className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-lg p-4">
                  Sem dados de indices publicos no momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-500 border-b">
                      <tr>
                        <th className="py-2">Ativo</th>
                        <th className="py-2">Categoria</th>
                        <th className="py-2">Preco</th>
                        <th className="py-2">1d</th>
                        <th className="py-2">7d</th>
                        <th className="py-2">30d</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePriceItems.map((item) => (
                        <tr key={`${item.symbol}-${item.category}`} className="border-b last:border-b-0">
                          <td className="py-2">
                            <p className="font-semibold text-slate-800">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.symbol}</p>
                          </td>
                          <td className="py-2">{item.category}</td>
                          <td className="py-2">{formatCurrency(item.price, item.currency)}</td>
                          <td className={`py-2 ${item.change1d >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPct(item.change1d)}</td>
                          <td className={`py-2 ${item.change7d >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPct(item.change7d)}</td>
                          <td className={`py-2 ${item.change30d >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPct(item.change30d)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-indigo-600">
            <h3 className="text-2xl font-bold">Indicador de Saturacao de Demanda</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              {marketSaturation.map((item) => (
                <div key={item.id} className="border p-6 rounded-lg bg-slate-50">
                  <h4 className="font-semibold text-slate-700">{item.commodity}</h4>
                  <SaturationBar value={(item.currentProduction / item.totalDemand) * 100} riskLevel={item.riskLevel} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Noticias de Mercado</h3>
              <div className="space-y-4">
                {newsItems.slice(0, 6).map((item) => (
                  <article key={item.id} className="border-b last:border-b-0 pb-3 last:pb-0">
                    <p className="text-xs text-slate-500">{item.date} · {item.source}</p>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-600">{item.summary}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Leiloes e Estatisticas</h3>
              <div className="space-y-4">
                {auctionListings.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-600">{item.location} · {item.date}</p>
                  </div>
                ))}
                {regionalStats.slice(0, 4).map((item) => (
                  <div key={item.label} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-lg font-bold text-slate-800">{item.value}</p>
                    <p className="text-xs text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicMarketView;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrendingUpIcon from '../../icons/TrendingUpIcon';
import ArrowLeftIcon from '../../icons/ArrowLeftIcon';
import LockClosedIcon from '../../icons/LockClosedIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { AggregatedStat, AuctionListing, MarketSaturation, MarketTrend, NewsItem } from '../../../types';
import { publicMarketService } from '../../../services/publicMarketService';

const PublicMarketView: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'about' | 'overview' | 'risk'>('about');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
    const [regionalStats, setRegionalStats] = useState<AggregatedStat[]>([]);
    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
    const [auctionListings, setAuctionListings] = useState<AuctionListing[]>([]);
    const [marketSaturation, setMarketSaturation] = useState<MarketSaturation[]>([]);

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    useEffect(() => {
        const loadPublicMarket = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [trends, stats, news, auctions, saturation] = await Promise.all([
                    publicMarketService.listMarketTrends(),
                    publicMarketService.listRegionalStats(),
                    publicMarketService.listNewsItems(),
                    publicMarketService.listAuctionListings(),
                    publicMarketService.listMarketSaturation(),
                ]);
                setMarketTrends(trends);
                setRegionalStats(stats);
                setNewsItems(news);
                setAuctionListings(auctions);
                setMarketSaturation(saturation);
            } catch {
                setLoadError('Nao foi possivel carregar o mercado publico.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadPublicMarket();
    }, []);
    
    const SaturationBar: React.FC<{ value: number, riskLevel: string }> = ({ value, riskLevel }) => {
        let colorClass = 'bg-emerald-500';
        if (riskLevel === 'Warning') colorClass = 'bg-orange-500';
        if (riskLevel === 'Oversupply') colorClass = 'bg-red-600';
        return <div className="w-full bg-slate-200 rounded-full h-4 mt-2"><div className={`h-4 rounded-full ${colorClass}`} style={{ width: `${Math.min(value, 100)}%` }}></div></div>;
    };

    if (isLoading) {
        return <LoadingSpinner text="Carregando intelligence..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="bg-slate-900 text-white pb-24">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold">Ciclo<span className="text-emerald-400">+</span> Intelligence</h1>
                    <button onClick={() => navigate('/login')} className="text-sm font-semibold flex items-center bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Area do Cliente
                    </button>
                </div>
                <div className="container mx-auto px-6 py-12 text-center">
                    <h2 className="text-5xl font-extrabold mb-4">O Ecossistema Completo do Agro</h2>
                    <p className="text-lg text-slate-400 max-w-3xl mx-auto">Gestao, inteligencia de mercado e seguranca financeira em uma unica plataforma.</p>
                </div>
                <div className="container mx-auto px-6 mt-8 flex justify-center gap-4">
                    <button onClick={() => setActiveTab('about')} className={`px-6 py-2 rounded-full font-bold ${activeTab === 'about' ? 'bg-emerald-500' : 'bg-slate-800'}`}>Solucoes</button>
                    <button onClick={() => setActiveTab('overview')} className={`px-6 py-2 rounded-full font-bold ${activeTab === 'overview' ? 'bg-emerald-500' : 'bg-slate-800'}`}>Mercado</button>
                    <button onClick={() => setActiveTab('risk')} className={`px-6 py-2 rounded-full font-bold ${activeTab === 'risk' ? 'bg-emerald-500' : 'bg-slate-800'}`}>Risco</button>
                </div>
            </div>

            <div className="container mx-auto px-6 -mt-16 pb-12">
                {activeTab !== 'about' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                        {marketTrends.map((m, i) => (
                            <div key={i} className="bg-white rounded-lg shadow-lg p-6 border-b-4 border-emerald-500">
                                <h3 className="font-semibold text-slate-700">{m.commodity}</h3>
                                <div className="text-xl font-bold text-slate-800">{formatCurrency(m.price)}</div>
                                <p className="text-sm text-emerald-600">{m.change}</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'risk' && (
                    <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-indigo-600">
                        <h3 className="text-2xl font-bold">Indicador de Saturacao de Demanda</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                            {marketSaturation.map(item => (
                                <div key={item.id} className="border p-6 rounded-lg bg-slate-50">
                                    <h4 className="font-semibold text-slate-700">{item.commodity}</h4>
                                    <SaturationBar value={(item.currentProduction / item.totalDemand) * 100} riskLevel={item.riskLevel} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicMarketView;

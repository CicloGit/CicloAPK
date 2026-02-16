import { CultivarFactor, ProductFactor } from '../types';

export const SECTOR_VARIETIES: Record<string, string[]> = {
  Agricultura: ['Soja', 'Milho', 'Algodao', 'Cafe', 'Cana-de-acucar'],
  Hortifruti: ['Tomate', 'Alface', 'Morango', 'Batata'],
  Fruticultura: ['Laranja', 'Maca', 'Uva', 'Banana', 'Manga'],
  'Pecuaria (Bovinos Corte)': ['Cria', 'Recria', 'Engorda', 'Ciclo Completo'],
  'Pecuaria (Bovinos Leite)': ['Producao de Leite', 'Criacao de Novilhas'],
  Silvicultura: ['Eucalipto', 'Pinus', 'Teca'],
  Apicultura: ['Producao de Mel', 'Criacao de Rainhas'],
  Piscicultura: ['Tilapia', 'Tambaqui', 'Camarao'],
  Avicultura: ['Frango de Corte', 'Poedeiras (Ovos)'],
  Suinocultura: ['Ciclo Completo', 'Terminacao'],
  Ovinocultura: ['Corte', 'La'],
  Equinocultura: ['Criacao', 'Treinamento'],
  Caprinocultura: ['Leite', 'Corte'],
  'Producao de Sementes': ['Soja', 'Milho', 'Trigo', 'Feijao'],
};

export const cultivarFactors: CultivarFactor[] = [
  { name: 'Brachiaria brizantha', factor: 1.0 },
  { name: 'Panicum maximum (Mombaca)', factor: 1.5 },
  { name: 'Cynodon (Tifton 85)', factor: 1.8 },
];

export const productFactors: ProductFactor[] = [
  { name: 'Nenhum', factor: 0, performance: 'Manutencao' },
  { name: 'Sal Mineral 80 P', factor: 0.1, performance: '+10% GMD' },
  { name: 'Proteinado Aguas', factor: 0.25, performance: '+25% GMD' },
  { name: 'Racao Concentrada 18%', factor: 0.5, performance: '+50% GMD' },
];

export const AVG_WEIGHT_GAIN_PER_UA = 0.6;
export const PRICE_PER_KG_LIVE_WEIGHT = 10.5;

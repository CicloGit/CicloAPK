import { z } from 'zod';

export const createFarmSchema = {
  body: z.object({
    name: z.string().min(3),
    code: z.string().min(2),
    city: z.string().min(2),
    state: z.string().min(2),
  }),
};

export const registerGenericCadastroSchema = {
  params: z.object({
    farmId: z.string().min(2),
    cadastroType: z.enum([
      'unidades',
      'usuarios',
      'perfis',
      'fornecedores',
      'clientes',
      'produtosInsumos',
      'currais',
      'centroCusto',
    ]),
  }),
  body: z.object({
    data: z.record(z.unknown()),
  }),
};

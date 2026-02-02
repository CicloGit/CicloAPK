# Roadmap Curto (próximos passos)

1) **Auth real**: integrar Firebase Auth no app (SDK), criar função para aplicar custom claims `role` + `tenantId` após cadastro pelo Owner.
2) **Persistência**: implementar Firestore adapters na API (Nest) para `users`, `suppliers`, `inventory`, `requests`, `opportunities`.
3) **Provisionamento de usuários**: endpoint que cria usuário via Firebase Admin, grava no `users` com `tenantId`, envia convite.
4) **Asaas**: configurar cliente e webhook receiver no Nest (`/asaas/webhook`), persistir eventos e reconciliar faturas.
5) **Guard de tenant no app**: toda chamada à API enviar `x-tenant-id` do contexto, bloquear caso divergente.
6) **Design/UX**: definir identidade visual, tipografia custom e componentes comuns (botões, listas, cards).
7) **CI/CD**: pipelines Railway + EAS (Expo) com ambientes `dev`/`prod` e variáveis segregadas.

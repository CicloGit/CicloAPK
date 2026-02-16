# Firebase em Modo Real (Windows + VS Code)

## 1) Instalar Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

## 2) Criar projetos
Crie ao menos dois projetos:
- `ciclo-plus-agro-dev`
- `ciclo-plus-agro-prod`

## 3) Service Account (Admin SDK)
No Console Firebase/Google Cloud:
1. Projeto > Configurações > Contas de serviço.
2. Gerar nova chave privada (JSON).
3. Salvar em local seguro fora do repositório.

## 4) Configurar no Windows
### PowerShell (sessão atual)
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\\credenciais\\firebase-adminsdk.json"
```

### Persistente (Usuário)
```powershell
setx GOOGLE_APPLICATION_CREDENTIALS "C:\\credenciais\\firebase-adminsdk.json"
```

Depois feche e reabra o terminal do VS Code.

## 5) Bucket Storage
Defina no `.env`:
```env
FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
```

## 6) Verificação prática
Execute o backend e teste:
```http
GET /api/healthcheck?farmId=farm-healthcheck
```
Se gravar e ler documento, conexão real está ativa.

## 7) Segurança e custo
- Nunca versione arquivo JSON de credenciais.
- Use regras mínimas de acesso no Firestore/Storage para produção.
- Monitore custos de leitura/escrita e Storage.
- Habilite orçamentos e alertas no Google Cloud Billing.

## 8) Emuladores
Este backend não usa emuladores. Não configure `connectFirestoreEmulator`.

# Pacote Agro Compliance (Ciclo+) — Regras, API e Código Base (compatível com AI Studio por OpenAPI)

Este pacote contém os **arquivos indispensáveis** para implementar o módulo Agro do sistema descrito:
- Rastreamento de gado por lote e por animal.
- Cadastro e rastreamento de pastos (com geofence).
- Controle por eventos (entrada, saída, transferência, inventário, conferência, venda).
- **Liberação condicionada** por etapa (mudança de estágio) e por operação crítica (emissão de Nota Fiscal, alimentação, medicamentos, transferência).
- Travas automáticas quando houver **divergência de inventário** (por exemplo, uma cabeça fora).
- Evidências com sensores: **Identificação por radiofrequência (RFID)**, **Sistema de posicionamento global (GPS)**, **balança**, **câmera**.
- Conferência de ciclo: libera mudança de estágio somente após conferência aprovada e ciclo fechado.

## Estrutura de pastas

- `openapi/agro-compliance-openapi.yaml`  
  Especificação OpenAPI 3.0.3 completa para integração (API Tools em AI Studio).

- `rules/agro-rules-full.json`  
  Conjunto completo de regras em formato JSON (linguagem de domínio de regras) para o motor de regras.

- `src/`  
  Código base em TypeScript (Node.js) com:
  - Avaliador de evidências (pontuação e tipo).
  - Motor de regras simples (avaliador determinístico).
  - Serviços de nascimento (mãe e filho com identificação curta).
  - Serviços de ciclo, conferência e mudança de estágio.
  - Serviço de travas (locks) para operações críticas.

- `firestore/firestore.rules`  
  Regras de segurança (modelo multi-organizacional com `orgId`).

- `aistudio/`  
  Arquivos auxiliares para uso em AI Studio:
  - `tooling-notes.md` com instruções de uso do OpenAPI como ferramenta.
  - `system-prompt.md` com um prompt de sistema sugerido para o agente operar o módulo.

## Identificação curta: Mãe e Filho

### Código da Mãe (curto)
Formato: `ORG-SEQ-DC`
- `ORG`: código da organização (2 a 3 caracteres).
- `SEQ`: número sequencial (cinco dígitos, com zeros à esquerda).
- `DC`: dígito verificador (um dígito) calculado pelo algoritmo de Luhn.

Exemplo: `CO-01234-7`

### Código do Filho (extensão)
Formato: `<CodigoDaMae>-NN`
- `NN`: extensão sequencial por mãe (dois dígitos: 01 a 99).

Exemplos:
- `CO-01234-7-01`
- `CO-01234-7-02`

## Regra de ouro do Agro
Se o lote estiver divergente (por exemplo, falta uma cabeça):
- travar **alimentação**
- travar **medicamentos**
- travar **transferência**
- travar **emissão de Nota Fiscal de venda**

A liberação ocorre somente após:
- inventário reconciliado (contagem esperada igual à contagem atual) **e**
- evidências válidas registradas **e**
- auditoria registrada.

## Como executar o código base (opcional)

Este código é um ponto de partida. Para rodar localmente:

1. Instale dependências:
   - `npm install`
2. Rode em desenvolvimento:
   - `npm run dev`

Observação: integração com banco de dados, mensageria e autenticação deve ser conectada à sua infraestrutura (por exemplo, Firestore, Postgres, etc.).

## Licença e uso
Você pode adaptar estes arquivos para sua implantação e licenciamento do módulo no Agro.


## Novidades na versão 1.0.1
- Controle de insumos (estoque por armazém e ledger).
- Entrada por Nota Fiscal (produtos e animais).
- Consumo de alimentação e medicamentos com baixa de estoque, saldo e lastro fiscal.

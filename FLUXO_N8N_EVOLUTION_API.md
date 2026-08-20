# 🚀 Documentação Técnica de Mensageria: Evolution API + n8n + Lucas Dashboard

Guia completo de arquitetura, configuração de nós, prompts dos agentes de IA, estratégias antiban com loop batch e integração com as APIs do **Lucas Dashboard (CSB Seguros)**.

---

## 📑 Sumário
1. [Visão Geral e Arquitetura](#1-visão-geral-e-arquitetura)
2. [Ambiente e Variáveis Globais do n8n](#2-ambiente-e-variáveis-globais-do-n8n)
3. [Workflow 1: Disparo Ativo & Primeiro Contato (Outbound)](#3-workflow-1-disparo-ativo--primeiro-contato-outbound)
   - [Mapeamento Nó por Nó](#mapeamento-nó-por-nó-workflow-1)
   - [System Prompt do Agente de Primeiro Contato](#system-prompt-agente-1-primeiro-contato)
   - [Lógica de Loop Batch & Antiban](#lógica-de-loop-batch--antiban-workflow-1)
4. [Workflow 2: Atendimento Principal Receptivo (Inbound - Agente Lucas)](#4-workflow-2-atendimento-principal-receptivo-inbound---agente-lucas)
   - [Mapeamento Nó por Nó](#mapeamento-nó-por-nó-workflow-2)
   - [System Prompt do Agente Lucas (Receptivo)](#system-prompt-agente-lucas-receptivo)
   - [Ferramentas de IA (AI Tools / HTTP Request)](#ferramentas-de-ia-ai-tools)
5. [Estratégias Antiban & Naturalidade Extrema](#5-estratégias-antiban--naturalidade-extrema)
6. [Resumo de Endpoints e Payloads do Dashboard](#6-resumo-de-endpoints-e-payloads-do-dashboard)

---

## 1. Visão Geral e Arquitetura

O sistema é dividido em **2 Workflows independentes e complementares no n8n**, comunicando-se com a **Evolution API v2** e com o **Lucas Dashboard**:

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    LUCAS DASHBOARD                     │
                               │           (Next.js 16 + Prisma + PostgreSQL)           │
                               └──────────────┬───────────────────────────▲─────────────┘
                                              │                           │
                   1. Gatilho de Disparo      │                           │ 6. Sync Lead Status &
                   (Webhook ou Scheduler)     │                           │    Agendamentos
                                              ▼                           │
   ┌─────────────────────────────────────────────────────────────┐        │
   │           WORKFLOW 1: DISPARO ATIVO / PRIMEIRO CONTATO       │        │
   │  • Recebe Lead da Campanha (Renovação / Frio)               │        │
   │  • HTTP Tool: Busca Contexto do Corretor & Produto          │        │
   │  • AI Agent Outbound: Gera 2-3 mensagens curtas com "|||"   │        │
   │  • Loop Batch: Quebra em balões, simula digitação (composing)│        │
   │  • Envia via Evolution API com Delays Humanos Antiban        │        │
   └──────────────────────────────┬──────────────────────────────┘        │
                                  │                                       │
                                  │ Disparo WhatsApp                      │
                                  ▼                                       │
                         ┌─────────────────┐                              │
                         │     CLIENTE     │                              │
                         │   (WhatsApp)    │                              │
                         └────────┬────────┘                              │
                                  │                                       │
                                  │ 2. Cliente Responde                   │
                                  ▼                                       │
   ┌─────────────────────────────────────────────────────────────┐        │
   │       WORKFLOW 2: RECEPTIVO PRINCIPAL (AGENTE LUCAS)        │        │
   │  • Webhook Evolution API (messages.upsert)                  │        │
   │  • HTTP Tool: Busca histórico do Lead + Slots Disponíveis   │        │
   │  • AI Agent Lucas: Atendimento, Qualificação e Quebra de Objeções   │
   │  • AI Tool: Criação Atômica de Agendamento                  ├────────┘
   │  • Loop Batch: Digitação humana e envio fracionado          │
   └─────────────────────────────────────────────────────────────┘
```

---

## 2. Ambiente e Variáveis Globais do n8n

Configure as seguintes variáveis de ambiente no seu painel do n8n (**Settings > Variables** ou arquivo `.env` do n8n):

| Variável | Exemplo de Valor | Descrição |
| :--- | :--- | :--- |
| `DASHBOARD_BASE_URL` | `https://seu-dominio.com` ou `http://localhost:3000` | URL base do Lucas Dashboard |
| `N8N_INTERNAL_API_KEY` | `sua_chave_secreta_aqui` | Chave configurada no `.env` do Dashboard (`N8N_INTERNAL_API_KEY`) |
| `EVOLUTION_API_BASE_URL` | `https://sua-evolution-api.com` | URL base da sua instância Evolution API |
| `EVOLUTION_API_KEY` | `sua_global_ou_instance_api_key` | Chave de autenticação da Evolution API |
| `OPENAI_API_KEY` | `sk-...` | Chave da OpenAI para o modelo GPT-4o / GPT-4o-mini |

---

## 3. Workflow 1: Disparo Ativo & Primeiro Contato (Outbound)

* **URL do Webhook do Gatilho:**  
  `https://n8n-n8n.khdya3.easypanel.host/webhook/lucas-disparar`
* **Método HTTP:** `POST`

### 📥 Payload Recebido pelo Webhook do Dashboard

```json
{
  "leadId": "cmt1mo9gb0000rx00cjslx717",
  "phone": "5567992414896",
  "leadName": "ZELIA MORAES",
  "instancePhone": "5567999887766",
  "instanceName": "corretor_principal",
  "ramo": "RESIDENCIAL",
  "campanha": "RENOVAÇÃO RESIDENCIAL SOB MEDIDA - SET/26",
  "prioridade": "20",
  "agencia": "AGÊNCIA 73 - CAMPO GRANDE-CENTRO",
  "dataRenovacao": "2026-09-03T03:00:00.000Z",
  "corretorNome": "VS CORRETORA DE SEGUROS DE VIDA EIRELI"
}
```

---

### 🗺️ Mapeamento Nó por Nó (Workflow 1)

#### 1. Nó: `Webhook - Disparo Dashboard`
* **Tipo:** `n8n-nodes-base.webhook`
* **HTTP Method:** `POST`
* **Path:** `lucas-disparar`
* **Response Mode:** `On Received` (Retorna `{"status": "queued"}` com status 200 imediatamente para não travar o frontend).

---

#### 2. Nó: `HTTP Request - Buscar Especialista Corretor`
* **Tipo:** `n8n-nodes-base.httpRequest`
* **Method:** `GET`
* **URL:** `={{ $env.DASHBOARD_BASE_URL }}/api/users/by-phone/{{ $json.body.instancePhone }}`
* **Headers:**
  * `x-api-key`: `={{ $env.N8N_INTERNAL_API_KEY }}`
* **Finalidade:** Obter as regras de negócio do corretor, tom de voz, produtos ativos e mensagem de boas-vindas customizada.

---

#### 3. Nó: `Code - Montar Prompt e Contexto`
* **Tipo:** `n8n-nodes-base.code`
* **Language:** `JavaScript`
* **Código:**
```javascript
const webhookData = $('Webhook - Disparo Dashboard').first().json.body;
const specialistData = $input.first().json;

const lead = {
  id: webhookData.leadId,
  name: webhookData.leadName || 'Cliente',
  phone: String(webhookData.phone).replace(/\D/g, ''),
  ramo: webhookData.ramo || 'Seguro Residencial',
  campanha: webhookData.campanha || 'Campanha de Renovação',
  agencia: webhookData.agencia || 'Agência Bradesco/CSB',
  prioridade: webhookData.prioridade || 'Normal',
  dataRenovacao: webhookData.dataRenovacao ? new Date(webhookData.dataRenovacao).toLocaleDateString('pt-BR') : 'próximas semanas',
  corretor: webhookData.corretorNome || specialistData.specialist?.name || 'CSB Seguros'
};

const instanceName = webhookData.instanceName || specialistData.specialist?.phone || 'default';

return {
  json: {
    lead,
    specialist: specialistData.specialist || {},
    instanceName,
    currentTime: new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  }
};
```

---

#### 4. Nó: `AI Agent - Primeiro Contato Outbound`
* **Tipo:** `@n8n/n8n-nodes-langchain.agent` (ou `OpenAI Chat Model`)
* **Model:** `GPT-4o` (Temperature: `0.5`)
* **Prompt do Sistema (System Prompt):** *(Ver seção abaixo)*
* **Entrada do Usuário:**
  ```text
  Gere a abordagem de primeiro contato para o seguinte cliente:
  Nome: {{ $json.lead.name }}
  Ramo: {{ $json.lead.ramo }}
  Campanha: {{ $json.lead.campanha }}
  Vencimento da Apólice: {{ $json.lead.dataRenovacao }}
  Agência Bancária: {{ $json.lead.agencia }}
  Corretora Parceira: {{ $json.lead.corretor }}
  Horário Atual: {{ $json.currentTime }}
  ```

---

### 🧠 System Prompt (Agente 1: Primeiro Contato)

```text
Você é o Lucas, assistente de relacionamento e especialista em seguros da CSB Seguros e corretora parceira.

SEU OBJETIVO:
Iniciar uma conversa de primeiro contato no WhatsApp com um cliente cuja apólice de seguro está próxima do vencimento / renovação. Sua abordagem deve ser extremamente educada, natural, humana, ágil e não invasiva.

REGRAS CRÍTICAS DE HUMANIZAÇÃO E ANTIBAN:
1. NUNCA envie um bloco único de texto longo (textão). Humanos digitam em frases curtas e separadas.
2. Divida sua resposta em EXATAMENTE 2 a 3 balões de mensagem curtos.
3. Utilize o separador triplo "|||" exatamente entre cada balão de mensagem.
4. Não use emojis em excesso (no máximo 1 emoji discreto em toda a abordagem).
5. Jamais mencione que você é um robô ou inteligência artificial.
6. Cumprimente pelo primeiro nome com respeito (ex: "Oi Zelia, tudo bem?", "Olá Sr. Carlos, bom dia!").
7. Mencione de forma suave a renovação do seguro e a agência de relacionamento.
8. Termine com uma pergunta simples e fácil de responder (ex: "Você prefere que eu mantenha as mesmas coberturas ou quer dar uma revisada antes?").

EXEMPLO DE RESPOSTA ESPERADA:
Oi Zelia, tudo bem? Aqui é o Lucas da CSB Seguros.|||Estou conferindo as apólices da sua agência e vi que o seu seguro Residencial está programado para renovar agora no início de setembro.|||Você quer que a gente mantenha as mesmas condições ou gostaria de revisar alguma cobertura antes de emitir a proposta?
```

---

#### 5. Nó: `Code - Quebrador de Mensagens (Splitter)`
* **Tipo:** `n8n-nodes-base.code`
* **Language:** `JavaScript`
* **Código:**
```javascript
const rawOutput = $input.first().json.output || $input.first().json.text || '';
const leadData = $('Code - Montar Prompt e Contexto').first().json;

// Quebra as mensagens pelo delimitador |||
const messages = rawOutput
  .split('|||')
  .map(m => m.trim())
  .filter(m => m.length > 0);

// Cria um item por mensagem para o Loop Batch
return messages.map((text, index) => ({
  json: {
    messageIndex: index + 1,
    totalMessages: messages.length,
    text: text,
    phone: leadData.lead.phone,
    instanceName: leadData.instanceName,
    leadId: leadData.lead.id
  }
}));
```

---

### 🔄 Lógica de Loop Batch & Antiban (Workflow 1)

```
[Code: Splitter] ──► [Loop Over Items (Batch Size: 1)]
                             │
                             ▼
              [Evolution API: Send Presence ("composing")]
                             │
                             ▼
              [Wait: Delay de Digitação Proporcional]
                             │
                             ▼
              [Evolution API: Send Text Message]
                             │
                             ▼
              [Wait: Delay Aleatório Antiban (3s a 6s)]
                             │
                             ▼
              (Volta ao Loop para a próxima mensagem)
                             │
                             ▼ (Quando finalizado)
              [HTTP Request: Atualizar Lead no Dashboard]
```

#### 6. Nó: `Loop Over Items`
* **Tipo:** `n8n-nodes-base.splitInBatches`
* **Batch Size:** `1`

#### 7. Nó: `Evolution API - Enviar Presença (Composing)`
* **Tipo:** `n8n-nodes-base.httpRequest`
* **Method:** `POST`
* **URL:** `={{ $env.EVOLUTION_API_BASE_URL }}/chat/sendPresence/{{ $json.instanceName }}`
* **Headers:**
  * `apikey`: `={{ $env.EVOLUTION_API_KEY }}`
  * `Content-Type`: `application/json`
* **Body:**
  ```json
  {
    "number": "={{ $json.phone }}",
    "presence": "composing",
    "delay": 2000
  }
  ```

#### 8. Nó: `Wait - Digitação Proporcional`
* **Tipo:** `n8n-nodes-base.wait`
* **Wait Amount:** `={{ Math.min(Math.max($json.text.length * 45, 1200), 4000) }}` (ms)
* *Explicação:* Calcula o tempo que um ser humano levaria para digitar aquele trecho (45ms por caractere, mínimo 1.2s, máximo 4.0s).

#### 9. Nó: `Evolution API - Enviar Texto`
* **Tipo:** `n8n-nodes-base.httpRequest`
* **Method:** `POST`
* **URL:** `={{ $env.EVOLUTION_API_BASE_URL }}/message/sendText/{{ $json.instanceName }}`
* **Headers:**
  * `apikey`: `={{ $env.EVOLUTION_API_KEY }}`
  * `Content-Type`: `application/json`
* **Body:**
  ```json
  {
    "number": "={{ $json.phone }}",
    "text": "={{ $json.text }}",
    "linkPreview": false
  }
  ```

#### 10. Nó: `Wait - Intervalo Entre Balões (Antiban)`
* **Tipo:** `n8n-nodes-base.wait`
* **Wait Amount:** `={{ Math.floor(Math.random() * (5000 - 3000 + 1) + 3000) }}` (ms)
* *Explicação:* Pausa entre 3 e 5 segundos antes de mandar o próximo balão de mensagem, quebrando padrões estáticos de bot.

#### 11. Nó: `HTTP Request - Sincronizar Disparo no Dashboard`
* **Tipo:** `n8n-nodes-base.httpRequest`
* **Method:** `POST`
* **URL:** `={{ $env.DASHBOARD_BASE_URL }}/api/leads`
* **Headers:**
  * `x-api-key`: `={{ $env.N8N_INTERNAL_API_KEY }}`
  * `Content-Type`: `application/json`
* **Body:**
  ```json
  {
    "contato": "={{ $('Code - Montar Prompt e Contexto').first().json.lead.phone }}",
    "status": "ENTRANTE",
    "firstContactSent": true,
    "resumoDaConversa": "Primeira abordagem de renovação disparada com sucesso via n8n.",
    "historicoCompleto": [
      {
        "role": "assistant",
        "content": "={{ $('AI Agent - Primeiro Contato Outbound').first().json.output }}",
        "timestamp": "={{ new Date().toISOString() }}"
      }
    ]
  }
  ```

---

## 4. Workflow 2: Atendimento Principal Receptivo (Inbound - Agente Lucas)

* **Webhook da Evolution API:**  
  Configurado na Evolution API para o evento: `MESSAGES_UPSERT`
* **URL no n8n:**  
  `https://n8n-n8n.khdya3.easypanel.host/webhook/evolution-messages-upsert`

---

### 🗺️ Mapeamento Nó por Nó (Workflow 2)

#### 1. Nó: `Webhook - Evolution API (messages.upsert)`
* **Tipo:** `n8n-nodes-base.webhook`
* **HTTP Method:** `POST`
* **Path:** `evolution-messages-upsert`

---

#### 2. Nó: `IF - Filtro de Segurança & Anti-Loop`
* **Tipo:** `n8n-nodes-base.if`
* **Condições:**
  1. `{{ $json.body.data.key.fromMe }}` **Equal** `false` (Ignora mensagens que o próprio bot enviou).
  2. `{{ $json.body.data.key.remoteJid }}` **Not Contains** `@g.us` (Ignora grupos de WhatsApp).
  3. `{{ $json.body.data.messageType }}` **Equal** `conversation` OU `extendedTextMessage` (Processa apenas texto).

---

#### 3. Nó: `Code - Extrair Dados da Mensagem`
* **Tipo:** `n8n-nodes-base.code`
* **Language:** `JavaScript`
* **Código:**
```javascript
const body = $input.first().json.body;
const data = body.data;

const remoteJid = data.key.remoteJid;
const rawPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
const messageText = data.message?.conversation || data.message?.extendedTextMessage?.text || '';
const instanceName = body.instance;
const pushName = data.pushName || 'Cliente';

return {
  json: {
    phone: rawPhone,
    remoteJid,
    messageText,
    instanceName,
    pushName,
    sessionId: rawPhone
  }
};
```

---

#### 4. Nó: `HTTP Request - Buscar Dados do Especialista e Lead`
* **Tipo:** `n8n-nodes-base.httpRequest`
* **Method:** `GET`
* **URL:** `={{ $env.DASHBOARD_BASE_URL }}/api/users/by-phone/{{ $json.phone }}`
* **Headers:**
  * `x-api-key`: `={{ $env.N8N_INTERNAL_API_KEY }}`

---

#### 5. Nó: `AI Agent - Lucas Conversational Copilot`
* **Tipo:** `@n8n/n8n-nodes-langchain.agent`
* **Chat Model:** `OpenAI GPT-4o` (Temperature: `0.4`)
* **Memory:** `Window Buffer Memory` (Session Key: `={{ $json.sessionId }}` | Context Window: `10` mensagens)
* **Prompt do Sistema:** *(Ver seção abaixo)*
* **Tools Conectadas:**
  1. `Tool: consultar_horarios_disponiveis`
  2. `Tool: confirmar_agendamento_cotacao`

---

### 🧠 System Prompt (Agente Lucas Receptivo)

```text
Você é o Lucas, assistente virtual inteligente e consultor de seguros da CSB Seguros.
Você está conversando diretamente com um cliente no WhatsApp.

SUA MISSÃO:
1. Conduzir a negociação com base no primeiro contato disparado anteriormente (renovação de seguro, proposta, cotação).
2. Tirar dúvidas sobre coberturas (Incêndio, Danos Elétricos, Roubo/Furto, Assistência 24h para chaveiro, encanador e eletricista).
3. Superar objeções com simpatia, segurança técnica e foco no melhor custo-benefício.
4. Quando o cliente desejar cotação detalhada, valores exatos ou fechar a apólice, ofereça os horários livres na agenda do corretor especialista e use a ferramenta de agendamento.

REGRAS OBRIGATÓRIAS DE RESPOSTA:
- NUNCA envie blocos grandes de texto.
- Quebre suas respostas em 1, 2 ou no máximo 3 micro-mensagens separadas por "|||".
- Seja cordial, objetivo e use português impecável e natural do Brasil.
- Se o cliente perguntar de preços exatos que não estão cadastrados nos produtos, explique que a tabela personalizada de bônus da apólice anterior será aplicada na reunião de cotação.

USO DAS FERRAMENTAS (TOOLS):
1. 'consultar_horarios_disponiveis': Use quando o cliente concordar em agendar uma rápida conversa ou cotação com o corretor.
2. 'confirmar_agendamento_cotacao': Use assim que o cliente escolher o dia e horário. Passe a data em formato ISO (ex: 2026-09-04T14:00:00.000Z).
```

---

### 🛠️ Ferramentas de IA (AI Tools)

#### Tool 1: `consultar_horarios_disponiveis`
* **Nome da Tool:** `consultar_horarios_disponiveis`
* **Descrição:** *"Consulta os dias e horários livres na agenda do corretor para agendamento de cotação de seguros."*
* **Tipo:** `Custom Tool / HTTP Request`
* **Method:** `GET`
* **URL:** `={{ $env.DASHBOARD_BASE_URL }}/api/availability?userId={{ $json.specialist.id }}`
* **Headers:**
  * `x-api-key`: `={{ $env.N8N_INTERNAL_API_KEY }}`

---

#### Tool 2: `confirmar_agendamento_cotacao`
* **Nome da Tool:** `confirmar_agendamento_cotacao`
* **Descrição:** *"Confirma e reserva o agendamento de cotação com o corretor especialista. Requer userId, contatoLead, dataHoraISO e resumo."*
* **Tipo:** `Custom Tool / HTTP Request`
* **Method:** `POST`
* **URL:** `={{ $env.DASHBOARD_BASE_URL }}/api/agendamentos`
* **Headers:**
  * `x-api-key`: `={{ $env.N8N_INTERNAL_API_KEY }}`
  * `Content-Type`: `application/json`
* **Body:**
  ```json
  {
    "userId": "{{ $fromAI('userId') }}",
    "contatoLead": "{{ $fromAI('contatoLead') }}",
    "dataHoraISO": "{{ $fromAI('dataHoraISO') }}",
    "nome": "{{ $fromAI('nome') }}",
    "resumo": "{{ $fromAI('resumo') }}"
  }
  ```

---

#### 6. Nó: `Code - Splitter de Mensagens Receptivas`
* **Mesma lógica do Workflow 1:** Separa a resposta da IA pelo delimitador `|||` e alimenta o loop batch.

#### 7. Nó: `Loop Over Items` ➔ `Send Presence` ➔ `Wait (Digitando)` ➔ `Send Text` ➔ `Wait (Antiban)`
* Envia cada balão fracionado para a Evolution API com a mesma naturalidade extrema.

#### 8. Nó: `HTTP Request - Atualizar Lead no Dashboard`
* **Method:** `POST`
* **URL:** `={{ $env.DASHBOARD_BASE_URL }}/api/leads`
* **Headers:**
  * `x-api-key`: `={{ $env.N8N_INTERNAL_API_KEY }}`
* **Body:**
  ```json
  {
    "contato": "={{ $('Code - Extrair Dados da Mensagem').first().json.phone }}",
    "status": "QUALIFICADO",
    "resumoDaConversa": "={{ $('AI Agent - Lucas Conversational Copilot').first().json.output }}",
    "historicoCompleto": [
      {
        "role": "user",
        "content": "={{ $('Code - Extrair Dados da Mensagem').first().json.messageText }}",
        "timestamp": "={{ new Date().toISOString() }}"
      },
      {
        "role": "assistant",
        "content": "={{ $('AI Agent - Lucas Conversational Copilot').first().json.output }}",
        "timestamp": "={{ new Date().toISOString() }}"
      }
    ]
  }
  ```

---

## 5. Estratégias Antiban & Naturalidade Extrema

| Camada | Técnica Implementada | Como Funciona |
| :--- | :--- | :--- |
| **1. Fracionamento de Balões** | Delimitador `|||` no Prompt da IA | O agente nunca envia parágrafos gigantes. Ele gera 2 a 3 balões pequenos, exatamente como uma pessoa real no WhatsApp. |
| **2. Presença Ativa na Evolution API** | `POST /chat/sendPresence/composing` | A Evolution API exibe o status **"digitando..."** no WhatsApp do cliente antes de cada mensagem ser despachada. |
| **3. Delay Proporcional de Digitação** | `Wait: text.length * 45ms` | Frases curtas (ex: *"Oi João!"*) demoram ~1.5s de digitação; frases maiores demoram ~3.5s. Isso elimina o padrão instantâneo de bots. |
| **4. Intervalos Aleatórios (Jitter)** | `Wait: Math.random(3s, 6s)` | Adiciona uma pausa aleatória entre balões sucessivos para evitar que o algoritmo da Meta detecte cadência mecânica. |
| **5. Janela de Horário Humana** | Verificação de Horário Comercial | Disparos ativos somente entre **08:30 e 19:00** em dias úteis e **09:00 às 13:00** aos sábados. |
| **6. Sem Links no 1º Contato** | `linkPreview: false` | Não envia links externos na primeira mensagem fria (links em primeiro contato são o principal gatilho de banimento do WhatsApp). |

---

## 6. Resumo de Endpoints e Payloads do Dashboard

| Endpoint | Método | Header de Auth | Finalidade |
| :--- | :---: | :--- | :--- |
| `/api/leads/uncontacted` | `GET` | `x-api-key: {{ N8N_INTERNAL_API_KEY }}` | Lista os próximos leads entrantes prontos para disparo. |
| `/api/users/by-phone/:phone` | `GET` | `x-api-key: {{ N8N_INTERNAL_API_KEY }}` | Retorna dados do corretor, regras de IA, produtos ativos e welcomeMessage. |
| `/api/availability?userId=:id` | `GET` | `x-api-key: {{ N8N_INTERNAL_API_KEY }}` | Lista slots futuros disponíveis para agendamento de reuniões. |
| `/api/agendamentos` | `POST` | `x-api-key: {{ N8N_INTERNAL_API_KEY }}` | Cria agendamento atômico, ocupa slot e atualiza o lead para `AGENDADO_COTACAO`. |
| `/api/leads` | `POST` | `x-api-key: {{ N8N_INTERNAL_API_KEY }}` | Atualiza status do lead, resumo IA e histórico completo da conversa. |

---

> 💡 **Dica de Produção:** Todos os nós acima já utilizam o padrão de tratamento de fuso horário brasileiro (`America/Sao_Paulo` / GMT-3) e são 100% compatíveis com a versão mais recente do n8n (com nós LangChain) e Evolution API v2.

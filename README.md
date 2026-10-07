# 👁️ apMonitora - Sistema de Monitoramento de Fluxo e Ocupação com Reconhecimento Facial

O **apMonitora** é uma solução completa para controle e monitoramento de fluxo de pessoas (entradas e saídas) em recintos fechados, empresas, eventos ou portarias. Utilizando visão computacional e inteligência artificial, o sistema realiza a detecção e processamento de rostos em tempo real a partir de dispositivos móveis (tablets/totens) posicionados nos pontos de acesso, sincronizando a taxa de ocupação instantaneamente via WebSocket e oferecendo um painel gerencial moderno com relatórios analíticos.

---

## 📋 Sumário

- [Visão Geral e Recursos](#-visão-geral-e-recursos)
- [Arquitetura e Tecnologias](#-arquitetura-e-tecnologias)
- [Organização do Repositório](#-organização-do-repositório)
- [Modelagem do Banco de Dados](#-modelagem-do-banco-de-dados)
- [Como Preparar e Executar o Sistema](#-como-preparar-e-executar-o-sistema)
  - [Opção 1: Execução com Docker (Recomendada)](#opção-1-execução-com-docker-recomendada)
  - [Opção 2: Execução Local (Desenvolvimento Nativo)](#opção-2-execução-local-desenvolvimento-nativo)
  - [Configuração de Câmeras e HTTPS (SSL)](#configuração-de-câmeras-e-https-ssl)
- [Guia: Atualizando o Ambiente para Vibe Coding (VibeCode)](#-guia-atualizando-o-ambiente-para-vibe-coding-vibecode)
  - [O que é Vibe Coding neste projeto?](#o-que-é-vibe-coding-neste-projeto)
  - [Estrutura de Agentes, Workflows e Regras (.agent)](#estrutura-de-agentes-workflows-e-regras-agent)
  - [Configuração de Editores e Ferramentas AI (Cursor / Antigravity / Windsurf / VS Code)](#configuração-de-editores-e-ferramentas-ai)
  - [Integração com MCP (Model Context Protocol)](#integração-com-mcp-model-context-protocol)
  - [Workflows e Comandos Disponíveis](#workflows-e-comandos-disponíveis)
- [Convenções de Código e Padrões](#-convenções-de-código-e-padrões)

---

## 🎯 Visão Geral e Recursos

### Principais Funcionalidades:
1. **Modo Monitor (Totem / Tablet)**:
   - Interface PWA otimizada para tablets em suporte de parede ou balcão.
   - Detecção facial em tempo real no próprio navegador (client-side) via `face-api.js` (TinyFaceDetector), garantindo resposta rápida e economia de banda.
   - Captura e envio automático do frame ao detectar uma face.
   - Contador de pessoas presentes no recinto com atualização em tempo real (Socket.io).
   - Feedback visual e sonoro imediato de registro (Verde para **ENTRADA**, Vermelho para **SAÍDA**).

2. **Microserviço de Visão Computacional**:
   - Extração de *embeddings* faciais de alta precisão (vetores de 128 dimensões) utilizando `face_recognition` (dlib) e `OpenCV`.
   - Comparação e busca por similaridade de rostos para futura identificação automática.

3. **Painel Gerencial (Dashboard)**:
   - Monitoramento da contagem de ocupação em tempo real.
   - Gráficos de fluxo por hora e dia.
   - Feed ao vivo com fotos dos últimos registros de entrada/saída.
   - Status de conexão dos tablets/dispositivos cadastrados.

4. **Gestão de Pessoas e Rotulagem**:
   - Galeria de rostos capturados para rotulagem manual pelo operador.
   - Associação de faces a nomes e categorias (ex: *Funcionário*, *Visitante*, *Prestador de Serviço*).

5. **Relatórios e Análises**:
   - Histórico detalhado de movimentações por período.
   - Exportação e relatórios de fluxo e permanência.

---

## 🏗️ Arquitetura e Tecnologias

O sistema é construído sobre uma arquitetura híbrida de microsserviços distribuídos:

```mermaid
graph TD
    subgraph Tablets / Totens
        T1["📱 Tablet ENTRADA<br/>(PWA + face-api.js)"]
        T2["📱 Tablet SAÍDA<br/>(PWA + face-api.js)"]
    end

    subgraph "Frontend Gateway (Nginx)"
        NGINX["🌐 Nginx Proxy Reverso<br/>HTTPS (Portas 80 / 443)"]
    end

    subgraph "Backend (Node.js)"
        API["🟢 API REST (Express.js 5)<br/>Porta 3001"]
        WS["🔌 WebSocket Server (Socket.io)"]
        PRISMA["⚡ Prisma ORM"]
    end

    subgraph "Face Service (Python)"
        FASTAPI["🐍 FastAPI + Uvicorn<br/>Porta 8000"]
        CV["🧠 OpenCV + face_recognition (dlib)"]
    end

    subgraph "Persistência e Storage"
        POSTGRES[("🐘 PostgreSQL 16")]
        UPLOADS["📁 Diretório de Uploads<br/>(Snapshots de Rostos)"]
    end

    T1 -->|HTTPS / WSS| NGINX
    T2 -->|HTTPS / WSS| NGINX
    NGINX -->|Proxy /api e /socket.io| API
    NGINX -->|Arquivos Estáticos| T1

    API -->|POST /embedding /detect /match| FASTAPI
    FASTAPI --> CV
    API --> PRISMA
    PRISMA --> POSTGRES
    API --> UPLOADS
    WS -.->|Ocupação em Tempo Real| T1
    WS -.->|Ocupação em Tempo Real| T2
```

### Stack Tecnológica:

- **Frontend**:
  - HTML5, Vanilla JavaScript ES Modules (foco em máxima performance e baixa latência em tablets).
  - **Vite 6**: Bundler e servidor de desenvolvimento ágil com suporte a PWA e SSL local.
  - **face-api.js**: Modelos leves de IA executados no navegador via WebGL/TensorFlow.js.
  - **Socket.io Client**: Conexão bidirecional para atualização de ocupação instantânea.
  - **Nginx**: Servidor web de produção com proxy reverso e terminação SSL/TLS.

- **Backend**:
  - **Node.js 20+** com **Express 5**.
  - **Socket.io**: Gerenciamento de eventos de conexão, salas (`tablet:entrada`, `tablet:saida`, `dashboard`) e broadcasts de ocupação.
  - **Prisma ORM**: Modelagem de dados com tipagem estrita e migrações estruturadas.
  - **Multer**: Processamento e armazenamento de snapshots em disco.

- **Face Service (Visão Computacional)**:
  - **Python 3.11+** com **FastAPI** e **Uvicorn**.
  - **OpenCV** e **face_recognition** (wrapper de dlib): Detecção, alinhamento facial e extração de vetor de características (embedding de 128 dimensões).

- **Banco de Dados**:
  - **PostgreSQL 16**: Armazenamento relacional com índices para consultas rápidas de eventos e contagem de ocupação.

---

## 📁 Organização do Repositório

```text
apMonitora/
├── .agent/                     # Configurações de IA, Agentes Especialistas e Vibe Coding
│   ├── agents/                 # Perfis de agentes (backend, frontend, planner, auditor, etc.)
│   ├── rules/                  # Regras globais de engenharia (GEMINI.md)
│   ├── skills/                 # Habilidades e boas práticas automatizadas
│   ├── workflows/              # Fluxos de trabalho (/plan, /create, /orchestrate, /debug)
│   └── mcp_config.json         # Configuração de ferramentas e servidores MCP
├── backend/                    # API REST e WebSocket em Node.js
│   ├── prisma/
│   │   └── schema.prisma       # Schema do banco de dados PostgreSQL
│   ├── src/
│   │   ├── routes/             # Rotas da API (devices, events, occupancy, persons)
│   │   ├── services/           # Lógica de negócio (faceService, occupancyService)
│   │   ├── websocket/          # Handlers e salas do Socket.io
│   │   └── server.js           # Ponto de entrada do servidor
│   ├── uploads/                # Diretório de armazenamento de fotos capturadas
│   ├── Dockerfile
│   └── package.json
├── face-service/               # Microserviço de Visão Computacional em Python
│   ├── routers/                # Endpoints FastAPI (/detect, /embedding, /match)
│   ├── services/               # Processamento com dlib/OpenCV e utilitários de imagem
│   ├── main.py                 # Ponto de entrada do FastAPI
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # Aplicação Web PWA (Totens e Dashboard)
│   ├── public/
│   │   └── models/             # Pesos dos modelos de IA do face-api.js
│   ├── src/
│   │   ├── pages/              # Telas (setup, monitor, dashboard, reports, labeling)
│   │   ├── services/           # Comunicação com API, Câmera, WebSocket e Face API
│   │   ├── styles/             # Design system moderno e responsivo para tablets
│   │   └── main.js             # Roteador e inicialização
│   ├── nginx.conf              # Configuração do Nginx para produção
│   ├── Dockerfile
│   └── vite.config.js
├── certs/                      # Certificados SSL para execução HTTPS
├── docker-compose.yml          # Orquestrador de contêineres Docker
├── .env.example                # Modelo de variáveis de ambiente
└── README.md                   # Documentação do projeto
```

---

## 🗄️ Modelagem do Banco de Dados

Seguindo as convenções do projeto, todas as tabelas e colunas são nomeadas em **português**:

| Tabela | Descrição | Principais Colunas |
|---|---|---|
| `dispositivos` | Cadastro de tablets/câmeras | `id`, `nome`, `tipo` (`ENTRADA`/`SAIDA`), `localizacao`, `ativo`, `criado_em` |
| `eventos` | Registro de cada passagem | `id`, `dispositivo_id`, `tipo`, `imagem_rosto_url`, `vetor_caracteristicas`, `confianca`, `pessoa_id`, `registrado_em` |
| `pessoas` | Pessoas cadastradas/rotuladas | `id`, `nome`, `rotulo` (ex: "Funcionário"), `foto_url`, `criado_em` |
| `rostos_pessoa` | Embeddings faciais conhecidos | `id`, `pessoa_id`, `vetor_caracteristicas`, `imagem_url`, `criado_em` |
| `ocupacao` | Contagem em tempo real | `id`, `localizacao` (ex: "principal"), `contagem`, `atualizado_em` |

---

## 🚀 Como Preparar e Executar o Sistema

### Opção 1: Execução com Docker (Recomendada)

A maneira mais rápida e consistente de subir todo o ecossistema (PostgreSQL, Face Service, Backend Node.js e Frontend Nginx):

#### 1. Pré-requisitos:
- [Docker](https://www.docker.com/) (v24+)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)

#### 2. Configurar o arquivo de ambiente:
Copie o arquivo de exemplo para `.env` na raiz do projeto:
```bash
cp .env.example .env
```

#### 3. Iniciar todos os serviços:
```bash
docker compose up --build -d
```

#### 4. Sincronizar o schema do banco de dados (Prisma):
```bash
docker compose exec backend npm run db:push
```

#### 5. Acessar os serviços:
- **Aplicação Web (Frontend)**: [https://localhost](https://localhost) (ou `http://localhost`)
- **API Backend Node.js**: [http://localhost:3001/api/devices](http://localhost:3001/api/devices)
- **Documentação do Face Service (FastAPI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Opção 2: Execução Local (Desenvolvimento Nativo)

Se você preferir executar os serviços diretamente na máquina para desenvolvimento rápido:

#### 1. Pré-requisitos:
- **Node.js** v20+ e **npm**
- **Python** 3.10+ com `pip` e ferramentas de compilação C++ (necessárias para compilar o dlib se não usar wheels pré-compilados)
- **PostgreSQL** 16 instalado e rodando localmente

#### 2. Configurar o Banco de Dados:
Crie o banco no PostgreSQL e configure a string de conexão no `backend/.env` ou `.env`:
```env
DATABASE_URL=postgresql://apmonitora:apmonitora_pass@localhost:5432/apmonitora_db?schema=public
```

#### 3. Iniciar o Microserviço Python (Face Service):
```bash
cd face-service
python -m venv venv

# No Windows PowerShell:
.\venv\Scripts\Activate.ps1
# No Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

#### 4. Iniciar a API Backend (Node.js):
Em outro terminal:
```bash
cd backend
npm install
npm run db:push
npm run dev
```

#### 5. Iniciar o Frontend (Vite):
Em um terceiro terminal:
```bash
cd frontend
npm install
npm run dev
```
O Vite iniciará o servidor de desenvolvimento com suporte a HTTPS em `https://localhost:5173`.

---

### 📷 Configuração de Câmeras e HTTPS (SSL)

> [!IMPORTANT]
> Os navegadores modernos (Chrome, Safari, Firefox) **bloqueiam o acesso à câmera (`navigator.mediaDevices.getUserMedia`)** quando a página é acessada via HTTP em endereços que não sejam `localhost` (por exemplo, ao acessar o IP da rede `http://192.168.x.x` em um tablet).

Para usar os tablets na rede local:
1. Os certificados autoassinados já estão gerados no diretório `certs/` (`apmonitora.crt` e `apmonitora.key`).
2. Ao acessar `https://<IP_DO_SERVIDOR>` pelo tablet, aceite o aviso de segurança do certificado autoassinado para liberar o uso da câmera e do PWA.
3. No ambiente Docker, o container `frontend` já atende automaticamente na porta HTTPS `443` com suporte aos certificados da pasta `certs/`.

---

## ⚡ Guia: Atualizando o Ambiente para Vibe Coding (VibeCode)

### O que é Vibe Coding neste projeto?

**Vibe Coding** é o paradigma de desenvolvimento contemporâneo onde o desenvolvedor atua como arquiteto, maestro e revisor, direcionando assistentes inteligentes de IA (como Google Antigravity, Cursor, Windsurf, Claude Code, Cline/Roo Code) através de especificações precisas, contexto arquitetural vivo e loops de feedback automatizados.

Neste repositório, o ambiente já foi preparado com o **Antigravity Agent Framework** na pasta `.agent/`, fornecendo regras estritas de engenharia, agentes especialistas e habilidades modulares.

---

### 🧠 Estrutura de Agentes, Workflows e Regras (`.agent`)

O projeto contém uma suíte completa de automação por IA:

1. **Regras Globais (`.agent/rules/GEMINI.md`)**:
   - Respostas e documentação técnica em português.
   - Nomes de tabelas e colunas obrigatoriamente em português.
   - Comentários explicativos obrigatórios em métodos e funções.
   - Clean Code sem código morto ou complexidade acidental.
   - Protocolo Socratic Gate: Validação de requisitos e casos de borda antes de alterações de grande porte.

2. **Agentes Especialistas (`.agent/agents/`)**:
   - `orchestrator.md`: Orquestração de tarefas complexas e delegação.
   - `backend-specialist.md`: APIs REST, WebSocket, Prisma, Postgres e segurança.
   - `frontend-specialist.md`: Interfaces modernas, responsividade para tablets e design sem clichês.
   - `security-auditor.md`: Auditoria de vulnerabilidades, validação de inputs e segurança de credenciais.
   - `project-planner.md`: Planejamento em 4 fases com planos executáveis.

3. **Habilidades Modulares (`.agent/skills/`)**:
   - `clean-code`: Princípios pragmáticos de código limpo e refatoração.
   - `database-design`: Boas práticas de modelagem e migrações no PostgreSQL.
   - `api-patterns`: Padronização de endpoints REST e respostas.
   - `vulnerability-scanner`: Análise automatizada de segurança.

---

### 🛠️ Configuração de Editores e Ferramentas AI

Para habilitar a experiência completa de Vibe Coding no seu editor:

#### 1. Google Antigravity IDE (Nativo do Repositório)
- O ambiente já está 100% configurado com as regras de `.agent/rules/GEMINI.md`.
- Para disparar comandos, utilize os workflows por slash commands no chat (ex: `/plan`, `/debug`, `/orchestrate`).

#### 2. Cursor AI (.cursorrules / System Prompt)
Se estiver usando o Cursor:
1. Certifique-se de que a pasta `.agent` está no projeto.
2. O arquivo `.agent/rules/GEMINI.md` serve como referência de diretrizes de código. Você pode criar um symlink ou copiar as regras para um arquivo `.cursorrules` na raiz:
   ```bash
   # Opcional para Cursor
   cp .agent/rules/GEMINI.md .cursorrules
   ```
3. Use o modo **Composer** com indexação de codebase ativa (`Cmd+I` ou `Ctrl+I`).

#### 3. VS Code + Cline / Roo Code / Continue.dev
1. Configure o diretório de contexto apontando para `.agent/rules/GEMINI.md` nas instruções customizadas do prompt de sistema.
2. Importe as ferramentas MCP disponíveis no arquivo `.agent/mcp_config.json`.

---

### 🔌 Integração com MCP (Model Context Protocol)

O projeto inclui suporte ao protocolo aberto **MCP** configurado em `.agent/mcp_config.json`:

- **Git MCP Server**: Permite que os agentes inspecionem histórico de commits, diffs e branches com precisão.
- **Memory MCP Server**: Permite que o assistente guarde memórias persistentes de decisões arquiteturais entre diferentes sessões de chat.

Para inicializar ou verificar as configurações MCP no seu ambiente, consulte o arquivo [`.agent/mcp_config.json`](file:///c:/desenvolvimento/javascript/apMonitora/.agent/mcp_config.json).

---

### 🤖 Workflows e Comandos Disponíveis

Ao trabalhar com os agentes de IA, utilize os workflows prontos documentados em `.agent/workflows/`:

| Comando | Finalidade | Como Usar |
|---|---|---|
| `/plan` | Criar plano detalhado de nova funcionalidade sem escrever código prematuro | `/plan Adicionar autenticação JWT para administradores` |
| `/brainstorm` | Explorar abordagens alternativas e decisões de arquitetura | `/brainstorm Estratégias para sincronização offline em tablets` |
| `/enhance` | Evoluir ou estender uma funcionalidade existente | `/enhance Adicionar filtro por período na tela de relatórios` |
| `/debug` | Investigação metódica em 4 fases para correção de bugs | `/debug Corrigir desconexão do socket quando o tablet entra em repouso` |
| `/orchestrate` | Coordenar múltiplos especialistas para tarefas complexas | `/orchestrate Revisão completa de segurança e performance` |
| `/test` | Geração e execução de suítes de testes automatizados | `/test Criar testes unitários para o occupancyService` |

---

## 📌 Convenções de Código e Padrões

Ao contribuir com código no projeto (manualmente ou via Vibe Coding):

1. **Idioma**:
   - Todo o banco de dados (tabelas, colunas, enums) **DEVE ser em português**.
   - Mensagens de retorno da API e documentação em português.
   - Código e variáveis em inglês ou português coerente com o módulo, priorizando clareza.
2. **Documentação de Métodos**:
   - Todo método, serviço ou rota deve possuir um bloco de comentários em português descrevendo sua responsabilidade, parâmetros e retornos.
3. **Imagens e Snapshots**:
   - Não salve dados binários brutos diretamente no banco relacional; salve as imagens no diretório `uploads/` e registre a URL/caminho relativo no banco de dados.
4. **Tratamento de Exceções**:
   - O microserviço Python e o backend Node.js devem retornar códigos HTTP semânticos (200, 201, 400, 404, 500) com mensagens de erro claras em JSON.

---

<p align="center">
  Desenvolvido com tecnologia de ponta para segurança e gestão inteligente de espaços.
</p>

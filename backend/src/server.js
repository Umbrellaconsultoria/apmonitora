import 'dotenv/config';

// Montar DATABASE_URL a partir das variáveis separadas
const { DB_USUARIO, DB_SENHA, DB_SERVIDOR, DB_PORTA, DB_DATABASE } = process.env;
if (DB_USUARIO && DB_SERVIDOR && DB_DATABASE) {
  process.env.DATABASE_URL = `postgresql://${DB_USUARIO}:${DB_SENHA}@${DB_SERVIDOR}:${DB_PORTA || 5432}/${DB_DATABASE}?schema=public`;
}

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

import dispositivosRouter from './routes/dispositivos.js';
import eventosRouter from './routes/eventos.js';
import ocupacaoRouter from './routes/ocupacao.js';
import pessoasRouter from './routes/pessoas.js';
import { setupWebSocket } from './websocket/handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

const rawCors = (process.env.CORS_ORIGINS || 'http://localhost:5173').trim();
const corsOrigins = rawCors === '*' ? true : rawCors.split(',').map(o => o.trim());

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

// Garantir que o diretório de uploads existe
const uploadDir = process.env.UPLOAD_DIR || './uploads';
mkdirSync(join(uploadDir, 'rostos'), { recursive: true });

// Middlewares
app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadDir));

// Disponibilizar io nas rotas via req.app
app.set('io', io);

// Rotas da API
app.use('/api/dispositivos', dispositivosRouter);
app.use('/api/eventos', eventosRouter);
app.use('/api/ocupacao', ocupacaoRouter);
app.use('/api/pessoas', pessoasRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket
setupWebSocket(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🟢 apMonitora Backend rodando na porta ${PORT}`);
  console.log(`📡 WebSocket disponível em ws://localhost:${PORT}`);
  console.log(`📁 Uploads em ${uploadDir}`);
});

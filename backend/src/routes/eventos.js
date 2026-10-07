import { Router } from 'express';
import multer from 'multer';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import prisma from '../lib/prisma.js';
import { atualizarOcupacao } from '../services/ocupacaoService.js';

const router = Router();

// Configuração do Multer para upload de imagens de rostos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(process.env.UPLOAD_DIR || './uploads', 'rostos'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${randomUUID()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.'));
    }
  },
});

// Registrar evento de entrada/saída
router.post('/', upload.single('imagem_rosto'), async (req, res) => {
  try {
    const { dispositivo_id, tipo, confianca } = req.body;

    if (!dispositivo_id || !tipo) {
      return res.status(400).json({ erro: 'dispositivo_id e tipo são obrigatórios' });
    }

    if (!['ENTRADA', 'SAIDA'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo deve ser ENTRADA ou SAIDA' });
    }

    // Verificar se dispositivo existe
    const dispositivo = await prisma.dispositivo.findUnique({
      where: { id: dispositivo_id },
    });

    if (!dispositivo) {
      return res.status(404).json({ erro: 'Dispositivo não encontrado' });
    }

    const imagemUrl = req.file ? `/uploads/rostos/${req.file.filename}` : null;

    const evento = await prisma.evento.create({
      data: {
        dispositivo_id,
        tipo,
        imagem_rosto_url: imagemUrl,
        confianca: confianca ? parseFloat(confianca) : null,
      },
      include: {
        dispositivo: true,
      },
    });

    // Atualizar ocupação e emitir via WebSocket
    const io = req.app.get('io');
    const ocupacao = await atualizarOcupacao(tipo, dispositivo.localizacao || 'principal');

    io.emit('evento:novo', evento);
    io.emit('ocupacao:atualizada', ocupacao);

    res.status(201).json({ evento, ocupacao });
  } catch (error) {
    console.error('Erro ao registrar evento:', error);
    res.status(500).json({ erro: 'Erro ao registrar evento' });
  }
});

// Listar eventos com filtros
router.get('/', async (req, res) => {
  try {
    const { tipo, dispositivo_id, data_inicio, data_fim, limite = '50', pagina = '1' } = req.query;

    const where = {};
    if (tipo) where.tipo = tipo;
    if (dispositivo_id) where.dispositivo_id = dispositivo_id;
    if (data_inicio || data_fim) {
      where.registrado_em = {};
      if (data_inicio) where.registrado_em.gte = new Date(data_inicio);
      if (data_fim) where.registrado_em.lte = new Date(data_fim);
    }

    const take = Math.min(parseInt(limite), 100);
    const skip = (parseInt(pagina) - 1) * take;

    const [eventos, total] = await Promise.all([
      prisma.evento.findMany({
        where,
        include: { dispositivo: true, pessoa: true },
        orderBy: { registrado_em: 'desc' },
        take,
        skip,
      }),
      prisma.evento.count({ where }),
    ]);

    res.json({
      dados: eventos,
      paginacao: {
        total,
        pagina: parseInt(pagina),
        limite: take,
        totalPaginas: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Erro ao listar eventos:', error);
    res.status(500).json({ erro: 'Erro ao listar eventos' });
  }
});

// Estatísticas de eventos
router.get('/estatisticas', async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;

    const where = {};
    if (data_inicio || data_fim) {
      where.registrado_em = {};
      if (data_inicio) where.registrado_em.gte = new Date(data_inicio);
      if (data_fim) where.registrado_em.lte = new Date(data_fim);
    }

    const [totalEntradas, totalSaidas, totalEventos] = await Promise.all([
      prisma.evento.count({ where: { ...where, tipo: 'ENTRADA' } }),
      prisma.evento.count({ where: { ...where, tipo: 'SAIDA' } }),
      prisma.evento.count({ where }),
    ]);

    // Eventos agrupados por hora (últimas 24h)
    const agora = new Date();
    const inicio24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000);

    const eventosPorHora = await prisma.$queryRaw`
      SELECT 
        date_trunc('hour', registrado_em) as hora,
        tipo,
        COUNT(*)::int as quantidade
      FROM eventos 
      WHERE registrado_em >= ${inicio24h}
      GROUP BY date_trunc('hour', registrado_em), tipo
      ORDER BY hora
    `;

    res.json({
      total_entradas: totalEntradas,
      total_saidas: totalSaidas,
      total_eventos: totalEventos,
      ocupacao_estimada: totalEntradas - totalSaidas,
      eventos_por_hora: eventosPorHora,
    });
  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error);
    res.status(500).json({ erro: 'Erro ao calcular estatísticas' });
  }
});

export default router;

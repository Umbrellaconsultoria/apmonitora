import { Router } from 'express';
import multer from 'multer';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import prisma from '../lib/prisma.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(process.env.UPLOAD_DIR || './uploads', 'rostos'));
  },
  filename: (req, file, cb) => {
    cb(null, `pessoa-${Date.now()}-${randomUUID()}${extname(file.originalname)}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 5242880 } });

// Listar pessoas
router.get('/', async (req, res) => {
  try {
    const { busca, rotulo } = req.query;

    const where = {};
    if (busca) {
      where.nome = { contains: busca, mode: 'insensitive' };
    }
    if (rotulo) {
      where.rotulo = rotulo;
    }

    const pessoas = await prisma.pessoa.findMany({
      where,
      include: {
        _count: { select: { eventos: true, rostos: true } },
      },
      orderBy: { criado_em: 'desc' },
    });

    res.json(pessoas);
  } catch (error) {
    console.error('Erro ao listar pessoas:', error);
    res.status(500).json({ erro: 'Erro ao listar pessoas' });
  }
});

// Criar pessoa com rótulo
router.post('/', upload.single('foto'), async (req, res) => {
  try {
    const { nome, rotulo } = req.body;

    if (!nome) {
      return res.status(400).json({ erro: 'Nome é obrigatório' });
    }

    const fotoUrl = req.file ? `/uploads/rostos/${req.file.filename}` : null;

    const pessoa = await prisma.pessoa.create({
      data: { nome, rotulo, foto_url: fotoUrl },
    });

    res.status(201).json(pessoa);
  } catch (error) {
    console.error('Erro ao criar pessoa:', error);
    res.status(500).json({ erro: 'Erro ao criar pessoa' });
  }
});

// Vincular evento a pessoa (rotulagem)
router.post('/:id/vincular-evento', async (req, res) => {
  try {
    const { evento_id } = req.body;

    if (!evento_id) {
      return res.status(400).json({ erro: 'evento_id é obrigatório' });
    }

    const evento = await prisma.evento.update({
      where: { id: evento_id },
      data: { pessoa_id: req.params.id },
      include: { pessoa: true },
    });

    res.json(evento);
  } catch (error) {
    console.error('Erro ao vincular evento:', error);
    res.status(500).json({ erro: 'Erro ao vincular evento a pessoa' });
  }
});

// Relatório de uma pessoa
router.get('/:id/relatorio', async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;

    const where = { pessoa_id: req.params.id };
    if (data_inicio || data_fim) {
      where.registrado_em = {};
      if (data_inicio) where.registrado_em.gte = new Date(data_inicio);
      if (data_fim) where.registrado_em.lte = new Date(data_fim);
    }

    const pessoa = await prisma.pessoa.findUnique({
      where: { id: req.params.id },
    });

    if (!pessoa) {
      return res.status(404).json({ erro: 'Pessoa não encontrada' });
    }

    const [eventos, totalEntradas, totalSaidas] = await Promise.all([
      prisma.evento.findMany({
        where,
        include: { dispositivo: true },
        orderBy: { registrado_em: 'desc' },
      }),
      prisma.evento.count({ where: { ...where, tipo: 'ENTRADA' } }),
      prisma.evento.count({ where: { ...where, tipo: 'SAIDA' } }),
    ]);

    res.json({
      pessoa,
      total_entradas: totalEntradas,
      total_saidas: totalSaidas,
      eventos,
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ erro: 'Erro ao gerar relatório da pessoa' });
  }
});

export default router;

import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// Listar todos os dispositivos
router.get('/', async (req, res) => {
  try {
    const dispositivos = await prisma.dispositivo.findMany({
      orderBy: { criado_em: 'desc' },
    });
    res.json(dispositivos);
  } catch (error) {
    console.error('Erro ao listar dispositivos:', error);
    res.status(500).json({ erro: 'Erro ao listar dispositivos' });
  }
});

// Buscar dispositivo por ID
router.get('/:id', async (req, res) => {
  try {
    const dispositivo = await prisma.dispositivo.findUnique({
      where: { id: req.params.id },
    });
    if (!dispositivo) {
      return res.status(404).json({ erro: 'Dispositivo não encontrado' });
    }
    res.json(dispositivo);
  } catch (error) {
    console.error('Erro ao buscar dispositivo:', error);
    res.status(500).json({ erro: 'Erro ao buscar dispositivo' });
  }
});

// Registrar novo dispositivo (tablet)
router.post('/', async (req, res) => {
  try {
    const { nome, tipo, localizacao } = req.body;

    if (!nome || !tipo) {
      return res.status(400).json({ erro: 'Nome e tipo são obrigatórios' });
    }

    if (!['ENTRADA', 'SAIDA'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo deve ser ENTRADA ou SAIDA' });
    }

    const dispositivo = await prisma.dispositivo.create({
      data: { nome, tipo, localizacao },
    });

    // Notificar via WebSocket
    req.app.get('io').emit('dispositivo:novo', dispositivo);

    res.status(201).json(dispositivo);
  } catch (error) {
    console.error('Erro ao criar dispositivo:', error);
    res.status(500).json({ erro: 'Erro ao criar dispositivo' });
  }
});

// Atualizar dispositivo
router.patch('/:id', async (req, res) => {
  try {
    const { nome, tipo, localizacao, ativo } = req.body;
    const dispositivo = await prisma.dispositivo.update({
      where: { id: req.params.id },
      data: {
        ...(nome !== undefined && { nome }),
        ...(tipo !== undefined && { tipo }),
        ...(localizacao !== undefined && { localizacao }),
        ...(ativo !== undefined && { ativo }),
      },
    });
    res.json(dispositivo);
  } catch (error) {
    console.error('Erro ao atualizar dispositivo:', error);
    res.status(500).json({ erro: 'Erro ao atualizar dispositivo' });
  }
});

// Remover dispositivo
router.delete('/:id', async (req, res) => {
  try {
    await prisma.dispositivo.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover dispositivo:', error);
    res.status(500).json({ erro: 'Erro ao remover dispositivo' });
  }
});

export default router;

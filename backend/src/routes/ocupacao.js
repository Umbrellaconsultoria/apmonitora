import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// Obter ocupação atual
router.get('/', async (req, res) => {
  try {
    const { localizacao = 'principal' } = req.query;

    let ocupacao = await prisma.ocupacao.findUnique({
      where: { localizacao },
    });

    // Criar registro se não existir
    if (!ocupacao) {
      ocupacao = await prisma.ocupacao.create({
        data: { localizacao, contagem: 0 },
      });
    }

    res.json(ocupacao);
  } catch (error) {
    console.error('Erro ao obter ocupação:', error);
    res.status(500).json({ erro: 'Erro ao obter ocupação' });
  }
});

// Resetar ocupação (manual, pelo operador)
router.post('/resetar', async (req, res) => {
  try {
    const { localizacao = 'principal', contagem = 0 } = req.body;

    const ocupacao = await prisma.ocupacao.upsert({
      where: { localizacao },
      update: { contagem },
      create: { localizacao, contagem },
    });

    req.app.get('io').emit('ocupacao:atualizada', ocupacao);

    res.json(ocupacao);
  } catch (error) {
    console.error('Erro ao resetar ocupação:', error);
    res.status(500).json({ erro: 'Erro ao resetar ocupação' });
  }
});

export default router;

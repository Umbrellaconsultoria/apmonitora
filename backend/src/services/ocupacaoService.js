import prisma from '../lib/prisma.js';

/**
 * Atualiza a contagem de ocupação no banco.
 * Incrementa em ENTRADA, decrementa em SAIDA (mínimo 0).
 */
export async function atualizarOcupacao(tipoEvento, localizacao = 'principal') {
  // Garantir que o registro de ocupação existe
  await prisma.ocupacao.upsert({
    where: { localizacao },
    update: {},
    create: { localizacao, contagem: 0 },
  });

  const incremento = tipoEvento === 'ENTRADA' ? 1 : -1;

  const ocupacao = await prisma.ocupacao.update({
    where: { localizacao },
    data: {
      contagem: {
        increment: incremento,
      },
    },
  });

  // Não permitir contagem negativa
  if (ocupacao.contagem < 0) {
    return prisma.ocupacao.update({
      where: { localizacao },
      data: { contagem: 0 },
    });
  }

  return ocupacao;
}

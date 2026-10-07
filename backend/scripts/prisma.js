/**
 * Helper que monta a DATABASE_URL a partir das variáveis separadas
 * e executa comandos do Prisma CLI.
 *
 * Uso: node scripts/prisma.js <comando>
 * Ex:  node scripts/prisma.js db push
 *      node scripts/prisma.js migrate dev
 *      node scripts/prisma.js studio
 */
import 'dotenv/config';
import { spawn } from 'child_process';

const { DB_USUARIO, DB_SENHA, DB_SERVIDOR, DB_PORTA, DB_DATABASE } = process.env;

if (!DB_USUARIO || !DB_SERVIDOR || !DB_DATABASE) {
  console.error('❌ Variáveis DB_USUARIO, DB_SERVIDOR e DB_DATABASE são obrigatórias no .env');
  process.exit(1);
}

const databaseUrl = `postgresql://${DB_USUARIO}:${DB_SENHA}@${DB_SERVIDOR}:${DB_PORTA || 5432}/${DB_DATABASE}?schema=public`;

console.log(`🔗 Conectando em ${DB_SERVIDOR}:${DB_PORTA || 5432}/${DB_DATABASE} como ${DB_USUARIO}`);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Informe o comando do Prisma. Ex: node scripts/prisma.js db push');
  process.exit(1);
}

const child = spawn('npx', ['prisma', ...args], {
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: 'inherit',
  shell: true,
});

child.on('close', (code) => {
  process.exit(code);
});

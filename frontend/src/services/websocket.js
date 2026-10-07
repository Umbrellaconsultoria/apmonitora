import { io } from 'socket.io-client';

// Em dev, o Vite proxy roteia /socket.io para o backend (mesma origem).
const SOCKET_URL = import.meta.env.VITE_API_URL || '';

let socket = null;
const listeners = new Map();

export function conectar() {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    console.log('🔌 WebSocket conectado');
    emitirEvento('conexao', { status: 'conectado' });
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ WebSocket desconectado:', reason);
    emitirEvento('conexao', { status: 'desconectado', reason });
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Reconectado após', attemptNumber, 'tentativas');
    emitirEvento('conexao', { status: 'reconectado' });
  });

  return socket;
}

export function registrarDispositivo(dispositivoId, tipo) {
  if (!socket) conectar();
  socket.emit('dispositivo:registrar', { dispositivo_id: dispositivoId, tipo });
}

export function registrarDashboard() {
  if (!socket) conectar();
  socket.emit('dashboard:registrar');
}

export function ouvirOcupacao(callback) {
  if (!socket) conectar();
  socket.on('ocupacao:atualizada', callback);
  return () => socket.off('ocupacao:atualizada', callback);
}

export function ouvirEventos(callback) {
  if (!socket) conectar();
  socket.on('evento:novo', callback);
  return () => socket.off('evento:novo', callback);
}

export function ouvirConexao(callback) {
  adicionarListener('conexao', callback);
  return () => removerListener('conexao', callback);
}

// Sistema interno de eventos
function emitirEvento(tipo, dados) {
  const cbs = listeners.get(tipo) || [];
  cbs.forEach(cb => cb(dados));
}

function adicionarListener(tipo, callback) {
  if (!listeners.has(tipo)) listeners.set(tipo, []);
  listeners.get(tipo).push(callback);
}

function removerListener(tipo, callback) {
  const cbs = listeners.get(tipo) || [];
  listeners.set(tipo, cbs.filter(cb => cb !== callback));
}

export function desconectar() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function estaConectado() {
  return socket?.connected || false;
}

/**
 * Gerenciador de conexões WebSocket.
 * Notifica os tablets e dashboards sobre mudanças em tempo real.
 */
export function setupWebSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`);

    // Tablet se identifica ao conectar
    socket.on('dispositivo:registrar', (data) => {
      const { dispositivo_id, tipo } = data;
      socket.join(`tipo:${tipo}`);
      socket.join(`dispositivo:${dispositivo_id}`);
      console.log(`📱 Dispositivo registrado: ${dispositivo_id} (${tipo})`);
    });

    // Dashboard se registra
    socket.on('dashboard:registrar', () => {
      socket.join('dashboard');
      console.log(`📊 Dashboard conectado: ${socket.id}`);
    });

    // Heartbeat para verificar se tablets estão online
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Cliente desconectado: ${socket.id} (${reason})`);
    });
  });
}

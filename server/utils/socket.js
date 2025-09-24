const jwt = require('jsonwebtoken');
const config = require('./config');
const logger = require('./logger');

let io;
let SocketServer;

const CAMPAIGN_ROOM_PREFIX = 'campaign:';

const parseCookies = (cookieHeader) => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (!name) {
      return acc;
    }

    const value = rest.join('=');
    try {
      acc[name] = decodeURIComponent(value || '');
    } catch (err) {
      acc[name] = value || '';
    }
    return acc;
  }, {});
};

const getCampaignRoom = (campaignId) => `${CAMPAIGN_ROOM_PREFIX}${campaignId}`;

const authenticateSocket = (socket, next) => {
  try {
    const { auth, headers } = socket.handshake || {};
    const tokenFromAuth = auth && auth.token;
    const cookies = parseCookies(headers && headers.cookie);
    const token = tokenFromAuth || cookies.token;

    if (!token) {
      const err = new Error('Unauthorized');
      err.data = { status: 401 };
      return next(err);
    }

    const payload = jwt.verify(token, config.jwtSecret);
    socket.user = payload;
    return next();
  } catch (error) {
    logger.warn('Socket authentication failed', {
      error: error.message,
      socketId: socket.id,
    });
    const err = new Error('Unauthorized');
    err.data = { status: 401 };
    return next(err);
  }
};

const registerConnectionHandlers = (socket) => {
  logger.info('Socket connected', {
    socketId: socket.id,
    username: socket.user?.username,
  });

  socket.on('campaign:join', (campaignId) => {
    if (typeof campaignId !== 'string' || campaignId.trim() === '') {
      return;
    }

    const normalizedId = campaignId.trim();
    socket.join(getCampaignRoom(normalizedId));
    logger.info('Socket joined campaign room', {
      socketId: socket.id,
      username: socket.user?.username,
      campaignId: normalizedId,
    });
  });

  socket.on('campaign:leave', (campaignId) => {
    if (typeof campaignId !== 'string' || campaignId.trim() === '') {
      return;
    }

    const normalizedId = campaignId.trim();
    socket.leave(getCampaignRoom(normalizedId));
    logger.info('Socket left campaign room', {
      socketId: socket.id,
      username: socket.user?.username,
      campaignId: normalizedId,
    });
  });

  socket.on('disconnect', () => {
    logger.info('Socket disconnected', {
      socketId: socket.id,
      username: socket.user?.username,
    });
  });
};

const initializeSocket = (server) => {
  if (io) {
    return io;
  }

  if (!SocketServer) {
    ({ Server: SocketServer } = require('socket.io'));
  }

  io = new SocketServer(server, {
    cors: {
      origin: config.clientOrigins,
      credentials: true,
    },
  });

  io.use(authenticateSocket);
  io.on('connection', registerConnectionHandlers);

  return io;
};

const emitCombatUpdate = (campaignId, combatState) => {
  if (!io) {
    logger.warn('Socket.io server not initialized; cannot emit combat update');
    return;
  }

  if (typeof campaignId !== 'string' || campaignId.trim() === '') {
    logger.warn('Invalid campaign id provided for combat update', { campaignId });
    return;
  }

  const normalizedId = campaignId.trim();
  io.to(getCampaignRoom(normalizedId)).emit('combat:update', combatState);
};

const emitCharacterHealthUpdate = ({ campaignId, characterId, tempHealth, health }) => {
  if (!io) {
    logger.warn('Socket.io server not initialized; cannot emit character health update');
    return;
  }

  const normalizedCampaignId =
    typeof campaignId === 'string' && campaignId.trim() !== '' ? campaignId.trim() : null;
  if (!normalizedCampaignId) {
    logger.warn('Invalid campaign id provided for character health update', { campaignId });
    return;
  }

  const normalizedCharacterId =
    typeof characterId === 'string' && characterId.trim() !== '' ? characterId.trim() : null;
  if (!normalizedCharacterId) {
    logger.warn('Invalid character id provided for character health update', { characterId });
    return;
  }

  const payload = { characterId: normalizedCharacterId };
  if (tempHealth !== undefined) {
    payload.tempHealth = tempHealth;
  }
  if (health !== undefined) {
    payload.health = health;
  }

  io.to(getCampaignRoom(normalizedCampaignId)).emit('character:health:update', payload);
};

module.exports = {
  initializeSocket,
  emitCombatUpdate,
  emitCharacterHealthUpdate,
};


import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'node:path';
import fs from 'node:fs';

const logger = pino({ level: 'silent' });
const SESSION_ROOT = process.env.SESSION_DIR || '/data/sessions';
fs.mkdirSync(SESSION_ROOT, { recursive: true });

const sessions = new Map();

export async function createPairing(phone) {
  const authDir = path.join(SESSION_ROOT, phone);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['WaPairing', 'Chrome', '1.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  const entry = { sock, code: null, createdAt: Date.now(), registered: false };
  sessions.set(phone, entry);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      entry.registered = true;
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      if (loggedOut) {
        sessions.delete(phone);
      }
    }
  });

  const rawCode = await sock.requestPairingCode(phone);
  const pretty = rawCode?.match(/.{1,4}/g)?.join('-') ?? rawCode;
  entry.code = pretty;

  return { code: pretty, phone };
}

export function getSession(phone) {
  return sessions.get(phone) ?? null;
}

export function dropSession(phone) {
  const s = sessions.get(phone);
  if (s) {
    try { s.sock.end(undefined); } catch {}
    sessions.delete(phone);
  }
}

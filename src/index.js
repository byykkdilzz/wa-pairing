import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPairing, getSession, dropSession } from './wa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/pair', async (req, res) => {
  const { phone } = req.body ?? {};
  if (!phone || !/^\d{8,15}$/.test(phone)) {
    return res.status(400).json({ ok: false, error: 'phone wajib digit E.164 tanpa +' });
  }

  const existing = getSession(phone);
  if (existing && existing.code && Date.now() - existing.createdAt < 90_000) {
    return res.json({ ok: true, code: existing.code, reused: true });
  }
  if (existing) dropSession(phone);

  try {
    const { code } = await createPairing(phone);
    res.json({ ok: true, code });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log('listening on', PORT));

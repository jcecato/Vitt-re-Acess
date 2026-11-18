import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const TTS_MODEL = 'gemini-3.8-flash-lite-tts';
const TTS_VOICE = 'Zephyr';
const TTS_STYLE =
  'Conversa empática, acolhedora e humana de profissional de saúde brasileiro explicando com naturalidade no consultório, voz calorosa e fluida, ritmo ágil e pausas orgânicas de respiração, sem tom robótico ou leitura mecânica.';
const MAX_TTS_CHARS = 3500;
const MAX_CACHE_ENTRIES = 120;

interface CachedAudio {
  audioBase64: string;
  mimeType: string;
}

const ttsMemoryCache = new Map<string, CachedAudio>();

function getCachedAudio(key: string): CachedAudio | undefined {
  const hit = ttsMemoryCache.get(key);
  if (!hit) return undefined;
  // Refresh insertion order for simple LRU behavior
  ttsMemoryCache.delete(key);
  ttsMemoryCache.set(key, hit);
  return hit;
}

function setCachedAudio(key: string, value: CachedAudio): void {
  if (ttsMemoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ttsMemoryCache.keys().next().value;
    if (oldestKey) ttsMemoryCache.delete(oldestKey);
  }
  ttsMemoryCache.set(key, value);
}

function buildCacheKey(text: string): string {
  return createHash('sha256')
    .update(`${TTS_MODEL}:${TTS_VOICE}:${TTS_STYLE}:${text}`)
    .digest('hex');
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const rawText = typeof req.body?.text === 'string' ? req.body.text : '';
      const cleanText = rawText.replace(/\s+/g, ' ').trim();

      if (!cleanText) {
        res.status(400).json({ error: 'INVALID_TEXT' });
        return;
      }

      if (cleanText.length > MAX_TTS_CHARS) {
        res.status(400).json({ error: 'TEXT_TOO_LONG' });
        return;
      }

      const cacheKey = buildCacheKey(cleanText);
      const cached = getCachedAudio(cacheKey);
      if (cached) {
        res.json({
          mimeType: cached.mimeType,
          audioBase64: cached.audioBase64,
          cached: true
        });
        return;
      }

      const apiKey = (process.env.GEMINI_API_KEY || '').trim();
      if (!apiKey) {
        res.status(503).json({
          error: 'TTS_UNAVAILABLE',
          fallback: 'browser'
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: 'v1beta',
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: TTS_STYLE
                }
              } as Record<string, unknown>
            ]
          }
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: TTS_VOICE
              }
            }
          }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      let audioBase64 = '';
      let mimeType = 'audio/wav';

      for (const part of parts) {
        if (part.inlineData?.data) {
          audioBase64 = part.inlineData.data;
          if (part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          break;
        }
      }

      if (!audioBase64) {
        res.status(502).json({
          error: 'EMPTY_AUDIO_RESPONSE',
          fallback: 'browser'
        });
        return;
      }

      setCachedAudio(cacheKey, { audioBase64, mimeType });
      res.json({
        mimeType,
        audioBase64,
        cached: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown TTS error';
      const status =
        typeof (error as { status?: unknown })?.status === 'number'
          ? (error as { status: number }).status
          : 503;
      console.warn('[TTS] Falling back to browser speech:', status, message);
      res.status(status >= 400 && status < 600 ? status : 503).json({
        error: 'TTS_GENERATION_FAILED',
        detail: message.slice(0, 220),
        fallback: 'browser'
      });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir, { maxAge: '1y', immutable: true }));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

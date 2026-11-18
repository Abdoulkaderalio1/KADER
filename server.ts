import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function parseBase64DataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl.trim());
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  if (/^[A-Za-z0-9+/=]+$/.test(dataUrl.trim()) && dataUrl.length > 64) {
    return { mimeType: 'image/jpeg', data: dataUrl.trim() };
  }
  return null;
}

interface PresenceClient {
  ws: WebSocket;
  uid: string;
  displayName: string;
  city: string;
  latApprox?: number;
  lngApprox?: number;
  lastSeen: number;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'le-chemin-pour-le-nikah' });
  });

  app.post('/api/verify-face', async (req, res) => {
    try {
      const { selfieBase64, profilePhotoBase64, displayName } = req.body ?? {};
      if (!selfieBase64 || typeof selfieBase64 !== 'string') {
        return res.status(400).json({ error: 'Capture selfie requise pour la vérification faciale.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: 'Le service de vérification faciale IA nécessite une clé GEMINI_API_KEY configurée côté serveur.',
        });
      }

      const selfiePart = parseBase64DataUrl(selfieBase64);
      if (!selfiePart) {
        return res.status(400).json({ error: 'Format d’image selfie invalide.' });
      }

      const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [
        { inlineData: selfiePart },
      ];

      let promptText = `Tu es un système strict de vérification d'identité biométrique pour la plateforme matrimoniale "Le Chemin pour le Nikah".
Analyse la première image (selfie en direct de ${typeof displayName === 'string' && displayName ? displayName : 'l’utilisateur'}).
Vérifie :
1. S'il s'agit bien d'un visage humain réel, vivant, non masqué, net et pris en direct (pas une photo d'écran, pas un dessin, pas un avatar généré).
2. Évalue la qualité et la vivacité (livenessScore de 0 à 100).`;

      if (profilePhotoBase64 && typeof profilePhotoBase64 === 'string') {
        const profilePart = parseBase64DataUrl(profilePhotoBase64);
        if (profilePart) {
          parts.push({ inlineData: profilePart });
          promptText += `
3. Compare la première image (selfie) avec la deuxième image (photo de profil) et estime si c'est la même personne (faceMatchScore de 0 à 100).
Déclare verified=true uniquement si isRealHumanFace=true, livenessScore>=70 et faceMatchScore>=70.`;
        }
      } else {
        promptText += `
3. Comme aucune photo de profil distincte n'est fournie, attribue à faceMatchScore la note de clarté biométrique du visage (0 à 100) et déclare verified=true uniquement si isRealHumanFace=true et livenessScore>=70.`;
      }

      promptText += `
Réponds en JSON strict avec summaryFr et reasons en français clair, respectueux et concis.`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isRealHumanFace: { type: Type.BOOLEAN },
              livenessScore: { type: Type.NUMBER },
              faceMatchScore: { type: Type.NUMBER },
              verified: { type: Type.BOOLEAN },
              summaryFr: { type: Type.STRING },
              reasons: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['isRealHumanFace', 'livenessScore', 'faceMatchScore', 'verified', 'summaryFr', 'reasons'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json(parsed);
    } catch (err) {
      console.error('Face verification error:', err);
      const message = err instanceof Error ? err.message : 'Erreur lors de la vérification faciale.';
      return res.status(500).json({ error: message });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Map<WebSocket, PresenceClient>();

  function broadcastOnlineUsers() {
    const active = Array.from(clients.values()).map((c) => ({
      uid: c.uid,
      displayName: c.displayName,
      city: c.city,
      latApprox: c.latApprox,
      lngApprox: c.lngApprox,
      lastSeen: c.lastSeen,
    }));
    const payload = JSON.stringify({ type: 'presence:list', users: active });
    for (const client of clients.keys()) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'presence:join' && typeof msg.uid === 'string') {
          clients.set(ws, {
            ws,
            uid: msg.uid,
            displayName: typeof msg.displayName === 'string' ? msg.displayName : 'Membre',
            city: typeof msg.city === 'string' ? msg.city : 'Niamey',
            latApprox: typeof msg.latApprox === 'number' ? msg.latApprox : undefined,
            lngApprox: typeof msg.lngApprox === 'number' ? msg.lngApprox : undefined,
            lastSeen: Date.now(),
          });
          broadcastOnlineUsers();
        } else if (msg.type === 'geo:update' && clients.has(ws)) {
          const entry = clients.get(ws)!;
          entry.latApprox = typeof msg.latApprox === 'number' ? msg.latApprox : entry.latApprox;
          entry.lngApprox = typeof msg.lngApprox === 'number' ? msg.lngApprox : entry.lngApprox;
          entry.lastSeen = Date.now();
          broadcastOnlineUsers();
        } else if (msg.type === 'chat:typing' && typeof msg.recipientUid === 'string') {
          for (const client of clients.values()) {
            if (client.uid === msg.recipientUid && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(
                JSON.stringify({
                  type: 'chat:typing',
                  senderUid: msg.senderUid,
                  isTyping: Boolean(msg.isTyping),
                })
              );
            }
          }
        } else if (msg.type === 'chat:notify' && typeof msg.recipientUid === 'string') {
          for (const client of clients.values()) {
            if (client.uid === msg.recipientUid && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(
                JSON.stringify({
                  type: 'chat:notify',
                  senderUid: msg.senderUid,
                  senderName: msg.senderName,
                  convId: msg.convId,
                })
              );
            }
          }
        }
      } catch {
        // Ignore malformed socket frames
      }
    });

    ws.on('close', () => {
      if (clients.delete(ws)) {
        broadcastOnlineUsers();
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Le Chemin pour le Nikah server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

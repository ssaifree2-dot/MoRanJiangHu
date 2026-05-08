import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const 读取请求体 = async (req: NodeJS.ReadableStream): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const 执行NovelAI代理请求 = async (
  url: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer
): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> => {
  const upstreamHeaders = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    if (!value) return;
    if (/^(host|content-length|connection|accept-encoding)$/i.test(key)) return;
    upstreamHeaders.set(key, value);
  });

  const response = await fetch(url, {
    method: method.toUpperCase(),
    headers: upstreamHeaders,
    body: body.length ? body : undefined
  });
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    status: response.status,
    headers: responseHeaders,
    body: Buffer.from(await response.arrayBuffer())
  };
};

const handleNovelAiProxyRequest = async (
  req: any,
  res: any,
  next: () => void,
  logger: { error: (message: string) => void }
) => {
  if (!req.url) {
    next();
    return;
  }

  try {
    const body = await 读取请求体(req);
    const targetUrl = `https://image.novelai.net${req.url}`;
    const headers: Record<string, string> = {};

    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    }

    const result = await 执行NovelAI代理请求(targetUrl, req.method || 'POST', headers, body);
    res.statusCode = result.status;
    Object.entries(result.headers).forEach(([key, value]) => {
      if (key.toLowerCase() === 'content-length') return;
      res.setHeader(key, value);
    });
    res.end(result.body);
  } catch (error: any) {
    logger.error(`[novelai-dev-proxy] ${error?.message || error}`);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      error: 'NovelAI dev proxy failed',
      detail: error?.message || String(error)
    }));
  }
};

const novelAiDevProxyPlugin = (): Plugin => ({
  name: 'novelai-dev-proxy',
  configurePreviewServer(server) {
    server.middlewares.use('/api/novelai', async (req, res, next) => {
      await handleNovelAiProxyRequest(req, res, next, server.config.logger);
    });
  },
  configureServer(server) {
    server.middlewares.use('/api/novelai', async (req, res, next) => {
      await handleNovelAiProxyRequest(req, res, next, server.config.logger);
    });
  }
});

const stripSameOriginAssetCrossoriginPlugin = (): Plugin => ({
  name: 'strip-same-origin-asset-crossorigin',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      /(<(?:script|link)\b(?=[^>]*(?:src|href)="\/assets\/)[^>]*)\s+crossorigin(?=[\s>])/g,
      '$1'
    );
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const productionBase = env.VITE_BASE_PATH || '/';
  return {
    base: mode === 'production' ? productionBase : '/',
    server: {
      port: 3000,
      host: '0.0.0.0'
    },
    plugins: [react(), novelAiDevProxyPlugin(), stripSameOriginAssetCrossoriginPlugin()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');
 
            if (normalizedId.includes('/node_modules/')) {
              if (normalizedId.includes('/fflate/')) {
                return 'fflate-vendor';
              }
              if (normalizedId.includes('/@google/genai/')) {
                return 'ai-sdk-vendor';
              }
              return 'vendor';
            }
 
            if (normalizedId.includes('/prompts/core/')) {
              return 'prompts-core';
            }

            if (normalizedId.includes('/prompts/shared/')) {
              return 'prompts-shared';
            }

            if (normalizedId.endsWith('/utils/promptFeatureToggles.ts')) {
              return 'prompts-shared-utils';
            }
 
            if (normalizedId.includes('/prompts/runtime/')) {
              return 'prompts-runtime';
            }
 
            if (normalizedId.includes('/prompts/stats/')) {
              return 'prompts-stats';
            }
 
            if (normalizedId.includes('/prompts/')) {
              return 'prompts-misc';
            }
 
            if (normalizedId.includes('/components/features/Social/ImageManagerModal')) {
              return 'image-manager-desktop';
            }
 
            if (normalizedId.includes('/components/features/Social/mobile/MobileImageManagerModal')) {
              return 'image-manager-mobile';
            }
 
            if (normalizedId.includes('/components/features/Settings/mobile/MobileSettingsModal')) {
              return 'settings-mobile-entry';
            }
 
            if (normalizedId.includes('/components/features/Settings/SettingsModal')) {
              return 'settings-desktop-entry';
            }
 
            if (normalizedId.includes('/components/features/Settings/')) {
              return 'settings-panels';
            }
 
            if (
              normalizedId.includes('/services/ai/') ||
              normalizedId.includes('/hooks/useGame/') ||
              normalizedId.endsWith('/hooks/useGame.ts')
            ) {
              return 'game-runtime';
            }
          }
}
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

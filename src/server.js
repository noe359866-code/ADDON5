/**
 * src/server.js — Servidor HTTP del addon (sin dependencias).
 *
 * Rutas:
 *   GET /manifest.json                     manifest de Stremio
 *   GET /stream/{type}/{id}.json           streams de una película o episodio
 *   GET /proxy?u=…&r=…                     proxy de video y listas HLS
 *   GET /                                 página de instalación
 *   GET /health                           estado del servicio
 *   GET /selftest?id=…&type=…             diagnóstico paso a paso
 */

import { createServer } from 'node:http';
import { config } from './config.js';
import { getManifest, manifest } from './manifest.js';
import { collectStreams } from './addon.js';
import { handleProxy } from './proxy.js';
import { renderLanding } from './landing.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS'
};

export function publicBaseUrl(req) {
  if (config.publicBaseUrl) return config.publicBaseUrl;
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'http';
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host) return `http://localhost:${config.port}`;
  return `${proto}://${host}`;
}

function send(res, status, body, headers = {}) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  res.writeHead(status, {
    ...CORS_HEADERS,
    'Content-Length': buffer.length,
    ...headers
  });
  res.end(buffer);
}

function sendJson(res, status, payload, headers = {}) {
  send(res, status, JSON.stringify(payload), {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  });
}

function streamRoute(pathname) {
  const match = /^\/stream\/(movie|series)\/(.+)\.json$/i.exec(pathname);
  if (!match) return null;
  return { type: match[1].toLowerCase(), id: decodeURIComponent(match[2]) };
}

export async function handleRequest(req, res, { log = true } = {}) {
  const startedAt = Date.now();
  const url = new URL(req.url || '/', 'http://localhost');
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  try {
    if (pathname === '/manifest.json') {
      return sendJson(res, 200, getManifest(), { 'Cache-Control': 'public, max-age=3600' });
    }

    if (pathname === '/health' || pathname === '/') {
      if (pathname === '/health') {
        return sendJson(res, 200, {
          status: 'ok',
          addon: manifest.name,
          version: manifest.version,
          uptime: Math.round(process.uptime())
        }, { 'Cache-Control': 'no-store' });
      }
      const html = renderLanding(publicBaseUrl(req));
      return send(res, 200, html, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
    }

    if (pathname === '/selftest') {
      const id = url.searchParams.get('id') || 'tt0111161';
      const type = url.searchParams.get('type') || 'movie';
      const started = Date.now();
      const { streams, trace } = await collectStreams({
        type,
        id,
        baseUrl: publicBaseUrl(req),
        deadlineMs: Math.min(config.handlerDeadlineMs, 20000)
      });
      return sendJson(res, 200, {
        ok: streams.some((stream) => stream.url),
        elapsedMs: Date.now() - started,
        streams,
        trace
      }, { 'Cache-Control': 'no-store' });
    }

    if (pathname === '/proxy') {
      return await handleProxy(req, res, url, publicBaseUrl(req));
    }

    const route = streamRoute(pathname);
    if (route) {
      const streams = await collectStreamsSafe(route, req);
      if (log) {
        console.log(`[stream] ${route.type}/${route.id} → ${streams.length} en ${Date.now() - startedAt} ms`);
      }
      return sendJson(res, 200, { streams }, { 'Cache-Control': 'public, max-age=300' });
    }

    return sendJson(res, 404, { error: 'not_found', message: 'Ruta desconocida' });
  } catch (error) {
    console.error('[server] error no controlado:', error);
    if (pathname.startsWith('/stream/')) {
      return sendJson(res, 200, { streams: [] });
    }
    return sendJson(res, 500, { error: 'internal_error', message: (error && error.message) || 'error' });
  }
}

async function collectStreamsSafe(route, req) {
  try {
    const { streams } = await collectStreams({
      type: route.type,
      id: route.id,
      baseUrl: publicBaseUrl(req)
    });
    return Array.isArray(streams) ? streams : [];
  } catch (error) {
    console.error('[stream] fallo:', error);
    return [];
  }
}

export function createServerInstance(options = {}) {
  return createServer((req, res) => {
    handleRequest(req, res, options).catch((error) => {
      console.error('[server] error:', error);
      try {
        res.writeHead(500, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'internal_error' }));
      } catch {
        res.destroy();
      }
    });
  });
}

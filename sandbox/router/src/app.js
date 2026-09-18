import express from 'express';
import morgan from 'morgan';
import { createProxyMiddleware } from "http-proxy-middleware";
import http from 'http';
import { createProxyServer } from 'httpxy';

const app = express();
app.use(morgan('dev'));

// 1. Global CORS Middleware for all subdomains and API requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Health endpoints
app.get('/api/status/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/api/status/readyz', (req, res) => {
    res.status(200).json({ status: 'ready' });
});

const proxies = {};
const agentProxies = {};

function getProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}`;
    if (!proxies[sandboxId]) {
        proxies[sandboxId] = createProxyMiddleware({
            target,
            changeOrigin: true,
            ws: true,
            onProxyRes: (proxyRes, req, res) => {
                delete proxyRes.headers['x-frame-options'];
                delete proxyRes.headers['X-Frame-Options'];
                proxyRes.headers['content-security-policy'] = "frame-ancestors *";
                proxyRes.headers['access-control-allow-origin'] = "*";
            },
            onError: (err, req, res) => {
                console.error(`Preview proxy error for sandbox ${sandboxId}:`, err.message);
                if (res && res.writeHead && !res.headersSent) {
                    res.writeHead(503, { 'Content-Type': 'text/html' });
                    res.end('<html><body style="font-family:sans-serif;background:#0e0f12;color:#eaecef;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>🚀 Compiling Workspace Environment...</h2><p style="color:#8a8f9d;font-size:13px;">Vite dev server is booting up. Will refresh automatically...</p><script>setTimeout(()=>location.reload(), 2000);</script></div></body></html>');
                }
            }
        });
    }
    return proxies[sandboxId];
}

function getAgentProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}:3000`;
    if (!agentProxies[sandboxId]) {
        agentProxies[sandboxId] = createProxyMiddleware({
            target,
            changeOrigin: true,
            ws: true,
            onProxyRes: (proxyRes, req, res) => {
                proxyRes.headers['access-control-allow-origin'] = '*';
                proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
                proxyRes.headers['access-control-allow-headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
            },
            onError: (err, req, res) => {
                console.error(`Agent proxy error for sandbox ${sandboxId}:`, err.message);
                if (res && res.writeHead && !res.headersSent) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Agent is bootstrapping, please retry in a moment.', status: 'starting' }));
                }
            }
        });
    }
    return agentProxies[sandboxId];
}

// Single httpxy proxy server for all WebSocket upgrades
const wsProxy = createProxyServer({ changeOrigin: true });
wsProxy.on('error', (err, req, socket) => {
    console.error('WS proxy error:', err.message);
    socket?.destroy();
});

app.use(async (req, res, next) => {
    // 1. Check if path starts with /api/agent/:sandboxId
    if (req.url && req.url.startsWith('/api/agent/')) {
        const match = req.url.match(/^\/api\/agent\/([^\/\?]+)(.*)/);
        if (match) {
            const sandboxId = match[1];
            req.url = match[2] || '/';
            return getAgentProxy(sandboxId)(req, res, next);
        }
    }

    const host = req.headers.host || '';
    const parts = host.split('.');
    const sandboxId = parts[0];
    const type = parts[1];

    if (type === 'agent') {
        return getAgentProxy(sandboxId)(req, res, next);
    } else if (type === 'preview') {
        return getProxy(sandboxId)(req, res, next);
    }
    
    // Pass-through for any other requests
    next();
});

// Create the HTTP server explicitly
const server = http.createServer(app);

server.on('upgrade', (req, socket, head) => {
    // 1. Check path-based WebSocket: /api/agent/:sandboxId/socket.io/...
    if (req.url && req.url.startsWith('/api/agent/')) {
        const match = req.url.match(/^\/api\/agent\/([^\/\?]+)(.*)/);
        if (match) {
            const sandboxId = match[1];
            req.url = match[2] || '/';
            const agentProxy = getAgentProxy(sandboxId);
            if (agentProxy && typeof agentProxy.upgrade === 'function') {
                return agentProxy.upgrade(req, socket, head);
            }
        }
    }

    const host = req.headers.host || '';
    if (!host) { socket.destroy(); return; }

    const parts = host.split('.');
    const sandboxId = parts[0];
    const type = parts[1];

    if (type === 'agent') {
        const agentProxy = getAgentProxy(sandboxId);
        if (agentProxy && typeof agentProxy.upgrade === 'function') {
            return agentProxy.upgrade(req, socket, head);
        }
    } else if (type === 'preview') {
        const previewProxy = getProxy(sandboxId);
        if (previewProxy && typeof previewProxy.upgrade === 'function') {
            return previewProxy.upgrade(req, socket, head);
        }
    } else {
        socket.destroy();
    }
});

export default server;
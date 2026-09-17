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
            onError: (err, req, res) => {
                console.error(`Preview proxy error for sandbox ${sandboxId}:`, err.message);
                if (res && res.writeHead && !res.headersSent) {
                    res.writeHead(503, { 'Content-Type': 'text/html' });
                    res.end('<html><body style="font-family:sans-serif;background:#18181c;color:#e4e4e7;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>🚀 Sandbox container is starting...</h2><p style="color:#a1a1aa;">Compiling your Vite/React environment. This will automatically load in a few seconds.</p><script>setTimeout(()=>location.reload(), 2500);</script></div></body></html>');
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
    const host = req.headers.host || '';
    if (!host) { socket.destroy(); return; }

    socket.on('error', (err) => console.log('Socket error:', err.message));

    const parts = host.split('.');
    const sandboxId = parts[0];
    const type = parts[1];

    if (type === 'agent') {
        wsProxy.ws(req, socket, { target: `http://sandbox-service-${sandboxId}:3000` }, head)
            .catch((err) => {
                console.error('WS upgrade proxy error for agent:', err.message);
                socket.destroy();
            });
    } else if (type === 'preview') {
        wsProxy.ws(req, socket, { target: `http://sandbox-service-${sandboxId}:80` }, head)
            .catch((err) => {
                console.error('WS upgrade proxy error for preview:', err.message);
                socket.destroy();
            });
    } else {
        socket.destroy();
    }
});

export default server;
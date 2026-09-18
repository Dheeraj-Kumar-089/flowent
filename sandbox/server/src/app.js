import express from "express";
import morgan from "morgan";
import { createPod, deletePod } from "./kubernetes/pod.js";
import { createService, deleteService } from "./kubernetes/service.js";
import { createSandboxKey, refreshSandboxKey } from "./config/redis.js";
import { v7 as uuid } from "uuid";

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.get('/api/sandbox/health', (req, res) => {
    res.status(200).json({
        message: "The Sandbox Server is running perfectly",
        status: "ok"
    });
});

app.post("/api/sandbox/start", async (req, res) => {
    const sandboxId = uuid();
    try {
        console.log(`[Sandbox Server] Starting creation for sandboxId: ${sandboxId}`);

        // Pod and Service must both exist; the TTL key is best-effort so a
        // Redis outage cannot block sandbox creation.
        await Promise.all([
            createPod(sandboxId),
            createService(sandboxId)
        ]);
        await createSandboxKey(sandboxId);

        console.log(`[Sandbox Server] Created Pod and Service for sandboxId: ${sandboxId}`);

        const protocol = req.headers[ 'x-forwarded-proto' ] || (req.secure ? 'https' : 'http');
        const incomingHost = req.headers.host || 'localhost';
        const domainOnly = incomingHost.split(':')[ 0 ];
        const baseDomain = domainOnly.includes('localhost') ? 'localhost' : domainOnly;

        return res.status(201).json({
            message: "Sandbox environment created successfully",
            sandboxId,
            previewUrl: `${protocol}://${sandboxId}.preview.${baseDomain}`
        });
    } catch (err) {
        console.error("[Sandbox Server] Error spinning up sandbox in cluster:", err);

        // Roll back partial creation so orphaned pods/services do not pile up
        // and exhaust the node.
        await deletePod(sandboxId).catch(() => {});
        await deleteService(sandboxId).catch(() => {});

        const errorDetails = err.response?.body || err.body || err.message;
        return res.status(500).json({
            message: "Could not spin up sandbox in the cluster",
            error: err.message,
            details: errorDetails
        });
    }
});

// Keeps a sandbox alive while the user is actively working in it.
app.post("/api/sandbox/keepalive/:sandboxId", async (req, res) => {
    await refreshSandboxKey(req.params.sandboxId);
    return res.status(200).json({ status: "ok" });
});

// Explicit teardown so abandoned sandboxes are not left to the TTL alone.
app.delete("/api/sandbox/:sandboxId", async (req, res) => {
    const { sandboxId } = req.params;
    await deletePod(sandboxId);
    await deleteService(sandboxId);
    return res.status(200).json({ message: "Sandbox destroyed", sandboxId });
});

// ─── S3 Snapshot Proxy ─────────────────────────────────────────────
// Forwards the snapshot request to the agent sidecar running inside
// the sandbox pod. The agent zips /workspace and uploads to S3.
app.post("/api/sandbox/:sandboxId/snapshot", async (req, res) => {
    const { sandboxId } = req.params;
    const agentUrl = `http://sandbox-service-${sandboxId}:3000/snapshot`;

    try {
        const agentRes = await fetch(agentUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        const data = await agentRes.json();
        return res.status(agentRes.status).json(data);
    } catch (err) {
        console.error(`[Snapshot Proxy] Error reaching agent for ${sandboxId}:`, err.message);
        return res.status(502).json({
            success: false,
            error: `Could not reach sandbox agent: ${err.message}`,
        });
    }
});

export default app;

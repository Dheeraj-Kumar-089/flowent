import express from "express";
import morgan from "morgan";
import { createPod } from "./kubernetes/pod.js";
import { createService } from "./kubernetes/service.js";
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
    try {
        const sandboxId = uuid();

        console.log(`[Sandbox Server] Starting creation for sandboxId: ${sandboxId}`);

        await Promise.all([
            createPod(sandboxId),
            createService(sandboxId)
        ]);

        console.log(`[Sandbox Server] Successfully created Pod and Service for sandboxId: ${sandboxId}`);

        const incomingHost = req.headers.host || 'localhost';
        const domainOnly = incomingHost.split(':')[0];
        const baseDomain = domainOnly.includes('localhost') ? 'localhost' : domainOnly;

        return res.status(201).json({
            message: "Sandbox environment created successfully",
            sandboxId,
            previewUrl: `http://${sandboxId}.preview.${baseDomain}`
        });
    } catch (err) {
        console.error("[Sandbox Server] Error spinning up sandbox in cluster:", err);
        const errorDetails = err.response?.body || err.body || err.message;
        return res.status(500).json({
            message: "Could not spin up sandbox in the cluster",
            error: err.message,
            details: errorDetails
        });
    }
});

export default app;
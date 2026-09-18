import { k8sCoreV1Api } from "./config.js";

export async function createPod(sandboxId) {
    const podManifest = {
        metadata: {
            name: 'sandbox-pod-' + sandboxId,
            labels: {
                sandboxId: sandboxId,
                app: 'sandbox-instance'
            }
        },
        spec: {
            restartPolicy: 'Always',
            volumes: [
                {
                    name: 'workspace-volume',
                    emptyDir: {}
                }
            ],
            initContainers: [
                {
                    name: 'init-container',
                    image: "docker.io/library/template:latest",
                    imagePullPolicy: "IfNotPresent",
                    command: [ 'sh', '-c', 'cp -a /workspace/. /seed/' ],
                    resources: {
                        limits: { cpu: "500m", memory: "256Mi" },
                        requests: { cpu: "50m", memory: "64Mi" }
                    },
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/seed'
                        }
                    ]
                }
            ],
            containers: [
                {
                    image: 'docker.io/library/template:latest',
                    imagePullPolicy: 'IfNotPresent',
                    name: 'sandbox-container',
                    ports: [
                        {
                            containerPort: 5173,
                            // Port names must be unique across ALL containers in a pod.
                            // Naming both containers' ports "http" made the API server
                            // reject every sandbox pod with a Duplicate value error.
                            name: "preview"
                        }
                    ],
                    resources: {
                        limits: {
                            cpu: "500m",
                            memory: "640Mi"
                        },
                        requests: {
                            cpu: "50m",
                            memory: "192Mi"
                        }
                    },
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ],
                },
                {
                    image: "docker.io/library/agent:latest",
                    imagePullPolicy: "IfNotPresent",
                    name: "agent-container",
                    ports: [
                        {
                            containerPort: 3000,
                            name: "agent",
                        }
                    ],
                    resources: {
                        limits: {
                            cpu: "300m",
                            memory: "384Mi"
                        },
                        requests: {
                            cpu: "50m",
                            memory: "96Mi"
                        }
                    },
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ],
                }
            ]
        }
    };

    try {
        return await k8sCoreV1Api.createNamespacedPod({
            namespace: 'default',
            body: podManifest
        });
    } catch (err) {
        // Surface real API-server rejections instead of masking them behind a
        // second failing call against the legacy positional signature.
        const apiMessage = err?.body?.message || err?.response?.body?.message;
        if (apiMessage) {
            console.error('[k8s] createPod rejected by API server:', apiMessage);
            throw err;
        }
        return await k8sCoreV1Api.createNamespacedPod('default', podManifest);
    }
}

// Previously missing: config/redis.js imported deletePod from this module,
// which made the TTL-expiry cleanup path throw on import.
export async function deletePod(sandboxId) {
    const name = `sandbox-pod-${sandboxId}`;
    try {
        return await k8sCoreV1Api.deleteNamespacedPod({ namespace: 'default', name });
    } catch (err) {
        const apiMessage = err?.body?.message || err?.response?.body?.message;
        if (apiMessage) {
            console.error('[k8s] deletePod failed:', apiMessage);
            return null;
        }
        try {
            return await k8sCoreV1Api.deleteNamespacedPod(name, 'default');
        } catch (e) {
            console.error('[k8s] deletePod failed:', e.message);
            return null;
        }
    }
}

import { k8sCoreV1Api } from "./config.js";

export async function createPod(sandboxId) {
    const podManifest = {
        metadata: {
            name: 'sandbox-pod-' + sandboxId,
            labels: {
                sandboxId: sandboxId,
                app: 'sandbox'
            }
        },
        spec: {
            volumes: [
                {
                    name: 'workspace-volume',
                    emptyDir: {}
                }
            ],
            initContainers: [
                {
                    name: 'init-container',
                    image: "template:latest",
                    imagePullPolicy: "IfNotPresent",
                    command: ['sh', '-c', 'cp -r /workspace/. /seed/'],
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
                    image: 'template:latest',
                    imagePullPolicy: 'IfNotPresent',
                    name: 'sandbox-container',
                    ports: [
                        {
                            containerPort: 5173,
                            name: "http"
                        }
                    ],
                    resources: {
                        limits: {
                            cpu: "300m",
                            memory: "512Mi"
                        },
                        requests: {
                            cpu: "50m",
                            memory: "128Mi"
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
                    image: "agent:latest",
                    imagePullPolicy: "IfNotPresent",
                    name: "agent-container",
                    ports: [
                        {
                            containerPort: 3000,
                            name: "http",
                        }
                    ],
                    resources: {
                        limits: {
                            cpu: "300m",
                            memory: "512Mi"
                        },
                        requests: {
                            cpu: "50m",
                            memory: "128Mi"
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
        // Fallback for older positional parameter client versions
        return await k8sCoreV1Api.createNamespacedPod('default', podManifest);
    }
}
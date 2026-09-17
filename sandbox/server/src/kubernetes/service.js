import { k8sCoreV1Api } from './config.js';

export const createService = async (sandboxId) => {
    const serviceManifest = {
        metadata: {
            name: 'sandbox-service-' + sandboxId,
            labels: {
                app: 'sandbox',
                sandboxId: sandboxId
            }
        },
        spec: {
            selector: {
                sandboxId: sandboxId
            },
            ports: [
                {
                    name: "http",
                    port: 80,
                    targetPort: 5173,
                    protocol: 'TCP'
                },
                {
                    name: "agent-http",
                    port: 3000,
                    targetPort: 3000,
                    protocol: "TCP"
                }
            ],
            type: "ClusterIP"
        }
    };

    try {
        return await k8sCoreV1Api.createNamespacedService({
            namespace: 'default',
            body: serviceManifest
        });
    } catch (err) {
        return await k8sCoreV1Api.createNamespacedService('default', serviceManifest);
    }
};

export async function deleteService(sandboxId) {
    try {
        return await k8sCoreV1Api.deleteNamespacedService({
            namespace: 'default',
            name: `sandbox-service-${sandboxId}`
        });
    } catch (err) {
        return await k8sCoreV1Api.deleteNamespacedService(`sandbox-service-${sandboxId}`, 'default');
    }
}
import * as k8sApi from '@kubernetes/client-node'; // package for creating pod

const kc = new k8sApi.KubeConfig();
kc.loadFromDefault();

export const k8sCoreV1Api = kc.makeApiClient(k8sApi.CoreV1Api);
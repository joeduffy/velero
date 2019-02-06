// Copyright 2018 the Heptio Ark contributors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as k8s from "@pulumi/kubernetes";
import * as k8stypes from "@pulumi/kubernetes/types/input";
import { labels, namespace, serviceAccountName } from "../common-prereqs";

// The Velero conatiner image name, used below.
// TODO: rename various "Ark" references throughout, as soon as the renamed images are available.
const veleroContainerImage = "gcr.io/heptio-images/ark:latest";

// VeleroCloudSettings defines the cloud-specific aspects of a Velero deployment. Most of
// the configuration between clouds can be shared, however certain aspects -- like selectors,
// volumes, and particularly credentials -- differ. This interface abstracts those away.
export interface VeleroCloudSettings {
    env?: k8stypes.core.v1.EnvVar[];
    envFrom?: k8stypes.core.v1.EnvFromSource[];
    nodeSelector?: {[key: string]: string};
    volumes?: k8stypes.core.v1.Volume[];
    volumeMounts?: k8stypes.core.v1.VolumeMount[];
}

// deployVeleroObjects instantiates the associated Kubernetes objects, specific to the cloud
// settings provided, into the target cluster.
export function deployVeleroObjects(settings: VeleroCloudSettings) {
    // Deploy the Velero container image into the cluster with the appropriate volumes wired up.
    const veleroDeployment = new k8s.apps.v1beta1.Deployment("velero", {
        metadata: { namespace },
        spec: {
            replicas: 1,
            template: {
                metadata: {
                    labels,
                    annotations: {
                        "prometheus.io/scrape": "true",
                        "prometheus.io/port": "8085",
                        "prometheus.io/path": "/metrics",
                    },
                },
                spec: {
                    restartPolicy: "Always",
                    serviceAccountName,
                    volumes: (settings.volumes ? settings.volumes : []).concat([
                        { name: "plugins", emptyDir: {} },
                        { name: "scratch", emptyDir: {} },
                    ]),
                    containers: [{
                        name: "velero",
                        image: veleroContainerImage,
                        ports: [{ name: "metrics", containerPort: 8085 }],
                        command: [ "/ark" ],
                        args: [
                            "server",
                            // uncomment following line and specify values if needed for multiple provider snapshot locations
                            // "--default-volume-snapshot-locations=<provider-1:location-1,provider-2:location-2,...>",
                        ],
                        volumeMounts: (settings.volumeMounts ? settings.volumeMounts : []).concat([
                            { name: "plugins", mountPath: "/plugins" },
                            { name: "scratch", mountPath: "/scratch" },
                        ]),
                        env: (settings.env ? settings.env : []).concat([
                            { name: "ARK_SCRATCH_DIR", value: "/scratch" },
                        ]),
                        envFrom: settings.envFrom,
                    }],
                    nodeSelector: settings.nodeSelector,
                },
            },
        },
    });

    // Finally deploy the restic DaemonSet.
    const resticDaemonSet = new k8s.apps.v1.DaemonSet("restic", {
        metadata: { namespace },
        spec: {
            selector: {
                matchLabels: { name: "restic" },
            },
            template: {
                metadata: {
                    labels: { name: "restic" },
                },
                spec: {
                    serviceAccountName,
                    securityContext: { runAsUser: 0 },
                    volumes: (settings.volumes ? settings.volumes : []).concat([
                        {
                            name: "host-pods",
                            hostPath: { path: "/var/lib/kubelet/pods" },
                        },
                        { name: "scratch", emptyDir: {} },
                    ]),
                    containers: [{
                        name: "velero",
                        image: veleroContainerImage,
                        command: [ "/ark" ],
                        args: [ "restic", "server" ],
                        volumeMounts: (settings.volumeMounts ? settings.volumeMounts : []).concat([
                            {
                                name: "host-pods",
                                mountPath: "/host_pods",
                                mountPropagation: "HostToContainer",
                            },
                            { name: "scratch", mountPath: "/scratch" },
                        ]),
                        env: (settings.env ? settings.env : []).concat([
                            {
                                name: "NODE_NAME",
                                valueFrom: { fieldRef: { fieldPath: "spec.nodeName" } },
                            },
                            {
                                name: "ARK_NAMESPACE",
                                valueFrom: { fieldRef: { fieldPath: "metadata.namespace" } },
                            },
                            {
                                name: "ARK_SCRATCH_DIR",
                                value: "/scratch",
                            },
                        ]),
                        envFrom: settings.envFrom,
                    }],
                },
            },
        },
    });
}
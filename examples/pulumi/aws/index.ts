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

import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
import { labels, namespace, serviceAccountName } from "../common-prereqs";

const provider = "aws";
const config = { region: aws.config.requireRegion() };

// Set up a backup bucket in AWS and the associated BackupStorageLocation CRD.
const bucket = new aws.s3.Bucket("velerobackups");
const backupStorageLocation = new k8s.apiextensions.CustomResource("default", {
    apiVersion: "velero.io/v1",
    kind: "BackupStorageLocation",
    metadata: { namespace },
    spec: {
        provider,
        objectStorage: {
            bucket: bucket.bucket,
        },
        config,
    },
});

// Provision a VolumeSnapshotLocation CRD.
const volumeSnapshotLocation = new k8s.apiextensions.CustomResource("aws-default", {
    apiVersion: "velero.io/v1",
    kind: "VolumeSnapshotLocation",
    metadata: { namespace },
    spec: {
        provider,
        config,
    },
});

// Install Kube2IAM.
const kube2IAMDeployment = new k8s.apps.v1beta1.Deployment("velero", {
    metadata: { namespace },
    spec: {
        replicas: 1,
        template: {
            metadata: {
                labels,
                annotations: {
                    "iam.amazonaws.com/role": "arn:aws:iam::<AWS_ACCOUNT_ID>:role/<VELERO_ROLE_NAME>", // TODO
                    "prometheus.io/scrape": "true",
                    "prometheus.io/port": "8085",
                    "prometheus.io/path": "/metrics",
                },
            },
            spec: {
                restartPolicy: "Always",
                serviceAccountName,
                containers: [{
                    name: "velero",
                    image: "gcr.io/heptio-images/velero:latest",
                    ports: [{ name: "metrics", containerPort: 8085 }],
                    command: [ "/velero" ],
                    args: [ "server" ],
                    volumeMounts: [{ name: "plugins", mountPath: "/plugins" }],
                }],
                volumes: [{ name: "plugins", emptyDir: {} }],
            },
        },
    }
});

// Finally, export an object that customizes the various tags and mounts for GCP.
module.exports = {
    env: [
        { name: "AWS_SHARED_CREDENTIALS_FILE", value: "/credentials/cloud" },
        // { name: "AWS_CLUSTER_NAME", value: "<YOUR_CLUSTER_NAME>" },
    ],
    volumes: [{ name: "cloud-credentials", secret: { secretName: "cloud-credentials" } }],
    volumeMounts: [{ name: "cloud-credentials", mountPath: "/credentials" }],
};
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

import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import { labels, namespace, serviceAccountName } from "../common-prereqs";

const provider = "gcp";

// Set up a backup bucket in GCP and the associated BackupStorageLocation CRD.
const bucket = new gcp.storage.Bucket("velerobackups");
const backupStorageLocation = new k8s.apiextensions.CustomResource("default", {
    apiVersion: "velero.io/v1",
    kind: "BackupStorageLocation",
    metadata: { namespace },
    spec: {
        provider,
        objectStorage: {
            bucket: bucket.name,
        },
    },
});

// Provision a VolumeSnapshotLocation CRD.
const volumeSnapshotLocation = new k8s.apiextensions.CustomResource("gcp-default", {
    apiVersion: "velero.io/v1",
    kind: "VolumeSnapshotLocation",
    metadata: { namespace },
    spec: {
        provider,
    },
});

// Finally, export an object that customizes the various tags and mounts for GCP.
module.exports = {
    env: [{ name: "GOOGLE_APPLICATION_CREDENTIALS", value: "/credentials/cloud" }],
    volumes: [{ name: "cloud-credentials", secret: { secretName: "cloud-credentials" } }],
    volumeMounts: [{ name: "cloud-credentials", mountPath: "/credentials" }],
};
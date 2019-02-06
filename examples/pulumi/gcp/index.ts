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

// This module provisions the necessary GCP resources for running Velero
// on Google Cloud. This is essentially a distillation of the manual steps
// listed at https://heptio.github.io/velero/v0.10.0/gcp-config.
const provider = "gcp";

// Set up a backup bucket in GCP and the associated BackupStorageLocation CRD.
const bucket = new gcp.storage.Bucket("velerobackups");
const backupStorageLocation = new k8s.apiextensions.CustomResource("default", {
    apiVersion: "ark.heptio.com/v1",
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
    apiVersion: "ark.heptio.com/v1",
    kind: "VolumeSnapshotLocation",
    metadata: { namespace },
    spec: {
        provider,
    },
});

// Now create a GCP service account, grant it access to the snapshots bucket defined earlier.
const gcpServiceAccount = new gcp.serviceAccount.Account("velero", {
    accountId: "velero",
    displayName: "VMWare Velero service account",
});
const gcpServerProjectRole = new gcp.projects.IAMCustomRole("velero.server", {
    roleId: "velero.server",
    title: "VMWare Velero Server",
    permissions: [
        "compute.disks.get",
        "compute.disks.create",
        "compute.disks.createSnapshot",
        "compute.snapshots.get",
        "compute.snapshots.create",
        "compute.snapshots.useReadOnly",
        "compute.snapshots.delete",
    ],
});
const bucketIamBinding = new gcp.storage.BucketIAMBinding("velero.server-binding", {
    bucket: bucket.id,
    role: gcpServerProjectRole.id,
    members: [ gcpServiceAccount.email.apply(e => `serviceAccount:${e}`) ],
});

// Create credentials for the service account and store it in a Kubernetes Secret, thereby
// allowing the Velero Server to retrieve it and access the backups bucket at runtime.
const gcpServiceAccountCreds = new gcp.serviceAccount.Key("velero-server-key", {
    serviceAccountId: gcpServiceAccount.id,
}, { dependsOn: bucketIamBinding });
const gcpCredentialsSecret = new k8s.core.v1.Secret("cloud-credentials", {
    metadata: { namespace },
    stringData: { "cloud": gcpServiceAccountCreds.privateKey },
});

// Finally, export an object that customizes the various tags and mounts for GCP.
module.exports = {
    env: [{ name: "GOOGLE_APPLICATION_CREDENTIALS", value: "/credentials/cloud" }],
    volumes: [{
        name: "cloud-credentials",
        secret: { secretName: gcpCredentialsSecret.metadata.apply(m => m.name) },
    }],
    volumeMounts: [{ name: "cloud-credentials", mountPath: "/credentials" }],
};
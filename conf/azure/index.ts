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

import * as azure from "@pulumi/azure";
import * as k8s from "@pulumi/kubernetes";
import { labels, namespace, serviceAccountName } from "../common-prereqs";

// This module provisions the necessary Azure resources for running Velero
// on Microsoft Azure. This is essentially a distillation of the manual steps
// listed at https://heptio.github.io/velero/v0.10.0/azure-config.
const provider = "azure";

// Set up a backup bucket in Azure and the associated BackupStorageLocation CRD.
const location = "West US 2"; // TODO: make this configurable.
const resourceGroup = new azure.core.ResourceGroup("velero", { location }); // TODO: make this configurable.
const storageAccount = new azure.storage.Account("velero", {
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    accountTier: "Standard",
    accountReplicationType: "LRS",
});
const container = new azure.storage.Container("veleroBackups", {
    resourceGroupName: resourceGroup.name,
    storageAccountName: storageAccount.name,
})
const backupStorageLocation = new k8s.apiextensions.CustomResource("default", {
    apiVersion: "ark.heptio.com/v1",
    kind: "BackupStorageLocation",
    metadata: { namespace },
    spec: {
        provider,
        objectStorage: {
            bucket: container.name,
        },
        config: {
            resourceGroup: resourceGroup.name,
            storageAccount: storageAccount.name,
        }
    },
});

// Provision a VolumeSnapshotLocation CRD.
const volumeSnapshotLocation = new k8s.apiextensions.CustomResource("azure-default", {
    apiVersion: "ark.heptio.com/v1",
    kind: "VolumeSnapshotLocation",
    metadata: { namespace },
    spec: {
        provider,
        // TODO: make timeout configurable.
    },
});

// Finally, export an object that customizes the various tags and mounts for GCP.
module.exports = {
    envFrom: [{ secretRef: { name: "cloud-credentials" } }],
    nodeSelector: { "beta.kubernetes.io/os": "linux" },
};
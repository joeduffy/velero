// Copyright 2017 the Heptio Ark contributors.
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

// labels is a common label shared amongst many resources below.
export const labels = { component: "velero" };

// Provision all the different kinds of CRDs that Velero supports.
const crds = [
    { name: "backups", kind: "Backup" },
    { name: "schedules", kind: "Schedule" },
    { name: "restores", kind: "Restore" },
    { name: "downloadrequests", kind: "DownloadRequest" },
    { name: "deletebackuprequests", kind: "DeleteBackupRequest" },
    { name: "podvolumebackups", kind: "PodVolumeBackup" },
    { name: "podvolumerestores", kind: "PodVolumeRestores" },
    { name: "resticrepositories", kind: "ResticRepository" },
    { name: "backupstoragelocations", kind: "BackupStorageLocation" },
    { name: "volumesnapshotlocations", kind: "VolumeSnapshotLocation" },
    { name: "serverstatusrequests", kind: "ServerStatusRequest" },
];
for (const crd of crds) {
    new k8s.apiextensions.v1beta1.CustomResourceDefinition(`${crd.name}.velero.io`, {
        metadata: { labels },
        spec: {
            group: "velero.io",
            version: "v1",
            scope: "Namespaced",
            names: {
                plural: crd.name,
                kind: crd.kind,
            },
        },
    });
}

// Create a namespace that all subsequent objects will be provisioned within.
export const namespace =
    new k8s.core.v1.Namespace("velero").metadata.apply(m => m.name);

// Create the `velero` ServiceAccount and RBAC rules to bind it to our cluster.
const serviceAccount = new k8s.core.v1.ServiceAccount("velero", {
    metadata: {
        namespace,
        labels,
    }
});
export const serviceAccountName = serviceAccount.metadata.apply(m => m.name);
new k8s.rbac.v1beta1.ClusterRoleBinding("velero", {
    metadata: {
        labels,
    },
    subjects: [{
        kind: "ServiceAccount",
        namespace,
        name: serviceAccountName,
    }],
    roleRef: {
        kind: "ClusterRole",
        name: "cluster-admin",
        apiGroup: "rbac.authorization.k8s.io",
    }
});
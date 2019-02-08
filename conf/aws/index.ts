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
import * as pulumi from "@pulumi/pulumi";
import { labels, namespace, serviceAccountName } from "../common-prereqs";

// This module provisions the necessary AWS resources for running Velero
// on Amazon Web Services. This is essentially a distillation of the manual steps
// listed at https://heptio.github.io/velero/v0.10.0/aws-config.
const provider = "aws";
const config = { region: aws.config.requireRegion() };

// Set up a backup bucket in AWS and the associated BackupStorageLocation CRD.
const bucket = new aws.s3.Bucket("velerobackups");
const backupStorageLocation = new k8s.apiextensions.CustomResource("default", {
    apiVersion: "ark.heptio.com/v1",
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
    apiVersion: "ark.heptio.com/v1",
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

// Create an AWS IAM user and attach policies to give Velero the necessary permissions.
const awsVeleroUser = new aws.iam.User("velero");
const awsVeleroUserPolicy = new aws.iam.UserPolicy("velero-policy", {
    user: awsVeleroUser.id,
    policy: bucket.arn.apply(bucketArn => JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "ec2:DescribeVolumes",
                    "ec2:DescribeSnapshots",
                    "ec2:CreateTags",
                    "ec2:CreateVolume",
                    "ec2:CreateSnapshot",
                    "ec2:DeleteSnapshot"
                ],
                "Resource": "*"
            },
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:DeleteObject",
                    "s3:PutObject",
                    "s3:AbortMultipartUpload",
                    "s3:ListMultipartUploadParts"
                ],
                "Resource": [ bucketArn ],
            },
            {
                "Effect": "Allow",
                "Action": [
                    "s3:ListBucket"
                ],
                "Resource": [ bucketArn ],
            }
        ]
    })),
});

// Now create an access key for the AWS IAM user and store it in a Kubernetes Secret.
const awsVeleroUserKey = new aws.iam.AccessKey("velero-key", {
    user: awsVeleroUser.id,
}, { dependsOn: awsVeleroUserPolicy });
const awsCredentialsSecret = new k8s.core.v1.Secret("cloud-credentials", {
    metadata: { namespace },
    stringData: {
        "cloud": pulumi.all([awsVeleroUserKey.id, awsVeleroUserKey.secret]).
            apply(([id, secret]) => `[default]\naws_access_key_id=${id}\naws_secret_access_key=${secret}`),
    },
});

// Finally, export an object that customizes the various tags and mounts for GCP.
module.exports = {
    env: [
        { name: "AWS_SHARED_CREDENTIALS_FILE", value: "/credentials/cloud" },
        // { name: "AWS_CLUSTER_NAME", value: "<YOUR_CLUSTER_NAME>" },
    ],
    volumes: [{
        name: "cloud-credentials",
        secret: { secretName: awsCredentialsSecret.metadata.apply(m => m.name) },
    }],
    volumeMounts: [{ name: "cloud-credentials", mountPath: "/credentials" }],
};
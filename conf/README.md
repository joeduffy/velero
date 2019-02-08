# Pulumi Installation

This directory contains the Pulumi definitions for deploying Velero into any cloud provider. It handles the
provisioning for the various Velero CRDs, the cloud resources themselves, in addition to the Kubernetes objects.

## Deploying

To deploy Velero, first configure Pulumi to point at the target cluster. If `kubectl` is already pointing at it,
then you're ready to go -- `pulumi` picks up on that existing configuration. For additional configuration options,
please see the [Pulumi Kubernetes Setup instructions](https://pulumi.io/quickstart/kubernetes/setup.html).

After cloning this repo, run `npm install` to install its dependencies.

Next, create a stack for your Velero deployment:

```bash
$ pulumi stack init production
```

Next, be sure to see the relevant section below for additional steps that depend on your target cloud provider:

* [AWS](#deploying-to-aws)
* [Azure](#deploying-to-azure)
* [GCP](#deploying-to-gcp)

After the prerequisite steps, run:

```bash
$ pulumi config set cloud <YOUR_CLOUD>
```

where `YOUR_CLOUD` is one of the supported cloud providers: `aws`, `azure`, or `gcp`.

After that, run:

```bash
$ pulumi up
```

This will show a preview of what action will be taken. It will look something like this:

```
$ pulumi up
Previewing update (production):

     Type                                                         Name                                    Plan
 +   pulumi:pulumi:Stack                                          velero-pulumi-production                create
 +   ├─ gcp:serviceAccount:Account                                velero                                  create
 +   ├─ gcp:storage:Bucket                                        velerobackups                           create
 +   ├─ kubernetes:ark.heptio.com:VolumeSnapshotLocation          gcp-default                             create
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  restores.ark.heptio.com                 create
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  backups.ark.heptio.com                  create
 +   ├─ kubernetes:core:Namespace                                 heptio-ark                              create
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  resticrepositories.ark.heptio.com       create
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  serverstatusrequests.ark.heptio.com     create
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  backupstoragelocations.ark.heptio.com   create
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  schedules.ark.heptio.com                create
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  volumesnapshotlocations.ark.heptio.com  create
 +   ├─ kubernetes:core:ServiceAccount                            velero                                  create
 +   ├─ gcp:projects:IAMCustomRole                                velero.server                           create
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  podvolumerestores.ark.heptio.com        create
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  downloadrequests.ark.heptio.com         create
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  deletebackuprequests.ark.heptio.com     create
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  podvolumebackups.ark.heptio.com         create
 +   ├─ kubernetes:ark.heptio.com:BackupStorageLocation           default                                 create
 +   ├─ kubernetes:rbac.authorization.k8s.io:ClusterRoleBinding   velero                                  create
 +   ├─ gcp:storage:BucketIAMBinding                              velero.server-binding                   create
 +   ├─ gcp:serviceAccount:Key                                    velero-server-key                       create
 +   ├─ kubernetes:core:Secret                                    cloud-credentials                       create
 +   ├─ kubernetes:apps:Deployment                                velero                                  create
 +   └─ kubernetes:apps:DaemonSet                                 restic                                  create

Resources:
    + 25 to create

Do you want to perform this update?
  > yes
    no
    details
```

After selecting `yes`, your update will proceed:

```
Updating (production):

     Type                                                         Name                                    Status
 +   pulumi:pulumi:Stack                                          velero-pulumi-production                created
 +   ├─ kubernetes:core:Namespace                                 heptio-ark                              created
 +   ├─ kubernetes:ark.heptio.com:VolumeSnapshotLocation          gcp-default                             created
 +   ├─ gcp:storage:Bucket                                        velerobackups                           created
 +   ├─ gcp:serviceAccount:Account                                velero                                  created
 +   ├─ kubernetes:core:ServiceAccount                            velero                                  created
 +   ├─ gcp:projects:IAMCustomRole                                velero.server                           created
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  schedules.ark.heptio.com                created
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  backups.ark.heptio.com                  created
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  downloadrequests.ark.heptio.com         created
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  deletebackuprequests.ark.heptio.com     created
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  podvolumerestores.ark.heptio.com        created
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  resticrepositories.ark.heptio.com       created
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  podvolumebackups.ark.heptio.com         created
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  restores.ark.heptio.com                 created
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  serverstatusrequests.ark.heptio.com     created
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  backupstoragelocations.ark.heptio.com   created
 +   ├─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  volumesnapshotlocations.ark.heptio.com  created
 +   ├─ kubernetes:ark.heptio.com:BackupStorageLocation           default                                 created
 +   ├─ gcp:storage:BucketIAMBinding                              velero.server-binding                   created
 +   ├─ kubernetes:rbac.authorization.k8s.io:ClusterRoleBinding   velero                                  created
 +   ├─ gcp:serviceAccount:Key                                    velero-server-key                       created
 +   ├─ kubernetes:core:Secret                                    cloud-credentials                       created
 +   ├─ kubernetes:apps:Deployment                                velero                                  created
 +   └─ kubernetes:apps:DaemonSet                                 restic                                  created

Resources:
    + 25 created

Duration: 25s

Permalink: https://app.pulumi.com/.../velero-pulumi/production/updates/1
```

After about 30 seconds, you have a fully functioning Velero installation that the `velero` CLI can interact with.

## Deploying to AWS

> Coming soon.

## Deploying to Azure

> Coming soon.

## Deploying to GCP

Ensure that Pulumi is configured to access your GCP account. If `gcloud` is already able to work with
your account, with adequate permissions, then everything will just work. For additional configuration
options, please see the [Pulumi GCP Setup Instructions](https://pulumi.io/quickstart/gcp/setup.html).

From there, the only additional step required is to configure Pulumi to use your project:

```bash
$ pulumi config set gcp:project <YOUR_PROJECT_NAME>
```

After doing this, all GCP resources will be allocated inside of your target account and project.

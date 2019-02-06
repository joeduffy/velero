# Pulumi Installation

This directory contains the Pulumi definitions for deploying Velero into any cloud provider. It handles the
provisioning for the various Velero CRDs, the cloud resources themselves, in addition to the Kubernetes objects.

## Deploying

To deploy Velero, first configure Pulumi to point at the target cluster. If `kubectl` is already pointing at it,
then you're ready to go -- `pulumi` picks up on that existing configuration. For additional configuration options,
please see the [Pulumi Kubernetes Setup instructions](https://pulumi.io/quickstart/kubernetes/setup.html).

First, create a stack for your Velero deployment:

```bash
$ pulumi stack init velero-production
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

This will show a preview and then proceed to deploying all of the resources.

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
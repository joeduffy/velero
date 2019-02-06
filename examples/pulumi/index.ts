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

import { Config } from "@pulumi/pulumi";
import { deployVeleroObjects, VeleroCloudSettings } from "./common-deployments";

// Ensure we have a desired cloud provider.
const config = new Config();
const cloud = config.require("cloud");

// First ensure that the pre-requisites are created and available at the start.
require("./common-prereqs");

// Now switch on the cloud provider, and provision its specific resources.
let settings: VeleroCloudSettings;
switch (cloud) {
    case "aws":
        settings = require("./aws");
        break;
    case "azure":
        settings = require("./azure");
        break;
    case "gcp":
        settings = require("./gcp");
        break;
    default:
        throw new Error(`Unrecognized cloud provider '${cloud}'`);
}

// Finally provision the Velero Deployment and restic DaemonSet.
deployVeleroObjects(settings);

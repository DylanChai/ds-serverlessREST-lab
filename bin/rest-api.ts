#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ClubAPIStack } from "../lib/rest-api-stack";

const app = new cdk.App();
new ClubAPIStack(app, "ClubAPIStack", { env: { region: "eu-west-1" } });

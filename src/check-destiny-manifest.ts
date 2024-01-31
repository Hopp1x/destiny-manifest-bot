import currentVersion from "../latest.json";
import * as core from "@actions/core";
import { createHttpClient }from "@d2api/httpclient";
import {
  getDestinyManifest
} from "bungie-api-ts/destiny2";

// Http client for Bungie API endpoints that (may) require a API key
const authHttpClient = createHttpClient(process.env.BUNGIE_API_KEY!);

async function run() {
  console.log("Fetching Destiny Manifest metadata...");
  const manifestMetadata = await getDestinyManifest(authHttpClient);
  // Abort workflow if communication with Bungie API is interrupted or unresponsive.
  if (manifestMetadata.ErrorStatus !== "Success") {
    core.error(`Bungie ErrorStatus "${manifestMetadata.ErrorStatus}": "${manifestMetadata.Message}"`);
    core.setFailed(`Unable to fetch manifest metadata from Bungie API (ErrorStatus: ${manifestMetadata.ErrorStatus}).`);
    return;
  }
  const latestVersion = manifestMetadata.Response.version;
  console.log(`Current manifest version: "${currentVersion}".`);
  console.log(`Latest manifest version: "${latestVersion}".`);
  if (currentVersion === latestVersion) {
    core.notice(`Destiny Manifest is already up-to-date (Version "${currentVersion}").\nNo changes to the repository were made.`);
    core.setOutput("skip_update", "true");
    return;
  }
  core.notice(`A new version of the Destiny Manifest is available: "${latestVersion}".`);
  core.setOutput("skip_update", "false");
  core.setOutput("current_version", `"${currentVersion}"`);
  core.setOutput("latest_version", latestVersion);
}

await run();

import * as core from "@actions/core";
import { createHttpClient } from "@d2api/httpclient";
import admZip from "adm-zip";
import {
  getDestinyManifest,
  getDestinyManifestSlice,
  HttpClientConfig
} from "bungie-api-ts/destiny2";
import fse from "fs-extra";

// Http client for Bungie API requests where you should not include a API Key
async function httpClient(config: HttpClientConfig) {
  const response = await fetch(config.url, {
    headers: {
      "Accept": "application/json"
    }, 
    method: config.method
  });
  return await response.json();
}

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
  // Retrieve the updated manifest components.
  console.log("Fetching Destiny Manifest components...");
  const destinyManifest = await getDestinyManifestSlice(httpClient, {
    destinyManifest: manifestMetadata.Response,
    tableNames: [
      "DestinyDamageTypeDefinition",
      "DestinyInventoryItemDefinition",
      "DestinyPlugSetDefinition",
      "DestinySeasonDefinition",
      "DestinyStatDefinition",
      "DestinyStatGroupDefinition"
    ],
    language: "en"
  });
  
  // Write the updated Destiny Manifest to the repository.
  console.log("Writing new manifest definitions to 'manifest.zip'...");
  const zip = new admZip();
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(destinyManifest)));
  await zip.writeZipPromise("manifest.zip", { overwrite: true });
  console.log("Writing new manifest version to 'latest.json'...");
  await fse.writeFile("latest.json", JSON.stringify(manifestMetadata.Response.version));
  console.log("Writing new repository README...");
  await fse.writeFile("README.md", `# d2-manifest-bot\nA GitHub Action for fetching the latest version of Bungie's Destiny Manifest.\n## Current manifest version: "${manifestMetadata.Response.version}"`);
  console.log("Uploading changed files to repository...");
}

await run();

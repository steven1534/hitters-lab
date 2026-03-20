// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)

import { ENV } from './_core/env';

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

// Fetch file content from storage (for proxying)
// Gets a fresh signed download URL and fetches the content
export async function storageDownload(relKey: string): Promise<{ data: Buffer; contentType: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  
  // Get a fresh signed download URL from the API
  const downloadApiUrl = new URL('v1/storage/downloadUrl', ensureTrailingSlash(baseUrl));
  downloadApiUrl.searchParams.set('path', key);
  
  console.log('[Storage] Getting download URL for:', key);
  
  const urlResponse = await fetch(downloadApiUrl, {
    method: 'GET',
    headers: buildAuthHeaders(apiKey),
  });
  
  if (!urlResponse.ok) {
    const errorText = await urlResponse.text().catch(() => '');
    console.error('[Storage] Failed to get download URL:', urlResponse.status, errorText);
    throw new Error(`Failed to get download URL: ${urlResponse.status} - ${errorText}`);
  }
  
  const responseData = await urlResponse.json();
  const downloadUrl = responseData.url;
  
  console.log('[Storage] Got download URL:', downloadUrl?.substring(0, 100) + '...');
  
  if (!downloadUrl) {
    throw new Error('No download URL returned from storage API');
  }
  
  // Fetch the actual file content from the signed CloudFront URL
  const fileResponse = await fetch(downloadUrl);
  
  if (!fileResponse.ok) {
    console.error('[Storage] Failed to download file:', fileResponse.status, fileResponse.statusText);
    throw new Error(`Failed to download file: ${fileResponse.status}`);
  }
  
  const arrayBuffer = await fileResponse.arrayBuffer();
  const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
  
  console.log('[Storage] Downloaded file, size:', arrayBuffer.byteLength, 'contentType:', contentType);
  
  return {
    data: Buffer.from(arrayBuffer),
    contentType,
  };
}

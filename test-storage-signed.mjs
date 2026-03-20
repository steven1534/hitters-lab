import dotenv from 'dotenv';
dotenv.config();

const baseUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "");
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

const testPath = 'drill-thumbnails/1-2-3-drill-1769913546878-j798h8.png';

// Try different API endpoints that might exist
const endpoints = [
  'v1/storage/signedUrl',
  'v1/storage/getSignedUrl',
  'v1/storage/presigned',
  'v1/storage/url',
  'v1/storage/read',
  'v1/storage/get',
];

async function tryEndpoint(endpoint) {
  const apiUrl = new URL(endpoint, baseUrl + '/');
  apiUrl.searchParams.set('path', testPath);
  
  console.log(`\nTrying: ${apiUrl.toString()}`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    
    console.log('Status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log('Error:', err.message);
  }
}

async function main() {
  for (const endpoint of endpoints) {
    await tryEndpoint(endpoint);
  }
}

main().catch(console.error);

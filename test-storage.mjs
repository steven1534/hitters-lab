import dotenv from 'dotenv';
dotenv.config();

const baseUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "");
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

console.log('Base URL:', baseUrl);
console.log('API Key exists:', !!apiKey);

// Test getting a download URL for an existing file
const testPath = 'drill-thumbnails/1-2-3-drill-1769913546878-j798h8.png';

async function testDownloadUrl() {
  const downloadApiUrl = new URL('v1/storage/downloadUrl', baseUrl + '/');
  downloadApiUrl.searchParams.set('path', testPath);
  
  console.log('Download API URL:', downloadApiUrl.toString());
  
  const response = await fetch(downloadApiUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  
  console.log('Response status:', response.status);
  const data = await response.json();
  console.log('Response data:', data);
}

testDownloadUrl().catch(console.error);

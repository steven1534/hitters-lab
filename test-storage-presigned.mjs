import dotenv from 'dotenv';
dotenv.config();

const baseUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "");
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

// Test getting a presigned download URL for an existing file
const testPath = 'drill-thumbnails/1-2-3-drill-1769913546878-j798h8.png';

async function testPresignedUrl() {
  // Try the presigned endpoint
  const presignedApiUrl = new URL('v1/storage/presignedUrl', baseUrl + '/');
  presignedApiUrl.searchParams.set('path', testPath);
  presignedApiUrl.searchParams.set('operation', 'get');
  
  console.log('Presigned API URL:', presignedApiUrl.toString());
  
  const response = await fetch(presignedApiUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  
  console.log('Response status:', response.status);
  const text = await response.text();
  console.log('Response:', text);
}

async function listFiles() {
  // Try listing files
  const listApiUrl = new URL('v1/storage/list', baseUrl + '/');
  listApiUrl.searchParams.set('prefix', 'drill-thumbnails/');
  
  console.log('\nList API URL:', listApiUrl.toString());
  
  const response = await fetch(listApiUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  
  console.log('Response status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 500));
}

testPresignedUrl().catch(console.error);
listFiles().catch(console.error);

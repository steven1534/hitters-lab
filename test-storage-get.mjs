import dotenv from 'dotenv';
dotenv.config();

const baseUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "");
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

// Test the downloadUrl endpoint which might return a signed URL
const testPath = 'drill-thumbnails/1-2-3-drill-1769913546878-j798h8.png';

async function getDownloadUrl() {
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
  
  // Test if this URL works
  if (data.url) {
    console.log('\nTesting URL accessibility...');
    const testResponse = await fetch(data.url);
    console.log('URL test status:', testResponse.status);
    console.log('Content-Type:', testResponse.headers.get('content-type'));
    console.log('Content-Length:', testResponse.headers.get('content-length'));
  }
}

getDownloadUrl().catch(console.error);

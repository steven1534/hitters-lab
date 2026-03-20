import dotenv from 'dotenv';
dotenv.config();

const baseUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "");
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

// The CloudFront URL shows the uid: 310519663238794201/4gdCHRuKFjrDK3bmH43Eh2
// Let's try with the full path
const testPath = '310519663238794201/4gdCHRuKFjrDK3bmH43Eh2/drill-thumbnails/1-2-3-drill-1769913546878-j798h8.png';

// Try to download the file through the API
async function downloadViaApi() {
  const downloadApiUrl = new URL('v1/storage/download', baseUrl + '/');
  downloadApiUrl.searchParams.set('path', testPath);
  
  console.log('Download API URL:', downloadApiUrl.toString());
  
  const response = await fetch(downloadApiUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  
  console.log('Response status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  console.log('Content-Length:', response.headers.get('content-length'));
  
  if (response.ok) {
    const buffer = await response.arrayBuffer();
    console.log('Downloaded bytes:', buffer.byteLength);
  } else {
    const text = await response.text();
    console.log('Error response:', text);
  }
}

downloadViaApi().catch(console.error);

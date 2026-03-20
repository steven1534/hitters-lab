import dotenv from 'dotenv';
dotenv.config();

const baseUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "");
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

// Try different path formats
const paths = [
  '4gdCHRuKFjrDK3bmH43Eh2/drill-thumbnails/1-2-3-drill-1769913546878-j798h8.png',
  'drill-thumbnails/1-2-3-drill-1769913546878-j798h8.png',
];

async function downloadViaApi(testPath) {
  const downloadApiUrl = new URL('v1/storage/download', baseUrl + '/');
  downloadApiUrl.searchParams.set('path', testPath);
  
  console.log('\nDownload API URL:', downloadApiUrl.toString());
  
  const response = await fetch(downloadApiUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  
  console.log('Response status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  
  if (response.ok) {
    const buffer = await response.arrayBuffer();
    console.log('Downloaded bytes:', buffer.byteLength);
    return true;
  } else {
    const text = await response.text();
    console.log('Error response:', text.substring(0, 200));
    return false;
  }
}

async function main() {
  for (const path of paths) {
    const success = await downloadViaApi(path);
    if (success) break;
  }
}

main().catch(console.error);

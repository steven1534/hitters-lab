import dotenv from 'dotenv';
dotenv.config();

const baseUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, '');
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
const testPath = 'drill-thumbnails/1-2-3-drill-1769913546878-j798h8.png';

async function test() {
  // Get a fresh download URL from the API
  const downloadApiUrl = new URL('v1/storage/downloadUrl', baseUrl + '/');
  downloadApiUrl.searchParams.set('path', testPath);
  
  console.log('Getting download URL...');
  
  const urlResponse = await fetch(downloadApiUrl, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + apiKey },
  });
  
  console.log('URL Response status:', urlResponse.status);
  
  if (!urlResponse.ok) {
    const errorText = await urlResponse.text();
    console.log('Error:', errorText);
    return;
  }
  
  const { url: downloadUrl } = await urlResponse.json();
  console.log('Download URL:', downloadUrl);
  
  // Fetch the actual file content from the CloudFront URL
  console.log('\nFetching file content...');
  const fileResponse = await fetch(downloadUrl);
  
  console.log('File Response status:', fileResponse.status);
  console.log('Content-Type:', fileResponse.headers.get('content-type'));
  
  if (fileResponse.ok) {
    const buffer = await fileResponse.arrayBuffer();
    console.log('Downloaded bytes:', buffer.byteLength);
  } else {
    const text = await fileResponse.text();
    console.log('Error:', text.substring(0, 200));
  }
}

test().catch(console.error);

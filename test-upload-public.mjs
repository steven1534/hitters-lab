import dotenv from 'dotenv';
dotenv.config();

const baseUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "");
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

// Create a simple test image (1x1 red pixel PNG)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
const testImageBuffer = Buffer.from(testImageBase64, 'base64');

async function uploadTestImage() {
  const timestamp = Date.now();
  const fileKey = `test-images/test-public-${timestamp}.png`;
  
  const uploadUrl = new URL('v1/storage/upload', baseUrl + '/');
  uploadUrl.searchParams.set('path', fileKey);
  uploadUrl.searchParams.set('public', 'true'); // Try adding public flag
  
  console.log('Upload URL:', uploadUrl.toString());
  
  // Create form data
  const blob = new Blob([testImageBuffer], { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', blob, 'test.png');
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  
  console.log('Upload response status:', response.status);
  const data = await response.json();
  console.log('Upload response:', data);
  
  // Now test if the URL is accessible
  if (data.url) {
    console.log('\nTesting URL accessibility...');
    const testResponse = await fetch(data.url);
    console.log('URL test status:', testResponse.status);
    console.log('Content-Type:', testResponse.headers.get('content-type'));
  }
}

uploadTestImage().catch(console.error);

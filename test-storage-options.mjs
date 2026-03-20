import dotenv from 'dotenv';
dotenv.config();

const baseUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "");
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

// Create a simple test image (1x1 red pixel PNG)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
const testImageBuffer = Buffer.from(testImageBase64, 'base64');

async function testWithACL() {
  const timestamp = Date.now();
  const fileKey = `test-images/test-acl-${timestamp}.png`;
  
  const uploadUrl = new URL('v1/storage/upload', baseUrl + '/');
  uploadUrl.searchParams.set('path', fileKey);
  uploadUrl.searchParams.set('acl', 'public-read'); // Try adding ACL
  
  console.log('Upload URL with ACL:', uploadUrl.toString());
  
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
  
  if (data.url) {
    console.log('\nTesting URL accessibility...');
    const testResponse = await fetch(data.url);
    console.log('URL test status:', testResponse.status);
  }
}

async function testWithContentDisposition() {
  const timestamp = Date.now();
  const fileKey = `test-images/test-inline-${timestamp}.png`;
  
  const uploadUrl = new URL('v1/storage/upload', baseUrl + '/');
  uploadUrl.searchParams.set('path', fileKey);
  uploadUrl.searchParams.set('contentDisposition', 'inline'); // Try inline disposition
  
  console.log('\nUpload URL with inline:', uploadUrl.toString());
  
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
  
  if (data.url) {
    console.log('\nTesting URL accessibility...');
    const testResponse = await fetch(data.url);
    console.log('URL test status:', testResponse.status);
  }
}

testWithACL().catch(console.error);
testWithContentDisposition().catch(console.error);

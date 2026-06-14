const https = require('https');

const url = 'https://wlcergeosgpzxasxcyyi.supabase.co/storage/v1/object/public/popups/add-a-heading--9--1779819809596.webp';

https.get(url, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error(e);
});

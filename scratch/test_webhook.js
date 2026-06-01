async function test() {
  const url = 'https://arumseduh.vercel.app/api/webhooks/whatsapp';
  const apiKey = '742699aea235b48f820a4ead52c86e1bc424b3827621df01a54b782c6282d561';

  const payload = {
    phone: '628123456789',
    text: 'Hi Arus, request link untuk Masuk / Daftar ke aplikasi Arus dengan nomor WhatsApp ini dong d95b9d31-4824-4f81-ba2e-503d6d030999. OTP 73673. Ref: cmoy5jq2y00004km5b9br7ecs.',
    jid: '628123456789@s.whatsapp.net',
    directReply: true
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('STATUS:', res.status);
    const data = await res.json();
    console.log('RESPONSE:', data);
  } catch (error) {
    console.error('ERROR:', error);
  }
}

test();

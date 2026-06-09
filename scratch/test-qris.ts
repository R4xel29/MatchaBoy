import { generateQrisString } from '../src/lib/doku';

function test() {
  const amount = 10000;
  const orderId = 'WA-999999';
  const nmid = 'ID1026529166724';
  
  try {
    const qris = generateQrisString(amount, orderId, nmid);
    console.log('Generated QRIS String successfully:');
    console.log(qris);
    console.log('String length:', qris.length);
  } catch (err) {
    console.error('Error generating QRIS:', err);
  }
}

test();

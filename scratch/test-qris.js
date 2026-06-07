function generateQrisStringOld(amount, orderId, customNmid) {
  let qris = '000201'; // Payload Format Indicator
  qris += '010212';   // Point of Initiation: 12 (Dynamic QR)
  
  if (customNmid) {
    const cleanNmid = customNmid.replace(/\s+/g, '');
    if (cleanNmid.startsWith('26')) {
      qris += cleanNmid;
    } else {
      const sub00 = "ID.CO.QRIS.WWW";
      const nmidVal = cleanNmid.length >= 15 ? cleanNmid.substring(0, 15) : cleanNmid.padEnd(15, '0');
      const terminalVal = cleanNmid.length > 15 ? cleanNmid.substring(15) : "A01";
      const subTag00 = "00" + String(sub00.length).padStart(2, '0') + sub00;
      const subTag01 = "01" + String(nmidVal.length).padStart(2, '0') + nmidVal;
      const subTag02 = "02" + String(terminalVal.length).padStart(2, '0') + terminalVal;
      const subTags = subTag00 + subTag01 + subTag02;
      qris += '26' + String(subTags.length).padStart(2, '0') + subTags;
    }
  } else {
    qris += '26330015ID102021151608601030000203000'; 
  }
  
  qris += '52045812'; // MCC
  qris += '5303360';  // Currency
  const amtStr = String(Math.round(amount));
  qris += '54' + String(amtStr.length).padStart(2, '0') + amtStr;
  qris += '5802ID'; // Country
  const merchantName = "ARUS PAY";
  qris += '59' + String(merchantName.length).padStart(2, '0') + merchantName;
  qris += '6012PROBOLINGGO';
  qris += '610567215';
  
  const orderTag = '01' + String(orderId.length).padStart(2, '0') + orderId;
  qris += '62' + String(orderTag.length).padStart(2, '0') + orderTag;
  
  const stringToCrc = qris + '6304';
  const crc = crc16CcittFalse(stringToCrc).toString(16).toUpperCase().padStart(4, '0');
  return stringToCrc + crc;
}

function generateQrisStringNew(amount, orderId, customNmid) {
  let qris = '000201'; // Payload Format Indicator
  qris += '010212';   // Point of Initiation: 12 (Dynamic QR)
  
  const nmid = customNmid || 'ID1020211516086';
  const cleanNmid = nmid.replace(/\s+/g, '');
  
  if (cleanNmid.startsWith('26')) {
    qris += cleanNmid;
  } else {
    const sub00 = "ID.CO.QRIS.WWW";
    const nmidVal = cleanNmid.length >= 15 ? cleanNmid.substring(0, 15) : cleanNmid.padEnd(15, '0');
    const terminalVal = cleanNmid.length > 15 ? cleanNmid.substring(15) : "000";
    
    const subTag00 = "00" + String(sub00.length).padStart(2, '0') + sub00;
    const subTag01 = "01" + String(nmidVal.length).padStart(2, '0') + nmidVal;
    const subTag02 = "02" + String(terminalVal.length).padStart(2, '0') + terminalVal;
    
    const subTags = subTag00 + subTag01 + subTag02;
    qris += '26' + String(subTags.length).padStart(2, '0') + subTags;
  }
  
  qris += '52045812';
  qris += '5303360';
  const amtStr = String(Math.round(amount));
  qris += '54' + String(amtStr.length).padStart(2, '0') + amtStr;
  qris += '5802ID';
  const merchantName = "ARUS PAY";
  qris += '59' + String(merchantName.length).padStart(2, '0') + merchantName;
  qris += '6012PROBOLINGGO';
  qris += '610567215';
  
  const orderTag = '01' + String(orderId.length).padStart(2, '0') + orderId;
  qris += '62' + String(orderTag.length).padStart(2, '0') + orderTag;
  
  const stringToCrc = qris + '6304';
  const crc = crc16CcittFalse(stringToCrc).toString(16).toUpperCase().padStart(4, '0');
  return stringToCrc + crc;
}

function crc16CcittFalse(str) {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    const code = str.charCodeAt(c);
    crc ^= (code << 8);
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc & 0xFFFF;
}

console.log("OLD QRIS STRING:");
console.log(generateQrisStringOld(10000, "12345678"));

console.log("\nNEW QRIS STRING:");
console.log(generateQrisStringNew(10000, "12345678"));

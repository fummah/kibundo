export async function imageAHash(file) {
  if (!file) return "noimg";
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 8; canvas.height = 8;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bmp, 0, 0, 8, 8);
  const { data } = ctx.getImageData(0, 0, 8, 8);

  const px = [];
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2];
    px.push(y);
  }
  const avg = px.reduce((a,b)=>a+b,0)/px.length;
  let bits = "";
  for (const v of px) bits += v > avg ? "1" : "0";

  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i+4), 2).toString(16);
  }
  return hex;
}

export async function textHash(str) {
  const clean = (str || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "");
  let h = 5381;
  for (let i = 0; i < clean.length; i++) {
    h = ((h << 5) + h) + clean.charCodeAt(i);
    h &= 0xffffffff;
  }
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

export async function buildWorksheetSignature({ file, ocrText }) {
  const ih = await imageAHash(file);
  const th = await textHash(ocrText || "");
  return `${ih}-${th}`;
}

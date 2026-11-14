/**
 * PDF kecil tanpa dependensi, dipakai data seed dan data demo.
 *
 * Isinya hanya beberapa baris teks Helvetica, cukup agar berkas yang diunduh
 * benar-benar terbuka sebagai PDF dan isinya bisa dicocokkan dengan baris
 * laporan. Tidak ada stempel waktu di dalamnya, sehingga dua kali pembangkitan
 * dengan masukan sama menghasilkan byte yang sama.
 */

function escapePdfText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * @param {string[]} titleLines baris teks, baris pertama paling besar
 * @returns {Buffer} isi berkas PDF
 */
export function minimalPdf(titleLines) {
  const content =
    "BT\n/F1 18 Tf\n54 760 Td\n" +
    titleLines
      .map((line, i) => (i === 0 ? "0 -18 Td\n" : "0 -24 Td\n") + `(${escapePdfText(line)}) Tj\n`)
      .join("") +
    "ET";

  const objects = [
    "/Type /Catalog /Pages 2 0 R",
    "/Type /Pages /Kids [3 0 R] /Count 1",
    "/Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "/Type /Font /Subtype /Type1 /BaseFont /Helvetica",
  ];

  let body = "%PDF-1.4\n";
  const offsets = [];
  for (const [i, obj] of objects.entries()) {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  }
  const startxref = body.length;
  body +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  return Buffer.from(body, "latin1");
}

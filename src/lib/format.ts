/**
 * Format nilai tampilan yang dipakai lebih dari satu kueri: ukuran berkas
 * dengan desimal koma (gaya Indonesia), KB untuk di bawah 1 MB.
 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

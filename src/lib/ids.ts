/** ID acak berprefiks, dibangkitkan di aplikasi (bukan autoincrement) agar tidak bocor urutan data. */
const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export const ID_PREFIX = {
  division: "div",
  user: "usr",
  category: "cat",
  task: "tsk",
  assignment: "asg",
  submission: "sub",
  attachment: "att",
  review: "rev",
  archive: "arc",
  notification: "ntf",
  log: "log",
  otp: "otp",
  emailRequest: "emr",
  delivery: "dlv",
} as const;

export type IdKind = keyof typeof ID_PREFIX;

export function newId(kind: IdKind, length = 20): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += ID_ALPHABET[byte % ID_ALPHABET.length];
  }
  return `${ID_PREFIX[kind]}_${out}`;
}

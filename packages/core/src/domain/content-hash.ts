export type Sha256Hash = `sha256:${string}`;

export function isSha256Hash(value: string): value is Sha256Hash {
  return /^sha256:[a-f0-9]{64}$/u.test(value);
}

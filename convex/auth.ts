// The worker calls public functions; guard them with a shared secret.
export function checkSecret(secret: string) {
  const expected = process.env.WORKER_SECRET;
  if (!expected || secret !== expected) throw new Error("unauthorized");
}

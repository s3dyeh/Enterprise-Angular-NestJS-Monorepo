import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;
const BCRYPT_MAX_BYTES = 72;

// Callers retain their public error contract; the hashing policy lives here.
export async function hashPassword(
  password: string,
  tooLong: () => never,
): Promise<string> {
  if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_BYTES) tooLong();
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

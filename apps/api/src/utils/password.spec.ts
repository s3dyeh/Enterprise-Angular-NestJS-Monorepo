import bcrypt from 'bcryptjs';
import { hashPassword } from './password';

describe('password hashing policy', () => {
  const tooLong = (): never => {
    throw new Error('too long');
  };

  it('uses one work factor and accepts the 72-byte boundary', async () => {
    const password = 'é'.repeat(36);
    const hash = await hashPassword(password, tooLong);
    expect(bcrypt.getRounds(hash)).toBe(12);
    expect(await bcrypt.compare(password, hash)).toBe(true);
  });

  it('rejects overlong UTF-8 input instead of silently truncating it', async () => {
    await expect(hashPassword('é'.repeat(37), tooLong)).rejects.toThrow(
      'too long',
    );
    await expect(hashPassword('a'.repeat(73), tooLong)).rejects.toThrow(
      'too long',
    );
  });
});

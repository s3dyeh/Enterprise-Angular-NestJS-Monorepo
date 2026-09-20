import { ValidationPipe } from '@nestjs/common';
import validationOptions from '../../utils/validation-options';
import { QueryUserDto } from './query-user.dto';
import { UpdateUserDto } from './update-user.dto';

describe('User DTO validation', () => {
  const pipe = new ValidationPipe(validationOptions);
  const query = (value: object) =>
    pipe.transform(value, { type: 'query', metatype: QueryUserDto });

  it.each([{ page: '0' }, { page: '-1' }, { limit: '1.5' }, { page: 'abc' }])(
    'rejects invalid pagination %j',
    async (value) => {
      await expect(query(value)).rejects.toBeDefined();
    },
  );

  it('parses filters, sorting, and numeric pagination', async () => {
    const result: QueryUserDto = await query({
      page: '2',
      limit: '10',
      filters: '{"roles":[{"id":1}]}',
      sort: '[{"orderBy":"email","order":"ASC"}]',
    });
    expect(result.page).toBe(2);
    expect(result.filters?.roles?.[0].id).toBe(1);
    expect(result.sort?.[0].orderBy).toBe('email');
  });

  it('returns a client error for malformed JSON', async () => {
    await expect(query({ filters: '{' })).rejects.toMatchObject({
      status: 400,
    });
  });

  it.each([
    '[{"orderBy":"password","order":"ASC"}]',
    '[{"orderBy":"id","order":"INVALID"}]',
    '{"orderBy":"id","order":"ASC"}',
  ])('rejects unsafe sort input %s', async (sort) => {
    await expect(query({ sort })).rejects.toBeDefined();
  });

  it('accepts a partial update without requiring creation fields', async () => {
    await expect(
      pipe.transform(
        { firstName: 'Updated' },
        { type: 'body', metatype: UpdateUserDto },
      ),
    ).resolves.toMatchObject({ firstName: 'Updated' });
  });

  it.each([
    { email: 42 },
    { role: { id: 'admin' } },
    { firstName: {} },
    { photo: { id: 5 } },
  ])('rejects invalid nested values %j', async (value) => {
    await expect(
      pipe.transform(value, { type: 'body', metatype: UpdateUserDto }),
    ).rejects.toBeDefined();
  });
});

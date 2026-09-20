import { defaultListParams, dialogSize, likeOrFilter } from './crud.util';
import { environment } from '@environments/environment';

describe('defaultListParams', () => {
  it('starts on page 1 with the first page size', () => {
    expect(defaultListParams()).toEqual({
      page_size: environment.perPageOptions[0],
      page: 1,
      order_by: 'id',
      direction: 'desc',
    });
  });
});

describe('likeOrFilter', () => {
  it('returns empty for blank search', () => {
    expect(likeOrFilter(['name'], '   ')).toBe('');
  });

  it('returns a plain search term for the API', () => {
    expect(likeOrFilter(['name'], 'erb')).toBe('erb');
    expect(likeOrFilter(['full_name', 'username'], 'erb')).toBe('erb');
  });

  it('preserves numeric searches', () => {
    expect(likeOrFilter(['name'], '12')).toBe('12');
  });

  it('preserves text without constructing a query language', () => {
    expect(likeOrFilter(['name'], 'a"b[c];d')).toBe('a"b[c];d');
  });
});

describe('dialogSize', () => {
  it('caps width to the viewport', () => {
    expect(dialogSize('520px')).toEqual(
      jasmine.objectContaining({
        width: '520px',
        maxWidth: 'calc(100vw - 24px)',
        panelClass: 'app-dialog',
        disableClose: true,
      }),
    );
  });
});

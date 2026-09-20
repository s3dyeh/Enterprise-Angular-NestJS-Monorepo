import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@environments/environment';
import { HttpService } from './http.service';

describe('HttpService', () => {
  let http: HttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('unwraps list data and sends paging params', () => {
    let result: unknown;
    http
      .list('regions', {
        page: 2,
        page_size: 25,
        order_by: 'name',
        direction: 'asc',
        filter: 'a',
      })
      .subscribe((res) => (result = res));

    const req = backend.expectOne((r) => r.url === `${environment.apiUrl}/admin/regions`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('page_size')).toBe('25');
    expect(req.request.params.get('order_by')).toBe('name');
    expect(req.request.params.get('direction')).toBe('asc');
    expect(req.request.params.get('search')).toBe('a');
    req.flush({ data: { list: [{ id: 1, name: 'Erbil' }], count: 1 } });
    expect(result).toEqual({ list: [{ id: 1, name: 'Erbil' }], count: 1 });
  });

  it('gets by id, posts, puts, and deletes under the api prefix', () => {
    http.getById('cities', 9).subscribe();
    backend.expectOne(`${environment.apiUrl}/admin/cities/9`).flush({ data: { id: 9 } });

    http.post('cities', { name: 'Slemani' }).subscribe();
    const post = backend.expectOne(`${environment.apiUrl}/admin/cities`);
    expect(post.request.method).toBe('POST');
    post.flush({ data: { id: 2 } });

    http.put('cities', { name: 'Duhok' }, 3).subscribe();
    const put = backend.expectOne(`${environment.apiUrl}/admin/cities/3`);
    expect(put.request.method).toBe('PUT');
    put.flush({});

    http.delete('cities', 3).subscribe();
    const del = backend.expectOne(`${environment.apiUrl}/admin/cities/3`);
    expect(del.request.method).toBe('DELETE');
    del.flush({});
  });
});

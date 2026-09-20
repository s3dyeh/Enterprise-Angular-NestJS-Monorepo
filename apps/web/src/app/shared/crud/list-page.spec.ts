import { Component, DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { MatDialog } from '@angular/material/dialog';
import type { TranslocoService } from '@jsverse/transloco';
import { Observable, of, throwError } from 'rxjs';
import type { HttpService } from '@app/core/services/http.service';
import { ListPage } from './list-page';

@Component({ standalone: true, template: '' })
class HostComponent {}

describe('ListPage', () => {
  let page: ListPage<{ id: number; name: string }>;
  let http: jasmine.SpyObj<HttpService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let transloco: { translate: jasmine.Spy };

  beforeEach(() => {
    http = jasmine.createSpyObj('HttpService', ['list', 'delete']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    transloco = { translate: jasmine.createSpy('translate').and.returnValue('load failed') };
    http.list.and.returnValue(of({ list: [{ id: 1, name: 'Erbil' }], count: 4 }));
    TestBed.configureTestingModule({
      imports: [HostComponent],
    });
    const host = TestBed.createComponent(HostComponent);
    page = new ListPage(
      { endpoint: 'regions', searchColumns: ['name'], dialog: HostComponent },
      http,
      dialog,
      host.componentRef.injector.get(DestroyRef),
      transloco as unknown as TranslocoService,
    );
  });

  it('loads rows and count', () => {
    page.load();
    expect(http.list).toHaveBeenCalled();
    expect(page.rows()).toEqual([{ id: 1, name: 'Erbil' }]);
    expect(page.count()).toBe(4);
    expect(page.loading()).toBeFalse();
    expect(page.error()).toBeNull();
  });

  it('cancels an in-flight request when its owning view is destroyed', () => {
    const cancel = jasmine.createSpy('cancel request');
    http.list.and.returnValue(new Observable(() => cancel));
    page.load();
    TestBed.resetTestingModule();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('resets to page 1 and builds a filter on search', () => {
    page.params.page = 3;
    page.search = 'erb';
    page.applySearch();
    expect(page.params.page).toBe(1);
    expect(page.params.filter).toBe('erb');
  });

  it('updates sort and paging', () => {
    page.sortChange({ active: 'name', direction: 'asc' });
    expect(page.params.order_by).toBe('name');
    expect(page.params.direction).toBe('asc');

    page.pageChange({ pageIndex: 2, pageSize: 25, length: 100 } as never);
    expect(page.params.page).toBe(3);
    expect(page.params.page_size).toBe(25);
  });

  it('surfaces a load error', () => {
    http.list.and.returnValue(throwError(() => new Error('down')));
    page.load();
    expect(page.rows()).toEqual([]);
    expect(page.count()).toBe(0);
    expect(page.error()).toBe('load failed');
    expect(page.loading()).toBeFalse();
  });

  it('reloads after a saved dialog', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
    page.openDialog();
    expect(dialog.open).toHaveBeenCalled();
    expect(http.list).toHaveBeenCalledTimes(1);
  });

  it('deletes after confirm and reloads', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
    http.delete.and.returnValue(of({}));
    http.list.calls.reset();
    page.remove({ id: 1, name: 'Erbil' });
    expect(http.delete).toHaveBeenCalledWith('regions', 1);
    expect(http.list).toHaveBeenCalled();
  });

  it('does not delete when confirm is cancelled', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);
    page.remove({ id: 1, name: 'Erbil' });
    expect(http.delete).not.toHaveBeenCalled();
  });
});

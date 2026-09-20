import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import { environment as env } from '@environments/environment';
import type { ListParams } from '../interfaces/params';
import type { ListResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class HttpService {
  private readonly http = inject(HttpClient);

  list<T>(url: string, param: ListParams): Observable<ListResponse<T>> {
    return this.http
      .get<{ data: ListResponse<T> }>(`${env.apiUrl}/admin/${url}`, {
        params: this.toParams(param),
      })
      .pipe(map((res) => res.data));
  }

  get<T>(url: string, param?: ListParams): Observable<T> {
    const params = param ? this.toParams(param) : undefined;
    return this.http
      .get<{ data: T }>(`${env.apiUrl}/admin/${url}`, { params })
      .pipe(map((res) => res.data));
  }

  getById<T>(url: string, id: string | number): Observable<T> {
    return this.http
      .get<{ data: T }>(`${env.apiUrl}/admin/${url}/${id}`)
      .pipe(map((res) => res.data));
  }

  put(url: string, data: unknown, id: string | number): Observable<unknown> {
    return this.http.put(`${env.apiUrl}/admin/${url}/${id}`, data);
  }

  post<T>(url: string, data: unknown): Observable<{ data: T }> {
    return this.http.post<{ data: T }>(`${env.apiUrl}/admin/${url}`, data);
  }

  delete(url: string, id: string | number): Observable<unknown> {
    return this.http.delete(`${env.apiUrl}/admin/${url}/${id}`);
  }

  private toParams(param: ListParams): Record<string, string | number> {
    const params: Record<string, string | number> = {
      page: param.page,
      page_size: param.page_size,
    };
    if (param.direction) {
      params['order_by'] = param.order_by ?? 'id';
      params['direction'] = param.direction === 'desc' ? 'desc' : 'asc';
    }
    if (param.filter) {
      params['search'] = param.filter;
    }
    if (param.select) {
      params['select'] = param.select;
    }
    return params;
  }
}

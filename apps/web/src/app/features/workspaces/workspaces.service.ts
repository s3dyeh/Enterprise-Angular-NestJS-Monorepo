import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment';
import type { Workspace, WorkspaceDetails, WorkspaceRole } from '@enterprise/contracts';
import { LOCAL_FEEDBACK } from '@app/core/interceptor/local-feedback';

@Injectable({ providedIn: 'root' })
export class WorkspacesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/workspaces`;
  private options() {
    return { context: new HttpContext().set(LOCAL_FEEDBACK, true) };
  }
  list() {
    return this.http.get<Workspace[]>(this.url, this.options());
  }
  create(name: string) {
    return this.http.post<Workspace>(this.url, { name }, this.options());
  }
  details(id: string) {
    return this.http.get<WorkspaceDetails>(`${this.url}/${id}`, this.options());
  }
  rename(id: string, name: string) {
    return this.http.patch<void>(`${this.url}/${id}`, { name }, this.options());
  }
  invite(id: string, email: string, role: 'admin' | 'member') {
    return this.http.post<{ token: string }>(
      `${this.url}/${id}/invitations`,
      { email, role },
      this.options(),
    );
  }
  revoke(id: string, invitationId: string) {
    return this.http.delete<void>(`${this.url}/${id}/invitations/${invitationId}`, this.options());
  }
  changeRole(id: string, userId: number, role: WorkspaceRole) {
    return this.http.patch<void>(`${this.url}/${id}/members/${userId}`, { role }, this.options());
  }
  remove(id: string, userId: number) {
    return this.http.delete<void>(`${this.url}/${id}/members/${userId}`, this.options());
  }
  accept(token: string) {
    return this.http.post<{ workspaceId: string }>(
      `${this.url}/accept-invitation`,
      { token },
      this.options(),
    );
  }
}

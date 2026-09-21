export type WorkspaceRole = 'owner' | 'admin' | 'member';
export interface Workspace {
  id: string;
  name: string;
  role: WorkspaceRole;
}
export interface WorkspaceMember {
  userId: number;
  email: string;
  name: string;
  role: WorkspaceRole;
}
export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: 'admin' | 'member';
  expiresAt: string;
}
export interface WorkspaceDetails {
  workspace: Workspace;
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
}

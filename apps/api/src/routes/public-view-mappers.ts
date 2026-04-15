import type { Project, Session, PreviewRouteBinding } from '@udd/contracts';
import type { ProjectView, SessionView, PreviewView } from '@udd/contracts';

export function mapProjectView(project: Project): ProjectView {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug ?? null,
    description: project.description ?? null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function mapSessionView(session: Session): SessionView {
  return {
    id: session.id,
    projectId: session.projectId,
    userId: session.userId,
    state: session.state,
    startedAt: session.startedAt ?? null,
    stoppedAt: session.stoppedAt ?? null,
    lastActivityAt: session.lastActivityAt ?? null,
    idleTimeoutSeconds: session.idleTimeoutSeconds,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export function mapPreviewView(preview: PreviewRouteBinding): PreviewView {
  return {
    id: preview.id,
    previewId: preview.previewId,
    sessionId: preview.sessionId,
    projectId: preview.projectId,
    state: preview.state,
    boundAt: preview.boundAt,
    expiresAt: preview.expiresAt ?? null,
    revokedAt: preview.revokedAt ?? null,
  };
}

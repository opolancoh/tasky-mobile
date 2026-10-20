import type { Breadcrumb } from './breadcrumbs';
import type { ErrorReport } from './errorReports';

/** "12:04:31 Screen TaskDetail" / "12:04:33 PATCH /api/v1/tasks/… 503 · traceId …" */
export const crumbLine = (c: Breadcrumb) =>
  `${c.at.slice(11, 19)} ${c.kind === 'screen' ? `Screen ${c.name}` : `${c.method} ${c.path} ${c.status || 'no response'}${c.traceId ? ` · traceId ${c.traceId}` : ''}`}`;

/** A report as plain text, to Share or Copy (in English, for whoever reads it). */
export function reportText(r: ErrorReport): string {
  return [
    `Azignia error report ${r.id}`,
    `${r.code ? `${r.code}: ` : ''}${r.message}`,
    `When: ${r.occurredAt}`,
    `Screen: ${r.screen ?? 'unknown'}`,
    `App: ${r.appVersion} · ${r.platform} · ${r.deviceInfo} · ${r.environment}`,
    `Caught by: ${r.source}${r.fatal ? ' (fatal)' : ''}`,
    r.requestTraceId ? `Request traceId: ${r.requestTraceId}` : '',
    r.stack ? `\nStack:\n${r.stack}` : '',
    r.componentStack ? `\nComponent stack:\n${r.componentStack}` : '',
    r.breadcrumbs.length ? `\nBefore it:\n${r.breadcrumbs.map(crumbLine).join('\n')}` : '',
  ].filter(Boolean).join('\n');
}

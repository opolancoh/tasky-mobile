import type { ReportStatus } from '@/shared/errors/errorReports';

/** The color of a report's status: sent is quiet, not sent asks for attention. */
export const statusColor = (status: ReportStatus): 'danger' | 'ink2' | 'ink3' => (status === 'pending' || status === 'new' ? 'danger' : status === 'sent' ? 'ink3' : 'ink2');

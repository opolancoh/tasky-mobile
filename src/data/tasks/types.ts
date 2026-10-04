import type { Id, LocalDate, Version } from '@/core/types';

export type SortMode = 'manual' | 'dueDate' | 'important' | 'title' | 'created';

/** An item of GET /workspaces/{id}/collections: Inbox first, then the sidebar order. */
export interface Collection {
  id: Id;
  workspaceId: Id;
  name: string;
  /** "#4A90E2": user data, not a palette color. */
  color: string;
  icon: string | null;
  isInbox: boolean;
  sortMode: SortMode;
  showCompleted: boolean;
  isArchived: boolean;
  version: Version;
  openTasks?: number;
}

/** An item of GET /workspaces/{id}/tags. */
export interface Tag {
  id: Id;
  workspaceId: Id;
  name: string;
  color: string | null;
  version: Version;
  openTasks?: number;
}

/** POST /collections/{id}/tasks. `#tags` in the title are applied (created when new) and removed from it. */
export interface CreateTaskRequest {
  title: string;
  notes?: string;
  dueDate?: LocalDate;
  /** The Important flag; omitted = not important. */
  isImportant?: boolean;
  /** The caller's reminder; both or neither. Omitted with a due date: 9:00 on the due date (D31). */
  reminderDate?: LocalDate;
  reminderTime?: string;
}

/** The fields of a task the app reads so far. */
export interface Task {
  id: Id;
  workspaceId: Id;
  collectionId: Id;
  title: string;
  notes: string | null;
  isImportant: boolean;
  dueDate: LocalDate | null;
  tagIds: Id[];
  version: Version;
}

/** API limits (TaskLimits.cs). */
export const taskLimits = { titleMax: 500, notesMax: 10_000 } as const;

export const TaskErrorCodes = {
  /** The title had only #tags. */
  titleOnlyTags: 'task.title_only_tags',
} as const;

import type { ReminderAt } from '@/core/dates/reminders';
import type { Id, LocalDate } from '@/core/types';
import { tasksApi } from '@/data/tasks/api';
import type { TaskChange } from '@/data/tasks/mutations';
import type { CollectionRef, RepeatPattern, Step, Tag } from '@/data/tasks/types';

/**
 * Task detail's edits as `useChangeTask` changes: the API calls (against the task as last read) and how the task
 * looks right away. Shared by the screen and its field sheet.
 */
export const taskChanges = {
  title: (title: string): TaskChange => ({
    run: (t) => tasksApi.update(t, { title }),
    optimistic: (t) => ({ ...t, title }),
  }),

  notes: (notes: string): TaskChange => ({
    run: (t) => tasksApi.update(t, { notes: notes || null }),
    optimistic: (t) => ({ ...t, notes: notes || null }),
  }),

  important: (isImportant: boolean): TaskChange => ({
    run: (t) => tasksApi.update(t, { isImportant }),
    optimistic: (t) => ({ ...t, isImportant }),
  }),

  /**
   * A due date, or none. Clearing it also stops a repeat (a repeat needs a due date). A first due date gets the
   * caller's 9:00 reminder from the API (D31); when they had none, the app removes it (M19), as Quick add does.
   */
  due: (dueDate: LocalDate | undefined): TaskChange => ({
    run: async (t) => {
      const saved = await tasksApi.update(t, { dueDate: dueDate ?? null, ...(!dueDate && t.repeat ? { repeat: null } : {}) });
      if (!dueDate || t.dueDate || t.reminder) return saved;
      await tasksApi.removeReminder(t.id).catch(() => undefined);
      return undefined;   // read the task again: `saved` still shows the 9:00 reminder
    },
    optimistic: (t) => ({ ...t, dueDate: dueDate ?? null, repeat: dueDate ? t.repeat : null }),
  }),

  /** The caller's reminder (only theirs, D31), or none. */
  reminder: (at: ReminderAt | null): TaskChange => ({
    run: (t) => (at ? tasksApi.setReminder(t.id, at.date, at.time) : tasksApi.removeReminder(t.id)),
    optimistic: (t) => ({ ...t, reminder: at }),
  }),

  /** A plain rule (every 1, from the due date), or none. With no due date it starts today. */
  repeat: (pattern: RepeatPattern | null, today: LocalDate): TaskChange => ({
    run: (t) => tasksApi.update(t, pattern ? { repeat: { pattern }, ...(t.dueDate ? {} : { dueDate: today }) } : { repeat: null }),
    optimistic: (t) => ({ ...t, dueDate: pattern ? (t.dueDate ?? today) : t.dueDate }),
  }),

  move: (collection: CollectionRef): TaskChange => ({
    run: async (t) => (await tasksApi.move(t, collection.id)).task,
    optimistic: (t) => ({ ...t, collection }),
  }),

  /** Ticks the circle. A repeating task stays open on its next date, so it isn't shown completed. */
  complete: (): TaskChange => ({
    run: (t) => tasksApi.complete(t),
    optimistic: (t) => (t.repeat ? t : { ...t, status: 'completed' }),
  }),

  reopen: (): TaskChange => ({
    run: (t) => tasksApi.reopen(t),
    optimistic: (t) => ({ ...t, status: 'open', completedAt: null, completedBy: null }),
  }),

  skip: (): TaskChange => ({
    run: (t) => tasksApi.skip(t),
    optimistic: (t) => ({ ...t, dueDate: t.repeat?.nextDueDate ?? t.dueDate }),
  }),

  toggleStep: (step: Step): TaskChange => ({
    run: () => tasksApi.updateStep(step.id, { isDone: !step.isDone }),
    optimistic: (t) => ({ ...t, steps: t.steps.map((s) => (s.id === step.id ? { ...s, isDone: !s.isDone } : s)) }),
  }),

  renameStep: (step: Step, title: string): TaskChange => ({
    run: () => tasksApi.updateStep(step.id, { title }),
    optimistic: (t) => ({ ...t, steps: t.steps.map((s) => (s.id === step.id ? { ...s, title } : s)) }),
  }),

  deleteStep: (step: Step): TaskChange => ({
    run: () => tasksApi.removeStep(step.id),
    optimistic: (t) => ({ ...t, steps: t.steps.filter((s) => s.id !== step.id) }),
  }),

  addStep: (title: string): TaskChange => ({
    run: (t) => tasksApi.addStep(t.id, title),
  }),

  /**
   * Makes the task's tags exactly `names` (lower case): removes the others, adds existing tags, and creates new
   * names first (POST /tags). `workspaceTags` is the workspace's list (GET /tags).
   */
  tags: (workspaceId: Id, names: string[], workspaceTags: Tag[]): TaskChange => ({
    run: async (t) => {
      const wanted = new Set(names);
      const current = new Set(t.tags.map((g) => g.name.toLowerCase()));
      for (const g of t.tags) if (!wanted.has(g.name.toLowerCase())) await tasksApi.removeTag(t.id, g.id);
      for (const name of names) {
        if (current.has(name)) continue;
        const tag = workspaceTags.find((g) => g.name.toLowerCase() === name) ?? (await tasksApi.createTag(workspaceId, name));
        await tasksApi.addTag(t.id, tag.id);
      }
    },
    optimistic: (t) => ({ ...t, tags: t.tags.filter((g) => names.includes(g.name.toLowerCase())) }),
  }),
};

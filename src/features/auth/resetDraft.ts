/**
 * The password reset in progress: the email, the request id from forgot-password and, once checked,
 * the code. Memory only; the new password is never stored here.
 */
export interface ResetDraft {
  email: string;
  requestId: string;
  code?: string;
}

let draft: ResetDraft | null = null;

export const resetDraft = {
  get: () => draft,
  start: (email: string, requestId: string) => {
    draft = { email, requestId };
  },
  update: (changes: Partial<ResetDraft>) => {
    if (draft) draft = { ...draft, ...changes };
  },
  clear: () => {
    draft = null;
  },
};

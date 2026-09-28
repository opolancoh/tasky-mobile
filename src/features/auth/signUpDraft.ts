/**
 * The sign-up in progress, between Sign up and Verify code. Memory only: the password is needed to sign in
 * after verifying, so it never goes into navigation params (which can be persisted or logged) or storage.
 */
export interface SignUpDraft {
  requestId: string;
  email: string;
  password: string;
}

let draft: SignUpDraft | null = null;

export const signUpDraft = {
  get: () => draft,
  set: (value: SignUpDraft) => {
    draft = value;
  },
  setRequestId: (requestId: string) => {
    if (draft) draft = { ...draft, requestId };
  },
  clear: () => {
    draft = null;
  },
};

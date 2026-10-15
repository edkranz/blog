import type { FileChange } from './types.ts';

/** Everything the admin needs from git. Implemented by GitHub (prod) and an in-memory fake (local E2E). */
export interface ContentBackend {
  listBranches(): Promise<string[]>;
  head(branch: string): Promise<string>;
  /** UTF-8 contents, or null when the file does not exist on that branch. */
  readFile(branch: string, path: string): Promise<string | null>;
  /** File names (not paths) directly inside `dir`. */
  listDir(branch: string, dir: string): Promise<string[]>;
  createBranch(name: string, from: string): Promise<void>;
  /** One commit with every change; throws BranchMovedError unless the branch is still at `expectedHead`. */
  commit(branch: string, expectedHead: string, message: string, changes: FileChange[]): Promise<{ sha: string }>;
  /** Squash-merge `branch` into main via a PR, then delete the branch. */
  publish(branch: string, title: string): Promise<void>;
  previewUrl(branch: string): Promise<string | null>;
}

export class BranchMovedError extends Error {
  name = 'BranchMovedError';
  constructor() {
    super('branch moved');
  }
}

export class MergeConflictError extends Error {
  name = 'MergeConflictError';
  constructor() {
    super('merge conflict');
  }
}

export class GitHubError extends Error {
  name = 'GitHubError';
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

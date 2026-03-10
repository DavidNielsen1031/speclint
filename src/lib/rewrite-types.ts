// Shared types for rewrite/refine endpoints (S4: shared types)

export const VALID_TARGET_AGENTS = ['cursor', 'claude-code', 'codex', 'copilot', 'general'] as const
export type TargetAgent = (typeof VALID_TARGET_AGENTS)[number]

export const VALID_MODES = ['minimal', 'full'] as const
export type RewriteMode = (typeof VALID_MODES)[number]

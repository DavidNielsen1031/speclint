import { z } from 'zod'

// --- Synthetic Persona ---

export const SyntheticPersonaSchema = z.object({
  name: z.string(),
  role: z.string(),
  context: z.string(), // their daily reality / environment
  primary_goal: z.string(), // what they're trying to accomplish
  frustrations: z.array(z.string()).min(1).max(3),
})

export const PersonaReactionSchema = z.object({
  persona_name: z.string(),
  would_use: z.boolean(),
  enthusiasm: z.enum(['excited', 'interested', 'indifferent', 'skeptical', 'opposed']),
  reaction: z.string(), // 1-2 sentence raw reaction in their voice
  actual_problem: z.string(), // what they ACTUALLY need (may differ from spec)
  workaround: z.string().nullable(), // how they solve this today without this feature
  dealbreaker: z.string().nullable(), // what would make them NOT use this
})

// --- Strategic Bug Checks ---

export const StrategicBugSchema = z.object({
  check: z.enum([
    'so_what',           // No clear business outcome
    'duplicate_effort',  // Already exists elsewhere
    'scope_creep',       // Multiple features disguised as one
    'unvalidated_assumption', // Critical assumption not tested
    'build_vs_buy',      // Could use existing solution
    'irreversibility',   // Hard to undo (new data model, API contract, pricing)
    'no_evidence',       // No cited evidence of demand
  ]),
  severity: z.enum(['info', 'warning', 'blocker']),
  finding: z.string(), // specific finding about THIS spec
  suggestion: z.string(), // what to do about it
})

// --- Combined Output ---

export const StrategicLintResultSchema = z.object({
  strategic_score: z.number().min(0).max(100),
  summary: z.string(), // 1-2 sentence strategic assessment
  personas: z.array(SyntheticPersonaSchema).min(2).max(4),
  reactions: z.array(PersonaReactionSchema).min(2).max(4),
  strategic_bugs: z.array(StrategicBugSchema),
  recommendation: z.enum([
    'ready_to_build',     // No strategic issues, ship it
    'refine_problem',     // Problem statement needs work
    'validate_first',     // Run a test before building
    'split_scope',        // Break into smaller bets
    'reconsider',         // Fundamental strategic concerns
  ]),
  next_step: z.string(), // specific actionable next step
})

export type SyntheticPersona = z.infer<typeof SyntheticPersonaSchema>
export type PersonaReaction = z.infer<typeof PersonaReactionSchema>
export type StrategicBug = z.infer<typeof StrategicBugSchema>
export type StrategicLintResult = z.infer<typeof StrategicLintResultSchema>

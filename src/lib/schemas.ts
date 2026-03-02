import { z } from 'zod'

export const RefinedItemSchema = z.object({
  title: z.string().min(1),
  problem: z.string().min(1),
  acceptanceCriteria: z.array(z.string().min(1)).min(1).max(10),
  estimate: z.enum(['XS', 'S', 'M', 'L', 'XL']),
  priority: z.string().regex(/^(HIGH|MEDIUM|LOW)\s*[—–-]\s*.+/, 'Priority must be "LEVEL — rationale" format'),
  tags: z.array(z.string()).min(1).max(10),
  assumptions: z.array(z.string()).max(2).optional(),
  userStory: z.string().optional(),
  persona_alignment: z.number().min(0).max(100).nullable().optional(),
  persona_gaps: z.array(z.string()).nullable().optional(),
  complexity_warning: z.string().optional(),
})

export const RefinedItemsSchema = z.array(RefinedItemSchema).min(1)

export type RefinedItem = z.infer<typeof RefinedItemSchema>

export const DiscoveryQuestionSchema = z.object({
  rank: z.number(),
  question: z.string(),
  category: z.enum(['outcome', 'user_job', 'assumption', 'feasibility', 'risk', 'acceptance_criteria']),
  why_it_matters: z.string(),
  fastest_validation: z.string(),
})

export const DiscoveryAssumptionSchema = z.object({
  statement: z.string(),
  type: z.enum(['desirability', 'viability', 'feasibility']),
  risk: z.enum(['low', 'medium', 'high']),
  simple_test: z.string(),
})

export const DiscoveryResultSchema = z.object({
  classification: z.enum(['SKIP', 'LIGHT_DISCOVERY', 'FULL_DISCOVERY']),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  primary_signal: z.string(),
  questions: z.array(DiscoveryQuestionSchema),
  assumptions: z.array(DiscoveryAssumptionSchema),
})

export type DiscoveryQuestion = z.infer<typeof DiscoveryQuestionSchema>
export type DiscoveryAssumption = z.infer<typeof DiscoveryAssumptionSchema>
export type DiscoveryResult = z.infer<typeof DiscoveryResultSchema>

// ---- Sprint Planner schemas -----------------------------------------------

export const SprintItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  estimate: z.enum(['XS', 'S', 'M', 'L', 'XL']).optional(),
  priority: z.string().optional(),
  tags: z.array(z.string()).optional(),
  rationale: z.string().min(1),
  parallel_group: z.number().int().positive().optional(),
  depends_on: z.array(z.string()).optional(),
})

export const SprintPlanSchema = z.object({
  sprint_goal: z.string().min(1),
  execution_queue: z.array(SprintItemSchema).min(1),
  deferred: z.array(SprintItemSchema).optional(),
  fit_ratio: z.number().min(0).max(1),
})

export type SprintItem = z.infer<typeof SprintItemSchema>
export type SprintPlan = z.infer<typeof SprintPlanSchema>

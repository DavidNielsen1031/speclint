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
})

export const RefinedItemsSchema = z.array(RefinedItemSchema).min(1)

export type RefinedItem = z.infer<typeof RefinedItemSchema>

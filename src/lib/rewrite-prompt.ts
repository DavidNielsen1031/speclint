// Shared prompt builder for rewrite/refine endpoints (S2: shared prompt)
import type { TargetAgent, RewriteMode } from '@/lib/rewrite-types'

// Agent-specific prompt guidance (Feature 5)
export const AGENT_GUIDANCE: Record<TargetAgent, string> = {
  cursor:
    'Add explicit file paths in acceptance criteria. Cursor struggles with multi-file changes without them. Example: "Update src/components/Header.tsx to add logout button".',
  'claude-code':
    'Add explicit verification and test steps. Claude Code is thorough but needs clear success criteria. Include specific commands to run (e.g., "Run npx jest --testPathPattern=auth to verify").',
  codex:
    'Add strict scope constraints and boundaries. Codex tends to overbuild without explicit limits. Include "Do NOT modify..." and "Out of scope:..." sections.',
  copilot:
    'Add before/after state descriptions for each change. Copilot Workspace needs clear state transitions. Format: "BEFORE: [current state] → AFTER: [desired state]".',
  general: '',
}

/**
 * Build the system prompt dynamically based on optional parameters.
 * Used by both /api/rewrite and /api/refine (auto_rewrite) for consistent output.
 */
export function buildSystemPrompt(options: {
  codebaseContext?: {
    stack?: string[]
    patterns?: string[]
    constraints?: string[]
  }
  breakdown?: Record<string, boolean>
  mode?: RewriteMode
  targetAgent?: TargetAgent
}): string {
  const parts: string[] = []

  // Base instruction — varies by mode (Feature 3)
  if (options.mode === 'minimal') {
    parts.push(
      `You are a spec improvement assistant. You will receive a specification that scored poorly on a quality lint, along with the specific gaps that were identified.

Your job is to MINIMALLY enhance the spec by appending ONLY the missing elements as bullet points at the end. Do NOT rewrite or restructure existing text. Preserve the original voice and wording exactly. Only ADD what's missing.`
    )
  } else {
    parts.push(
      `You are a spec improvement assistant. You will receive a specification that scored poorly on a quality lint, along with the specific gaps that were identified.

Your job is to REWRITE the spec to address each gap while preserving the developer's original intent and voice. Do not replace the spec — enhance it by adding the missing elements.`
    )
  }

  // Surgical rewrite (Feature 2)
  if (options.breakdown) {
    const failingDimensions = Object.entries(options.breakdown)
      .filter(([, passed]) => !passed)
      .map(([dim]) => dim)

    if (failingDimensions.length > 0) {
      parts.push(
        `\nIMPORTANT: Only modify the spec to address the FAILING dimensions listed below. Do NOT rewrite sections that already pass.

Failing dimensions to fix:
${failingDimensions.map((d) => `- ${d}`).join('\n')}`
      )
    }
  }

  // Standard gap guidance
  parts.push(
    `\nFor each gap, add concrete, specific content:
- "has_measurable_outcome": Add a quantifiable business outcome to the problem statement
- "has_testable_criteria": Add 2+ acceptance criteria starting with action verbs (Verify, Confirm, Validate, Check, Assert)
- "has_constraints": Add technical constraints, scope limits, or assumptions
- "no_vague_verbs": Make the title specific — replace "improve X" with what specifically changes
- "has_definition_of_done": Add specific states, values, or thresholds that define completion`
  )

  // Codebase context (Feature 1)
  if (options.codebaseContext) {
    const ctx = options.codebaseContext
    const contextParts: string[] = []
    if (ctx.stack?.length) contextParts.push(`Tech stack: ${ctx.stack.join(', ')}`)
    if (ctx.patterns?.length) contextParts.push(`Patterns: ${ctx.patterns.join(', ')}`)
    if (ctx.constraints?.length) contextParts.push(`Constraints: ${ctx.constraints.join(', ')}`)

    if (contextParts.length > 0) {
      parts.push(
        `\nCodebase context — reference these specific technologies in the rewrite:
${contextParts.join('\n')}

Use technology-specific language. For example, instead of "Verify database is updated", write "Verify Prisma migration runs without errors" if Prisma is in the stack.`
      )
    }
  }

  // Agent-specific guidance (Feature 5)
  if (options.targetAgent && options.targetAgent !== 'general') {
    const guidance = AGENT_GUIDANCE[options.targetAgent]
    if (guidance) {
      parts.push(`\nAgent-specific guidance (target: ${options.targetAgent}):\n${guidance}`)
    }
  }

  // Output format (Feature 4 — structured output)
  parts.push(
    `\nReturn ONLY valid JSON, no markdown fences:
{
  "rewritten": "the full improved spec text",
  "structured": {
    "title": "specific, actionable title",
    "problem": "clear problem statement with measurable outcome",
    "acceptanceCriteria": ["Verify X", "Confirm Y"],
    "constraints": ["constraint 1", "constraint 2"],
    "verificationSteps": ["step 1", "step 2"]
  },
  "changes": ["Category-level description of what was improved (e.g., 'Added measurable outcome to problem statement', 'Replaced vague verbs with specific actions', 'Added testable acceptance criteria'). IMPORTANT: Describe the TYPE of improvement, NOT the specific content. Do NOT quote or include the original or rewritten text in changes. Bad: 'Changed user clicks button to user submits form via POST /api/submit'. Good: 'Made user interaction step more specific and testable'."]
}`
  )

  return parts.join('\n')
}

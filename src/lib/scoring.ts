import type { RefinedItem } from '@/lib/schemas'

const VAGUE_VERBS = ['improve', 'enhance', 'optimize', 'update', 'fix']

const ACTION_VERB_RE = /^(given|when|then|user can|verify|confirm|ensure|check|assert|validate|the system|it should|should|must|display|show|return|redirect|allow|prevent|enable|disable|create|delete|update|send|receive|load|render|submit|click|navigate|log|track)/i

const DOD_RE = /\d+|logged in|returns? \d+|visible|enabled|disabled|less than|within|at least|greater than|no more than|exactly|complete|success|fail|error|approved|rejected|active|inactive/i

export function computeCompletenessScore(item: RefinedItem): { score: number; breakdown: Record<string, boolean> } {
  // has_measurable_outcome: problem field contains measurable/observable outcome
  const measurableRe = /\d+|measur|observ|track|monitor|reduc|increas|decreas|faster|slower|less|more|%|rate|time|count|number|metric|kpi/i
  const has_measurable_outcome = measurableRe.test(item.problem)

  // has_testable_criteria: at least 2 acceptance criteria starting with action verbs
  const ac = item.acceptanceCriteria ?? []
  const actionVerbCount = ac.filter(c => ACTION_VERB_RE.test(c.trim())).length
  const has_testable_criteria = actionVerbCount >= 2

  // has_constraints: tags >= 2 OR assumptions present and non-empty
  const has_constraints = (item.tags && item.tags.length >= 2) ||
    (Array.isArray(item.assumptions) && item.assumptions.length > 0)

  // no_vague_verbs: title does NOT contain vague verbs without specificity
  const titleWords = item.title.trim().split(/\s+/)
  const titleLower = item.title.toLowerCase()
  const hasVagueVerb = VAGUE_VERBS.some(v => titleLower.includes(v))
  let no_vague_verbs: boolean
  if (!hasVagueVerb) {
    no_vague_verbs = true
  } else if (titleWords.length < 4) {
    // Short title with vague verb = not specific enough
    no_vague_verbs = false
  } else {
    // Title is long enough — check if there's a specific noun beyond the vague verb
    // Remove vague verbs and see if something specific remains
    const withoutVague = VAGUE_VERBS.reduce((t, v) => t.replace(new RegExp(v, 'gi'), '').trim(), titleLower)
    no_vague_verbs = withoutVague.replace(/\s+/g, '').length >= 4 // some specificity remains
  }

  // has_definition_of_done: at least 1 AC mentions specific state/value/threshold
  const has_definition_of_done = ac.some(c => DOD_RE.test(c))

  const breakdown = {
    has_measurable_outcome,
    has_testable_criteria,
    has_constraints,
    no_vague_verbs,
    has_definition_of_done,
  }

  const score =
    (has_measurable_outcome ? 25 : 0) +
    (has_testable_criteria ? 25 : 0) +
    (has_constraints ? 20 : 0) +
    (no_vague_verbs ? 20 : 0) +
    (has_definition_of_done ? 10 : 0)

  return { score, breakdown }
}

export function isAgentReady(score: number): boolean {
  return score >= 70
}

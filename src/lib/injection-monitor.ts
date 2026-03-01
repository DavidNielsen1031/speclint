const INJECTION_PATTERNS = [
  { name: 'instruction_override', pattern: /(?:ignore|disregard|forget|override)\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|rules?)/i },
  { name: 'system_prompt_extraction', pattern: /(?:reveal|show|print|output|repeat|display)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?|rules?)/i },
  { name: 'role_play', pattern: /(?:you\s+are\s+now|act\s+as|pretend\s+(?:to\s+be|you\s+are)|from\s+now\s+on\s+you)/i },
  { name: 'delimiter_injection', pattern: /```(?:system|assistant|human)|<\/?(?:system|instruction|prompt)>/i },
  { name: 'jailbreak', pattern: /(?:DAN|do\s+anything\s+now|developer\s+mode|bypass\s+(?:filters?|safety|restrictions?))/i },
]

export function detectInjection(text: string): { detected: boolean; patterns: string[] } {
  const matched = INJECTION_PATTERNS.filter(p => p.pattern.test(text)).map(p => p.name)
  return { detected: matched.length > 0, patterns: matched }
}

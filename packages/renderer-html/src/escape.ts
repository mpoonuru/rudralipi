const htmlCharacters: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) => htmlCharacters[character] ?? character,
  )
}

export function isSafeLink(value: string): boolean {
  return /^(?:https?:|mailto:|tel:|\/|#)/i.test(value)
}

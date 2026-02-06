export function isEmptyResponseError(error: unknown): boolean {
  if (!(error instanceof SyntaxError)) {
    return false
  }
  return /unexpected end of/i.test(error.message)
}

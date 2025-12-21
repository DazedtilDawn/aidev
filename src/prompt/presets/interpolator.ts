/**
 * Interpolates variables into a template string.
 * 
 * @param template - The template string with {{variable}} placeholders.
 * @param variables - An object containing variable values.
 * @returns The interpolated string.
 * @throws Error if a variable is missing.
 */
export function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    if (!(key in variables)) {
      throw new Error(`Missing variable: ${key}`);
    }
    return variables[key]!;
  });
}

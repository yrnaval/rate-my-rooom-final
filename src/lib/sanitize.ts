/**
 * Utility functions for user input sanitization and XSS prevention.
 */

/**
 * Sanitizes text input by:
 * 1. Removing <script>...</script> tags and any embedded script content.
 * 2. Stripping '<' and '>' characters to prevent HTML tag injection.
 * 3. Trimming leading and trailing whitespace.
 * 4. Enforcing an optional maximum character length.
 */
export function sanitizeInput(input: string | null | undefined, maxLength?: number): string {
  if (!input) return '';
  let str = input.trim();
  
  // Strip <script>...</script> tags and anything inside them (case-insensitive)
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Strip '<' and '>' characters to eliminate tag injection
  str = str.replace(/[<>]/g, '');
  
  str = str.trim();
  
  if (typeof maxLength === 'number' && str.length > maxLength) {
    str = str.slice(0, maxLength).trim();
  }
  
  return str;
}

/**
 * Validates that an image or resource URL uses a safe web protocol (http or https).
 * Blocks dangerous schemes such as javascript:, data:text/html, etc.
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}


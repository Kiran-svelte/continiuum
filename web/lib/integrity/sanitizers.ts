/**
 * 🛡️ CONTINUUM INTEGRITY ENGINE - SANITIZERS
 * 
 * Input sanitization utilities for:
 * - XSS prevention
 * - SQL injection prevention
 * - HTML entity encoding
 * - Whitespace normalization
 * - Special character handling
 */

// ============================================================
// HTML/XSS SANITIZATION
// ============================================================

/** HTML entities for encoding */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Encode HTML entities to prevent XSS
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Strip all HTML tags from string
 */
export function stripHtml(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Remove potentially dangerous attributes from HTML
 */
export function sanitizeHtmlAttributes(str: string): string {
  const dangerousPatterns = [
    /on\w+\s*=/gi,                    // Event handlers
    /javascript:/gi,                   // JavaScript protocol
    /vbscript:/gi,                     // VBScript protocol
    /data:/gi,                         // Data protocol (can contain scripts)
    /expression\s*\(/gi,               // CSS expressions
    /-moz-binding/gi,                  // Firefox XBL
  ];

  let result = str;
  for (const pattern of dangerousPatterns) {
    result = result.replace(pattern, '');
  }
  return result;
}

/**
 * Comprehensive HTML sanitization
 */
export function sanitizeHtml(str: string, options?: {
  allowedTags?: string[];
  allowedAttributes?: string[];
}): string {
  const {
    allowedTags = ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'ul', 'ol', 'li'],
    allowedAttributes = ['class', 'id'],
  } = options || {};

  // First, sanitize dangerous attributes
  let result = sanitizeHtmlAttributes(str);

  // Create regex for allowed tags
  const allowedTagsRegex = new RegExp(
    `<(?!\\/?(${allowedTags.join('|')})\\b)[^>]+>`,
    'gi'
  );

  // Remove disallowed tags but keep their content
  result = result.replace(allowedTagsRegex, '');

  // Remove attributes not in allowlist from remaining tags
  if (allowedTags.length > 0) {
    const tagRegex = new RegExp(
      `<(${allowedTags.join('|')})([^>]*)>`,
      'gi'
    );
    result = result.replace(tagRegex, (match, tag, attrs) => {
      const cleanAttrs = attrs
        .replace(/\s*(\w+)\s*=\s*["'][^"']*["']/gi, (attrMatch: string, attrName: string) => {
          return allowedAttributes.includes(attrName.toLowerCase()) ? attrMatch : '';
        })
        .trim();
      return `<${tag}${cleanAttrs ? ' ' + cleanAttrs : ''}>`;
    });
  }

  return result;
}

// ============================================================
// STRING SANITIZATION
// ============================================================

/**
 * Normalize whitespace (collapse multiple spaces, trim)
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Remove all whitespace
 */
export function removeWhitespace(str: string): string {
  return str.replace(/\s/g, '');
}

/**
 * Sanitize for safe filename
 */
export function sanitizeFilename(str: string): string {
  return str
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')  // Remove invalid chars
    .replace(/^\.+/, '')                     // Remove leading dots
    .replace(/\.+$/, '')                     // Remove trailing dots
    .replace(/\s+/g, '_')                    // Replace spaces with underscores
    .substring(0, 255)                       // Limit length
    .trim();
}

/**
 * Sanitize for safe URL slug
 */
export function sanitizeSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')         // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')            // Remove non-alphanumeric
    .replace(/\s+/g, '-')                    // Replace spaces with hyphens
    .replace(/-+/g, '-')                     // Collapse multiple hyphens
    .replace(/^-|-$/g, '')                   // Remove leading/trailing hyphens
    .substring(0, 100);
}

/**
 * Sanitize user input for general use
 */
export function sanitizeInput(str: string): string {
  return escapeHtml(normalizeWhitespace(str));
}

/**
 * Sanitize for JSON string (escape special characters)
 */
export function sanitizeForJson(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// ============================================================
// SQL INJECTION PREVENTION
// ============================================================

/**
 * Escape special characters for SQL LIKE clauses
 * Note: Always use parameterized queries when possible!
 */
export function escapeSqlLike(str: string): string {
  return str
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/**
 * Validate string is safe for SQL identifiers (table/column names)
 */
export function isSafeSqlIdentifier(str: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str) && str.length <= 64;
}

/**
 * Sanitize for SQL identifier (if you must use dynamic names)
 * WARNING: Prefer parameterized queries when possible!
 */
export function sanitizeSqlIdentifier(str: string): string {
  const cleaned = str.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned || /^[0-9]/.test(cleaned)) {
    throw new Error('Invalid SQL identifier');
  }
  return cleaned.substring(0, 64);
}

// ============================================================
// NUMBER SANITIZATION
// ============================================================

/**
 * Parse number safely, returning undefined for invalid
 */
export function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/**
 * Parse integer safely
 */
export function parseInteger(value: unknown): number | undefined {
  const num = parseNumber(value);
  return num !== undefined ? Math.floor(num) : undefined;
}

/**
 * Clamp number to range
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Parse and clamp number
 */
export function parseClampedNumber(
  value: unknown,
  min: number,
  max: number,
  defaultValue: number
): number {
  const num = parseNumber(value);
  return num !== undefined ? clampNumber(num, min, max) : defaultValue;
}

// ============================================================
// EMAIL SANITIZATION
// ============================================================

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Extract domain from email
 */
export function getEmailDomain(email: string): string | null {
  const match = email.match(/@(.+)$/);
  return match ? match[1].toLowerCase() : null;
}

// ============================================================
// PHONE SANITIZATION
// ============================================================

/**
 * Normalize phone number (remove formatting)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string, countryCode = '+91'): string {
  const normalized = normalizePhone(phone);
  
  // If already has country code
  if (normalized.startsWith('+')) {
    return normalized;
  }
  
  // Add country code
  return `${countryCode}${normalized}`;
}

// ============================================================
// OBJECT SANITIZATION
// ============================================================

/**
 * Deep clone and sanitize object (remove functions, circular refs)
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  maxDepth = 10
): T {
  const seen = new WeakSet();

  function sanitizeValue(value: unknown, depth: number): unknown {
    if (depth > maxDepth) return '[Max Depth Exceeded]';
    
    if (value === null || value === undefined) return value;
    
    if (typeof value === 'function') return '[Function]';
    
    if (typeof value === 'string') return sanitizeInput(value);
    
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    
    if (value instanceof Date) return value.toISOString();
    
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item, depth + 1));
    }
    
    if (typeof value === 'object') {
      if (seen.has(value as object)) return '[Circular Reference]';
      seen.add(value as object);
      
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[sanitizeInput(key)] = sanitizeValue(val, depth + 1);
      }
      return result;
    }
    
    return String(value);
  }

  return sanitizeValue(obj, 0) as T;
}

/**
 * Pick only specified keys from object
 */
export function pickKeys<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specified keys from object
 */
export function omitKeys<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

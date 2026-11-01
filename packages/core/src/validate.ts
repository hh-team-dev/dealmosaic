/** Shared, dependency-free validation used by both the API and the forms. */

export const PASSWORD_MIN_LENGTH = 10;

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '1234567890', 'qwertyuiop', 'iloveyou',
  'letmein123', 'welcome123', 'admin12345', 'abcd123456', 'password1234',
  'dealmosaic', 'onepiece123',
]);

export interface FieldError {
  field: string;
  message: string;
}

export function validateEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email) return 'Enter your email address.';
  // Deliberately permissive: one @, a dot in the domain, no spaces. Over-strict
  // regexes reject valid addresses; the real verification is the emailed token.
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return 'That email address does not look right.';
  if (email.length > 254) return 'That email address is too long.';
  return null;
}

export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > 200) return 'That password is too long.';
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'That password is too common. Choose something less guessable.';
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (classes < 2) {
    return 'Mix at least two of: lowercase, uppercase, numbers, symbols.';
  }
  return null;
}

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Enter a name of at least 2 characters.';
  if (trimmed.length > 60) return 'Keep your name under 60 characters.';
  return null;
}

/** Indian PIN code — 6 digits, first digit 1–9. Used only when the user opts in
 *  to quick-commerce price comparison; never used for tracking. */
export function validatePincode(pin: string): string | null {
  if (!/^[1-9][0-9]{5}$/.test(pin.trim())) return 'Enter a valid 6-digit Indian PIN code.';
  return null;
}

export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (password.length >= 14) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'] as const;
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  return { score: clamped, label: labels[clamped] };
}

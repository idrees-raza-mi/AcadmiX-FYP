// Shared client-side input validation helpers.
// Each `isValid*` returns a boolean; empty values are treated as "valid"
// (optional) unless a field is explicitly required by the caller.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Pakistani mobile: 11 digits starting with 03, optionally a leading +92.
const PHONE_RE = /^(?:\+92|0)3\d{9}$/;
// CNIC: 13 digits, with or without dashes (xxxxx-xxxxxxx-x).
const CNIC_RE = /^\d{5}-?\d{7}-?\d$/;
// Roll number: letters, digits and dashes, 3–20 chars (e.g. BS-CS-2024-01).
const ROLL_RE = /^[A-Za-z0-9-]{3,20}$/;

export const isValidEmail = (v) => EMAIL_RE.test(String(v || '').trim());
export const isValidPhone = (v) => !v || PHONE_RE.test(String(v).trim());
export const isValidCnic  = (v) => !v || CNIC_RE.test(String(v).trim());
export const isValidRoll  = (v) => !v || ROLL_RE.test(String(v).trim());

export const MESSAGES = {
  email: 'Enter a valid email address',
  phone: 'Phone must be 11 digits starting with 03 (e.g. 03001234567)',
  cnic:  'CNIC must be 13 digits (e.g. 35201-1234567-1)',
  roll:  'Roll number may contain letters, digits and dashes (3–20 chars)',
};

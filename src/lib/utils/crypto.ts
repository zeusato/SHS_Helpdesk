/**
 * Simple obfuscation for API keys stored in localStorage.
 * Note: This is not military-grade encryption since the secret is client-side,
 * but it prevents the key from being visible in plain text.
 */

const SECRET_SALT = 'helpdesk-shapeup-v1'

export function encryptKey(text: string): string {
  try {
    const encoded = btoa(SECRET_SALT + text)
    return encoded.split('').reverse().join('')
  } catch (e) {
    return text
  }
}

export function decryptKey(encoded: string): string {
  try {
    const reversed = encoded.split('').reverse().join('')
    const decoded = atob(reversed)
    if (decoded.startsWith(SECRET_SALT)) {
      return decoded.replace(SECRET_SALT, '')
    }
    return encoded
  } catch (e) {
    return encoded
  }
}

/**
 * Base64 helpers.
 *
 * @internal
 */

/**
 * Encodes raw bytes to a standard base64 string.
 *
 * @param bytes - Bytes to encode.
 *
 * @returns The base64-encoded string.
 * @internal
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Decodes a base64 string to raw bytes. Whitespace and newlines are ignored, so PEM bodies can be
 * passed directly.
 *
 * @param value - Base64-encoded string.
 *
 * @returns The decoded bytes.
 * @throws {Error} When the input is not valid base64.
 * @internal
 */
export function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/[\s\r\n]/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/**
 * Encodes raw bytes to an unpadded base64url string.
 *
 * @param bytes - Bytes to encode.
 *
 * @returns The base64url-encoded string.
 * @internal
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

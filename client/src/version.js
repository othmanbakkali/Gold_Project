/**
 * Version actuelle du client (Mobile & Web)
 * Mettez à jour ces valeurs lors de la publication d'une nouvelle version de l'APK ou du web.
 */
export const APP_VERSION = '1.1.0';
export const APP_VERSION_CODE = 2;
export const APP_BUILD_DATE = '2026-10-03';

/**
 * Compare deux versions sémantiques (ex: '1.2.0' vs '1.1.0')
 * Retourne :
 *   1 si v1 > v2
 *  -1 si v1 < v2
 *   0 si v1 === v2
 */
export function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const parts1 = v1.toString().replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = v2.toString().replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

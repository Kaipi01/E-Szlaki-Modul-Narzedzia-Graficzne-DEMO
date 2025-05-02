/**
 * Dynamicznie importuje moduł ES6, pokazując postęp pobierania.
 *
 * @param {string} url – URL modułu JS do załadowania.
 * @param {(percent: number) => void} onProgress – callback z procentami (0–100).
 * @returns {Promise<any>} – namespace zaimportowanego modułu.
 */
export async function lazyImportModule(url, onProgress) {
  // 1. Wyślij request
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Błąd pobierania modułu: ${response.status} ${response.statusText}`);
  }

  // 2. Przygotuj reader i wielkość pliku
  const contentLengthHeader = response.headers.get('Content-Length');
  const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : NaN;
  const reader = response.body.getReader();

  // 3. Czytaj strumień i zbieraj kawałki
  let receivedBytes = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    receivedBytes += value.length;

    if (!isNaN(totalBytes)) {
      const percent = Math.round((receivedBytes / totalBytes) * 100);
      onProgress(percent);
    }
  }

  // 4. Zbuduj Blob i URL
  const blob = new Blob(chunks, { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);

  // 5. Dynamiczny import modułu z Blob URL
  const module = await import(blobUrl);

  // 6. Zwolnij URL i zwróć moduł
  URL.revokeObjectURL(blobUrl);

  return module;
}

/**
 * Ładuje zaimportowany moduł ES6, pokazuje postęp pobierania wraz z nazwą modułu.
 *
 * @param {string} url – URL modułu JS do załadowania.
 * @param {string} moduleName - nazwa modułu.
 * @param {(percent: number, module: string) => void} onProgress – callback z procentami (0–100).
 * @returns {object} – moduł.
 */
export async function loadModule(url, moduleName, onProgress) {
  // resetuj progress  
  onProgress(0, url)

  try {
    const module = await lazyImportModule(url, percent => onProgress(percent, url));
    // większość UMD/babelowanych modułów trafia do default
    const importedModule = module.default || module;

    console.log(`${moduleName} załadowany:`, importedModule)

    return importedModule;

  } catch (err) {
    console.error(`Błąd ładowania ${moduleName}:`, err);

    throw err;
  }
}
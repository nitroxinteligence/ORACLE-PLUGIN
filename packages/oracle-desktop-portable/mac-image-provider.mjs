const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const PNG = Buffer.from('89504e470d0a1a0a', 'hex');
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index; for (let i = 0; i < 8; i++) value = (value & 1) ? (value >>> 1) ^ 0xedb88320 : value >>> 1; return value >>> 0;
});
const bounded = (input, limit) => {
  if (!(input instanceof Uint8Array) || input.byteLength < 1 || input.byteLength > limit) fail('invalid_image_bytes', 'Imagem vazia ou fora do limite.');
  return Buffer.from(input);
};
function dimensions(width, height, side, pixels) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width > side || height > side || width * height > pixels) fail('invalid_image_dimensions', 'Dimensões de imagem fora do limite.');
}

/** Faithful structural gate from DesktopPluginExportBuffer.finish. This alone
 * never establishes decoded image validity: validatePNG also requires ImageIO. */
export function validatePNGStructure(input, { maxBytes = 32 * 1024 * 1024, maxDimension = 32768, maxPixels = 64_000_000 } = {}) {
  const bytes = bounded(input, maxBytes);
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG) || bytes.readUInt32BE(8) !== 13 || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') fail('invalid_png', 'Cabeçalho PNG inválido.');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  dimensions(width, height, maxDimension, maxPixels);
  let offset = 8, header = false, palette = false, image = false, imageEnded = false, imageBytes = 0, ended = false;
  while (offset < bytes.length) {
    if (bytes.length - offset < 12) fail('invalid_png', 'Bloco PNG truncado.');
    const length = bytes.readUInt32BE(offset);
    if (length > bytes.length - offset - 12) fail('invalid_png', 'Bloco PNG incompleto.');
    const typeBytes = bytes.subarray(offset + 4, offset + 8), type = typeBytes.toString('ascii'), crcOffset = offset + 8 + length;
    if (![...typeBytes].every(value => value >= 65 && value <= 90 || value >= 97 && value <= 122) || typeBytes[2] < 65 || typeBytes[2] > 90) fail('invalid_png', 'Tipo de bloco PNG inválido.');
    let crc = 0xffffffff;
    for (const byte of bytes.subarray(offset + 4, crcOffset)) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    if (((crc ^ 0xffffffff) >>> 0) !== bytes.readUInt32BE(crcOffset)) fail('invalid_png', 'CRC PNG inválido.');
    if (type === 'IHDR') {
      if (header || offset !== 8 || length !== 13) fail('invalid_png', 'Cabeçalho PNG duplicado.'); header = true;
    } else if (type === 'PLTE') {
      if (!header || palette || image || !length || length > 768 || length % 3) fail('invalid_png', 'Paleta PNG inválida.'); palette = true;
    } else if (type === 'IDAT') {
      if (!header || imageEnded || bytes[25] === 3 && !palette) fail('invalid_png', 'Dados PNG fora de ordem.'); image = true; imageBytes += length;
    } else if (type === 'IEND') {
      if (!header || !image || !imageBytes || length || crcOffset + 4 !== bytes.length) fail('invalid_png', 'Final PNG inválido.'); ended = true;
    } else {
      if (!header || !(typeBytes[0] & 32)) fail('invalid_png', 'Bloco crítico PNG não suportado.'); if (image) imageEnded = true;
    }
    offset = crcOffset + 4;
  }
  if (!ended) fail('invalid_png', 'PNG incompleto.');
  return Object.freeze({ width, height });
}

/** Public Apple C ABI only. Constants are loaded as exported pointer globals,
 * not invented CFString spellings. Null dictionary callbacks are deliberate:
 * global keys/booleans and owned numbers stay alive until dictionary release.
 * No callback C/ObjC block, GUI, JIT-thread callback or own dylib is required. */
export function createMacImageBindings(ffi) {
  if (!ffi?.dlopen || !ffi.ptr || !ffi.toArrayBuffer || !ffi.read?.ptr) fail('host_capability_unsupported', 'Bun ImageIO FFI indisponível.');
  const CF = '/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation';
  const IIO = '/System/Library/Frameworks/ImageIO.framework/ImageIO';
  const CG = '/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics';
  let cf, imageIO, graphics, loader;
  try {
    cf = ffi.dlopen(CF, {
      CFDataCreate: { args: ['ptr', 'ptr', 'i64'], returns: 'ptr' }, CFDataCreateMutable: { args: ['ptr', 'i64'], returns: 'ptr' },
      CFDataGetLength: { args: ['ptr'], returns: 'i64' }, CFDataGetBytePtr: { args: ['ptr'], returns: 'ptr' },
      // CFNumber/CFString may be tagged pointers with all 64 bits significant.
      // Bun ptr's JS Number representation loses those bits. u64/BigInt keeps
      // opaque refs exact in the same ARM64 integer register ABI as a pointer.
      CFRelease: { args: ['u64'], returns: 'void' }, CFStringCreateWithCString: { args: ['ptr', 'ptr', 'u32'], returns: 'u64' },
      CFStringGetCString: { args: ['u64', 'ptr', 'i64', 'u32'], returns: 'u8' },
      CFDictionaryCreateMutable: { args: ['ptr', 'i64', 'ptr', 'ptr'], returns: 'ptr' }, CFDictionarySetValue: { args: ['ptr', 'ptr', 'u64'], returns: 'void' },
      CFDictionaryGetValue: { args: ['ptr', 'ptr'], returns: 'u64' },
      CFNumberCreate: { args: ['ptr', 'i64', 'ptr'], returns: 'u64' }, CFNumberGetValue: { args: ['u64', 'i64', 'ptr'], returns: 'u8' },
    }).symbols;
    imageIO = ffi.dlopen(IIO, {
      CGImageSourceCreateWithData: { args: ['ptr', 'ptr'], returns: 'ptr' }, CGImageSourceGetType: { args: ['ptr'], returns: 'u64' },
      CGImageSourceGetCount: { args: ['ptr'], returns: 'u64' }, CGImageSourceGetStatus: { args: ['ptr'], returns: 'i32' },
      CGImageSourceGetStatusAtIndex: { args: ['ptr', 'u64'], returns: 'i32' }, CGImageSourceCopyPropertiesAtIndex: { args: ['ptr', 'u64', 'ptr'], returns: 'ptr' },
      CGImageSourceCreateImageAtIndex: { args: ['ptr', 'u64', 'ptr'], returns: 'ptr' }, CGImageSourceCreateThumbnailAtIndex: { args: ['ptr', 'u64', 'ptr'], returns: 'ptr' },
      CGImageDestinationCreateWithData: { args: ['ptr', 'u64', 'u64', 'ptr'], returns: 'ptr' }, CGImageDestinationAddImage: { args: ['ptr', 'ptr', 'ptr'], returns: 'void' },
      CGImageDestinationFinalize: { args: ['ptr'], returns: 'bool' },
    }).symbols;
    graphics = ffi.dlopen(CG, { CGImageGetWidth: { args: ['ptr'], returns: 'u64' }, CGImageGetHeight: { args: ['ptr'], returns: 'u64' }, CGImageRelease: { args: ['ptr'], returns: 'void' } }).symbols;
    loader = ffi.dlopen('/usr/lib/libSystem.B.dylib', { dlopen: { args: ['ptr', 'i32'], returns: 'ptr' }, dlsym: { args: ['ptr', 'ptr'], returns: 'ptr' } }).symbols;
  } catch { fail('host_capability_unsupported', 'Frameworks ImageIO indisponíveis.'); }
  const handles = new Map(), globals = new Map();
  function global(library, name) {
    const id = library + ':' + name; if (globals.has(id)) return globals.get(id);
    if (!handles.has(library)) { const handle = loader.dlopen(ffi.ptr(Buffer.from(library + '\0')), 1); if (!handle) fail('host_capability_unsupported', 'Framework Apple indisponível.'); handles.set(library, handle); }
    const address = loader.dlsym(handles.get(library), ffi.ptr(Buffer.from(name + '\0'))), value = address ? ffi.read.ptr(address) : null;
    if (!value) fail('host_capability_unsupported', 'Constante ImageIO indisponível.'); globals.set(id, value); return value;
  }
  const bool = value => global(CF, value ? 'kCFBooleanTrue' : 'kCFBooleanFalse');
  const text = pointer => {
    const bytes = Buffer.alloc(256); if (!pointer || !cf.CFStringGetCString(pointer, ffi.ptr(bytes), 256n, 0x08000100)) fail('invalid_image_source', 'Formato de imagem inválido.');
    const end = bytes.indexOf(0); if (end < 0) fail('invalid_image_source', 'Formato fora do limite.'); return bytes.subarray(0, end).toString('utf8');
  };
  return Object.freeze({
    openSource(input) {
      const bytes = bounded(input, 32 * 1024 * 1024), retained = []; let source, closed = false;
      const own = value => { if (!value) fail('invalid_image_source', 'Recurso de imagem indisponível.'); retained.push(value); return value; };
      const close = () => { if (!closed) { closed = true; for (const value of retained.reverse()) cf.CFRelease(value); retained.length = 0; } };
      const active = () => { if (closed) fail('image_source_closed', 'Imagem encerrada.'); };
      function options(entries) {
        const numbers = new Map();
        for (const [key, value] of entries) if (typeof value === 'number') { const data = Int32Array.of(value); numbers.set(key, own(cf.CFNumberCreate(null, 3n, ffi.ptr(data)))); }
        const dictionary = own(cf.CFDictionaryCreateMutable(null, 0n, null, null));
        for (const [key, value] of entries) cf.CFDictionarySetValue(dictionary, global(IIO, key), typeof value === 'boolean' ? bool(value) : numbers.get(key));
        return dictionary;
      }
      const rasterSize = image => ({ width: Number(graphics.CGImageGetWidth(image)), height: Number(graphics.CGImageGetHeight(image)) });
      try {
        const data = own(cf.CFDataCreate(null, ffi.ptr(bytes), BigInt(bytes.length)));
        source = own(imageIO.CGImageSourceCreateWithData(data, options([['kCGImageSourceShouldCache', false]])));
        return Object.freeze({
          describe() {
            active(); const properties = own(imageIO.CGImageSourceCopyPropertiesAtIndex(source, 0n, null));
            const getNumber = key => { const value = cf.CFDictionaryGetValue(properties, global(IIO, key)), data = new Int32Array(1); if (!value || !cf.CFNumberGetValue(value, 3n, ffi.ptr(data))) fail('invalid_image_dimensions', 'Dimensões indisponíveis.'); return data[0]; };
            return { type: text(imageIO.CGImageSourceGetType(source)), count: Number(imageIO.CGImageSourceGetCount(source)), status: imageIO.CGImageSourceGetStatus(source), statusAtIndex: imageIO.CGImageSourceGetStatusAtIndex(source, 0n), width: getNumber('kCGImagePropertyPixelWidth'), height: getNumber('kCGImagePropertyPixelHeight') };
          },
          decode() {
            active(); const image = imageIO.CGImageSourceCreateImageAtIndex(source, 0n, options([['kCGImageSourceShouldCacheImmediately', true]]));
            if (!image) fail('image_decode_failed', 'Decode completo da imagem falhou.');
            try { return rasterSize(image); } finally { graphics.CGImageRelease(image); }
          },
          thumbnail() {
            active(); const image = imageIO.CGImageSourceCreateThumbnailAtIndex(source, 0n, options([['kCGImageSourceCreateThumbnailFromImageAlways', true], ['kCGImageSourceThumbnailMaxPixelSize', 960], ['kCGImageSourceCreateThumbnailWithTransform', true], ['kCGImageSourceShouldCacheImmediately', false]]));
            if (!image) fail('image_decode_failed', 'Não foi possível gerar a capa.');
            try {
              const size = rasterSize(image); dimensions(size.width, size.height, 960, 960 * 960);
              const output = own(cf.CFDataCreateMutable(null, 0n));
              const type = own(cf.CFStringCreateWithCString(null, ffi.ptr(Buffer.from('public.png\0')), 0x08000100));
              const destination = own(imageIO.CGImageDestinationCreateWithData(output, type, 1n, null));
              imageIO.CGImageDestinationAddImage(destination, image, null);
              if (!imageIO.CGImageDestinationFinalize(destination)) fail('image_encode_failed', 'A capa PNG não foi finalizada.');
              const length = Number(cf.CFDataGetLength(output));
              if (!Number.isSafeInteger(length) || length < 1 || length >= 4_000_000) fail('invalid_image_bytes', 'Capa PNG fora do limite.');
              const pointer = cf.CFDataGetBytePtr(output); if (!pointer) fail('image_encode_failed', 'Capa PNG vazia.');
              return Buffer.from(new Uint8Array(ffi.toArrayBuffer(pointer, 0, length)));
            } finally { graphics.CGImageRelease(image); }
          }, close,
        });
      } catch (error) { close(); throw error; }
    },
  });
}

export async function loadMacImageBindings() {
  if (process.platform !== 'darwin' || process.arch !== 'arm64' || process.versions.bun !== '1.3.10') fail('host_capability_unsupported', 'ImageIO exige macOS arm64 e Bun 1.3.10 revisado.');
  let ffi; try { ffi = await import('bun:ffi'); } catch { fail('host_capability_unsupported', 'Bun FFI indisponível.'); }
  return createMacImageBindings(ffi);
}

/** Bytes-only trusted composition. Vault paths/admission/epoch remain caller-owned. */
export function createMacImageProvider({ platform = process.platform, bindings, loadBindings = loadMacImageBindings } = {}) {
  let loading;
  const get = async () => {
    if (platform !== 'darwin') fail('host_capability_unsupported', 'ImageIO macOS indisponível.');
    const value = bindings ?? await (loading ??= loadBindings()); if (typeof value?.openSource !== 'function') fail('host_capability_unsupported', 'Decoder ImageIO indisponível.'); return value;
  };
  const validatePNG = async input => {
    const bytes = bounded(input, 32 * 1024 * 1024), expected = validatePNGStructure(bytes), source = (await get()).openSource(bytes);
    try {
      const info = source.describe();
      if (info.type !== 'public.png' || info.count !== 1 || info.status !== 0 || info.statusAtIndex !== 0) fail('image_decode_failed', 'ImageIO não confirmou PNG completo e único.');
      const image = source.decode(); if (image.width !== expected.width || image.height !== expected.height) fail('image_decode_failed', 'Dimensões decodificadas divergentes.');
      return Object.freeze({ ...expected, complete: true, type: info.type, count: info.count, decodeVerified: true });
    } finally { source.close(); }
  };
  return Object.freeze({ validatePNG, async imageThumbnail(request) {
    if (!request || !(request.bytes instanceof Uint8Array)) fail('invalid_image_bytes', 'Imagem inválida.');
    if (typeof request.extension !== 'string' || !['.png', '.jpg', '.jpeg', '.gif', '.heic', '.heif', '.webp'].includes(request.extension.toLowerCase())) fail('host_capability_unsupported', 'SVG exige provider AppKit separado; formato não suportado.');
    const bytes = bounded(request.bytes, 16_000_000), source = (await get()).openSource(bytes); let output;
    try {
      const info = source.describe();
      if (!['public.png', 'public.jpeg', 'com.compuserve.gif', 'public.heic', 'public.heif', 'org.webmproject.webp'].includes(info.type) || !Number.isSafeInteger(info.count) || info.count < 1 || info.status !== 0 || info.statusAtIndex !== 0) fail('invalid_image_source', 'Formato ou fonte incompleta.');
      dimensions(info.width, info.height, 16384, 67_108_864);
      output = bounded(source.thumbnail(), 3_999_999);
    } finally { source.close(); }
    const size = validatePNGStructure(output, { maxBytes: 3_999_999, maxDimension: 960, maxPixels: 960 * 960 });
    const proof = await validatePNG(output); if (proof.width !== size.width || proof.height !== size.height) fail('image_decode_failed', 'Capa PNG inválida.');
    return output;
  } });
}

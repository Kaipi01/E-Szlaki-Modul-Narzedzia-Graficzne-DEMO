const GRAPHICS_TOOLS_MODULE = {
  ID: 'graphics-tools-module',
  COMPRESSOR_ID: 'graphics-tools-module-compressor',
  CONVERTER_ID: 'graphics-tools-module-converter',
  EDITOR_ID: 'graphics-tools-module-editor',
  CONFIRM_MODAL_ID: 'graphics-tools-module-confirm-modal',
  IMAGE_MAX_SIZE: 100 * 1024 * 1024, // 100MB
  IMAGE_ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/tiff'],
  MAX_BATCH_SIZE: 10,
  MAX_BATCH_SIZE_BYTES: 100 * 1024 * 1024,
  MAX_CONCURRENT_UPLOADS: 1
}

export {
  GRAPHICS_TOOLS_MODULE
};
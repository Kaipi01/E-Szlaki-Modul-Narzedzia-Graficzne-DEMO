const GRAPHICS_TOOLS_MODULE = {
    ID: 'graphics-tools-module',
    COMPRESSOR_ID: 'graphics-tools-module-compressor',
    CONVERTER_ID: 'graphics-tools-module-converter',
    EDITOR_ID: 'graphics-tools-module-editor',
    IMAGE_MAX_SIZE: 100 * 1024 * 1024, // 100MB
    IMAGE_ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
    MAX_BATCH_SIZE: 10,
    MAX_BATCH_SIZE_BYTES: 100 * 1024 * 1024, 
    MAX_CONCURRENT_UPLOADS: 3
}

export {
    GRAPHICS_TOOLS_MODULE
};
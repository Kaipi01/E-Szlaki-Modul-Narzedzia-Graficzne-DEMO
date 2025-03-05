const GRAPHICS_TOOLS_MODULE = {
    ID: 'graphics-tools-module',
    COMPRESSOR_ID: 'graphics-tools-module-compressor',
    IMAGE_MAX_SIZE: 50 * 1024 * 1024, // 50MB
    IMAGE_ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
    MAX_BATCH_SIZE: 10,
    MAX_BATCH_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
    MAX_CONCURRENT_UPLOADS: 3
}

export {
    GRAPHICS_TOOLS_MODULE
};
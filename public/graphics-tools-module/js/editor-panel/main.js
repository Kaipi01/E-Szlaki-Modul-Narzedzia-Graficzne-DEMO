import ThemeSwitcher from "../modules/ThemeSwitcher.js"
import EditorPanel from "./EditorPanel.js";
import { GRAPHICS_TOOLS_MODULE } from "../utils/constants.js"; 


document.addEventListener('DOMContentLoaded', () => {
    const { EDITOR_ID, IMAGE_ALLOWED_TYPES, IMAGE_MAX_SIZE } = GRAPHICS_TOOLS_MODULE
    
    new EditorPanel("#" + EDITOR_ID, {
        exportImageUrl: EXPORT_IMAGE_URL,
        getImageDataUrl: GET_IMAGE_DATA_URL,
        maxFileSize: IMAGE_MAX_SIZE,
        allowedTypes: IMAGE_ALLOWED_TYPES
    }) 
})


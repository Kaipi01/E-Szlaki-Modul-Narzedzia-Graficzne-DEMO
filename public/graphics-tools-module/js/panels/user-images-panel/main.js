import ThemeSwitcher from "../../modules/ThemeSwitcher.js" 
import SearchForm from "../../modules/SearchForm.js"
import ImagesGalleryModal from "../../modules/ImagesGallery.js"
import UserImagesPanel from "./UserImagesPanel.js";

document.addEventListener('DOMContentLoaded', () => {
  
  new UserImagesPanel({
    containerSelector: '#graphics-tools-module-user-images-panel',
    apiUrl: GET_USER_IMAGES_JSON,
    perPage: 12,
    scrollThreshold: 200
  });
})
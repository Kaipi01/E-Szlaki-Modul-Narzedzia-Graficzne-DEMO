import ThemeSwitcher from "../../modules/ThemeSwitcher.js" 
import SearchForm from "../../modules/SearchForm.js"
import ImagesGalleryModal from "../../modules/ImagesGallery.js"
import UserImagesPanel from "./UserImagesPanel.js";

document.addEventListener('DOMContentLoaded', () => {
  
  new UserImagesPanel(document.querySelector('#graphics-tools-module-user-images-panel'), {
    getUserImagesUrl: GET_USER_IMAGES_JSON,
    removeUserImageUrl: REMOVE_USER_IMAGE_JSON,
    removeAllUserImagesUrl: REMOVE_ALL_USER_IMAGES_JSON,
    perPage: 12,
    scrollThreshold: 200
  });
})
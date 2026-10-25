// Import all help illustrations
// Using relative paths to avoid path alias issues
const wysiwyg = new URL("./wysiwyg-editor.svg", import.meta.url).href;
const mediaUpload = new URL("./media-upload.svg", import.meta.url).href;
const navigationMenu = new URL("./navigation-menu.svg", import.meta.url).href;
const categoryManagement = new URL("./category-management.svg", import.meta.url)
  .href;
const contentManagement = new URL("./content-management.svg", import.meta.url)
  .href;

// Export them as a single object for easy access
export const helpIllustrations = {
  wysiwyg,
  mediaUpload,
  navigationMenu,
  categoryManagement,
  contentManagement,
};

export default helpIllustrations;

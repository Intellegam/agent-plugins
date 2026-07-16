// Asset imports resolve to a URL string. The build (vite-plugin-singlefile, assetsInlineLimit
// `() => true`) inlines each one as a base64 data: URI, so tour.html stays a single offline file.
// During the server render step Bun returns the file path instead — harmless, since the overlay
// that uses these renders nothing until a click in the browser.
declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.mp3" {
  const src: string;
  export default src;
}

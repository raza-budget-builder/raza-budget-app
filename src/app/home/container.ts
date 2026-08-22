// Single source of truth for the landing page's section width. 1200px
// (code-x.ai's own container) reads fine on a 13-15" laptop but leaves huge
// dead gutters on a real desktop monitor (on a 2560px-wide screen, 1200px
// content is under half the page) — bumped to 1440px, still centered and
// still far narrower than the app's own max-w-5xl (1024px) convention used
// elsewhere, but enough to actually read as a desktop site rather than a
// mobile layout stretched into a frame.
export const CONTAINER_CLASS = "mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12";

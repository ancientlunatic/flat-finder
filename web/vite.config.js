// The Google Maps key lives in the repo-root .env as MAP_JAVASCRIPT_KEY (no VITE_ prefix), so point Vite there.
export default { envDir: '..', envPrefix: ['VITE_', 'MAP_JAVASCRIPT_KEY'] };

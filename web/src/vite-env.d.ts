/// <reference types="vite/client" />

declare const pannellum: {
  viewer: (
    container: string | HTMLElement,
    config: Record<string, unknown>,
  ) => { destroy: () => void };
};

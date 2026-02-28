/**
 * Vitest setup file — global mocks and matchers for frontend tests.
 */

import '@testing-library/jest-dom/vitest';

/* ---------- localStorage stub ---------- */
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] ?? null),
        setItem: vi.fn((key, value) => { store[key] = String(value); }),
        removeItem: vi.fn((key) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        get length() { return Object.keys(store).length; },
        key: vi.fn((i) => Object.keys(store)[i] ?? null),
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

/* ---------- import.meta.env defaults ---------- */
// Vitest already exposes import.meta.env; provide a fallback API URL.
if (!import.meta.env.VITE_API_URL) {
    import.meta.env.VITE_API_URL = 'http://localhost:8000/api/v1';
}

/* ---------- global fetch stub ---------- */
globalThis.fetch = vi.fn();

/* ---------- Leaflet / canvas stubs ---------- */
// Leaflet expects a DOM canvas; stub getContext so MapContainer doesn't explode.
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    canvas: { width: 0, height: 0 },
}));

/* ---------- DOM API stubs ---------- */
// scrollIntoView is not implemented in JSDOM.
Element.prototype.scrollIntoView = vi.fn();

/* ---------- Reset between tests ---------- */
beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    fetch.mockReset();
});

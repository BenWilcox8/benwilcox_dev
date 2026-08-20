import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

// The jsdom that ships with react-scripts predates TextEncoder being part of
// the web platform it emulates, and react-router reaches for it on import.
// Node has had both for years, so they are handed straight over.
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;

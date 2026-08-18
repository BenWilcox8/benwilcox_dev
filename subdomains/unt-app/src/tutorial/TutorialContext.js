import { createContext } from 'react';

// `restart` is null wherever the tutorial is not mounted - on the mobile
// layout, for instance - so a consumer can tell whether to offer it at all.
export const TutorialContext = createContext({
  active: false,
  restart: null,
});

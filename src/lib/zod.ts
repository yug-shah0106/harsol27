import { z } from "zod";

// Our CSP has no 'unsafe-eval', so zod's test for it (`new Function("")`) is blocked. zod catches that, but Firefox
// still reports it as a console error on every page with a form. `jitless` skips the test; parsing is unchanged.
z.config({ jitless: true });

export { z };

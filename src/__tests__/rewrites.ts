import { isGlob } from "../rewrites";

// Globs
test.each([
    '/',
    '/public/',
    '/!(public)',
    '/public/*',
    '/spaces/**',
])('isGlob("%s")', (expr: string) => {
    expect(isGlob(expr)).toBe(true);
});

// NON Globs
test.each([
    '/about',
    '/public/js/main.js'
])('NOT isGlob("%s")', (expr: string) => {
    expect(isGlob(expr)).toBe(false);
});

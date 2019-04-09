import { isGlob, matcher, globToRegex } from "../globs";

// Globs
test.each([
    '/',
    '/public/',
    '/!(public)',
    '/public/*',
    '/spaces/**',
    '*.gitbook.com',
])('isGlob("%s")', (expr: string) => {
    expect(isGlob(expr)).toBe(true);
});

// NON Globs
test.each([
    '/about',
    '/public/js/main.js',
    'docs.gitbook.com',
])('NOT isGlob("%s")', (expr: string) => {
    expect(isGlob(expr)).toBe(false);
});

// Valid matches
test.each([
    [
        '*.gitbook.com',
        ['www.gitbook.com', 'docs.gitbook.com', 'app.gitbook.com']
    ],
    [
        'www.google.fr',
        ['www.google.fr']
    ],
])('MATCH("%s")', (expr: string, values: Array<string>) => {
    const matchesAll = values.every(matcher(expr));
    expect(matchesAll).toBe(true);
});

// Invalid matches
test.each([
    [
        '*.gitbook.com',
        ['www.google.fr', 'www.example.com', 'google.com']
    ],
    [
        'www.google.fr',
        ['amazon.com']
    ],
])('NOT MATCH("%s")', (expr: string, values: Array<string>) => {
    const matchesAny = values.some(matcher(expr));
    expect(matchesAny).toBe(false);
});

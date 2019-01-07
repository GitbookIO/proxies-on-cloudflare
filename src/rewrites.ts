import { FirebaseRewrites } from './types'

interface GlobMatch {
    regex: RegExp,
    function: string,
}

interface ExactMatches {
    [key: string]: string,
}

export class Matcher {
    globs: GlobMatch[];
    exacts: ExactMatches;

    constructor(rewrites: FirebaseRewrites) {
        // List of glob patterns (tansformed to regexes)
        this.globs = rewrites
            .filter(r => isGlob(r.source))
            .map(r => ({
                regex: globToRegex(r.source),
                function: r.function,
            }));

        // Dict of exact matches
        this.exacts = rewrites
            .filter(r => !isGlob(r.source))
            .reduce<ExactMatches>((accu, r) => {
                accu[r.source] = r.function;
                return accu;
            }, {});
    }

    // Matching function, converting path to func name, null if no match
    match(path: string): (string | null) {
        // Try exact match
        if (path in this.exacts) {
            return this.exacts[path];
        }

        // Globs
        for (let i = 0; i < this.globs.length; i++) {
            if (this.globs[i].regex.test(path)) {
                return this.globs[i].function;
            }
        }

        // No function found
        return null;
    }
}

// isGlob returns true if a string looks like a glob pattern
export function isGlob(str: string): boolean {
    // Contains either
    // 1. "!(negation)""
    // 2. "*" glob stars
    // 3. Ends with /
    return /\!\(\S+?\)|\*\*|\*|(?:\/$)/.test(str);
}

// pathGlobToRegex converts a glob (firebase hosting "source") to a regex
export function globToRegex(str: string): RegExp {
    const expr = str
        // Ensure path starts with '/'
        .replace(/^\/?/, '/')
        // Escape slashes and dots
        .replace(/\//g, '\\/')
        .replace(/\./, '\\.')
        // Transform negative expressions
        .replace(/\!\((\S+?)\)/, "(?!$1).*?")
        // Transform glob at end
        .replace(/\*\*$/, '.*')
        .replace(/\*\*\/\*/, '.*')

    // Add delimiters and
    return new RegExp(`^${expr}\$`);
}

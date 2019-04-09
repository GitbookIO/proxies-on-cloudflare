import { FirebaseRewrites } from './types'
import { isGlob, globToRegex } from './globs';

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
                regex: globToRegex(pathGlob(r.source)),
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

// pathGlob ensure that all path glob expressions start with a /
function pathGlob(expr: string): string {
    // Ensure path starts with '/'
    return expr.replace(/^\/?/, '/');
}

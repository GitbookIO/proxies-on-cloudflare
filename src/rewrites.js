// rewritesMatcher builds a matching func that converts URL paths to cloud func names
export function rewritesMatcher(rewrites) {
    // Dict of exact matches (map[path]function_name)
    const exact = rewrites.filter(r => !isGlob(r.source)).reduce((accu, r) => {
        accu[r.source] = r.function;
        return accu;
    }, {});

    // List of glob patterns (tansformed to regexes)
    const globs = rewrites.filter(r => isGlob(r.source)).map(r => ({
        regex: pathGlobToRegex(r.source),
        function: r.function,
    }));

    // Matching function, converting path to func name
    return function matcher(path) {
        // Try exact match
        if (path in exact) {
            return exact[path];
        }

        // Globs
        for (let i = 0; i < globs.length; i++) {
            if (globs[i].regex.test(path)) {
                return globs[i].function;
            }
        }

        // No function found
        return null;
    }
}

// isGlob returns true if a string looks like a glob pattern
export function isGlob(str) {
    // Contains either
    // 1. "!(negation)""
    // 2. "*" glob stars
    // 3. Ends with /
    return /\!\(\S+?\)|\*\*|\*|(?:\/$)/.test(str);
}

// pathGlobToRegex converts a glob (firebase hosting "source") to a regex
export function pathGlobToRegex(str) {
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

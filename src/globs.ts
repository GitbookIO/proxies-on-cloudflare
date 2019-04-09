// isGlob returns true if a string looks like a glob pattern
export function isGlob(str: string): boolean {
    // Contains either
    // 1. "!(negation)""
    // 2. "*" glob stars
    // 3. Ends with /
    return /\!\(\S+?\)|\*\*|\*|(?:\/$)/.test(str);
}

// globToRegex converts a glob expression to a regex
export function globToRegex(str: string): RegExp {
    const expr = str
        // Escape slashes and dots
        .replace(/\//g, '\\/')
        .replace(/\./, '\\.')
        // Transform negative expressions
        .replace(/\!\((\S+?)\)/, "(?!$1).*?")
        // Transform glob at start
        .replace(/^\*+/, '^.*?')
        // Transform glob at end
        .replace(/\*\*$/, '.*')
        .replace(/\*\*\/\*/, '.*')

    // Add delimiters and
    return new RegExp(`^${expr}\$`);
}

export function matcher(expr: string): (str: string) => boolean {
    const regex = globToRegex(expr);
    return (str: string) => regex.test(str);
}

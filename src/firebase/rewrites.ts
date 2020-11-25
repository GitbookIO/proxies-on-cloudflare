import { globToRegex, isGlob } from "../globs";
import { FirebaseRewrites } from "./types";

interface GlobMatch {
  regex: RegExp;
  function: string;
}

interface ExactMatches {
  [key: string]: string;
}

export class Matcher {
  public globs: GlobMatch[];
  public exacts: ExactMatches;

  constructor(rewrites: FirebaseRewrites) {
    // List of glob patterns (tansformed to regexes)
    this.globs = rewrites.reduce((accu, r) => {
      if (isGlob(r.source) && r.function) {
        accu.push({
          regex: globToRegex(pathGlob(r.source)),
          function: r.function,
        });
      }
      return accu;
    }, [] as GlobMatch[]);

    // Dict of exact matches
    this.exacts = rewrites.reduce((accu, r) => {
      if (!isGlob(r.source) && r.function) {
        accu[r.source] = r.function;
      }
      return accu;
    }, {} as ExactMatches);
  }

  // Matching function, converting path to func name, null if no match
  public match(path: string): string | null {
    // Try exact match
    if (path in this.exacts) {
      return this.exacts[path];
    }

    // Globs
    for (const glob of this.globs) {
      if (glob.regex.test(path)) {
        return glob.function;
      }
    }

    // No function found
    return null;
  }
}

// pathGlob ensure that all path glob expressions start with a /
function pathGlob(expr: string): string {
  // Ensure path starts with '/'
  return expr.replace(/^\/?/, "/");
}

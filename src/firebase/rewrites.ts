import pm from 'picomatch';
import { isGlob } from '../globs';
import { FirebaseRewrites } from './types';

interface FunctionMatch {
  function: string;
}

interface DestinationMatch {
  destination: string;
}

type RewriteMatch = FunctionMatch | DestinationMatch;

interface GlobMatch {
  // Matcher for a path
  matcher: (path: string) => boolean;
  match: RewriteMatch;
}

interface ExactMatches {
  [path: string]: RewriteMatch;
}

export class Matcher {
  public globs: GlobMatch[];
  public exacts: ExactMatches;

  constructor(rewrites: FirebaseRewrites) {
    // List of glob patterns (tansformed to regexes)
    this.globs = rewrites
      .filter(r => isGlob(r.source))
      .map(r => ({
        matcher: pm(r.source),
        match:
          'function' in r
            ? { function: r.function }
            : { destination: r.destination }
      }));

    // Dict of exact matches
    this.exacts = rewrites
      .filter(r => !isGlob(r.source))
      .reduce<ExactMatches>((accu, r) => {
        accu[r.source] =
          'function' in r
            ? { function: r.function }
            : { destination: r.destination };
        return accu;
      }, {});
  }

  // Matching function, converting path to func name, null if no match
  public match(path: string): RewriteMatch | null {
    // Try exact match
    if (path in this.exacts) {
      return this.exacts[path];
    }

    // Globs
    for (const glob of this.globs) {
      if (glob.matcher(path)) {
        return glob.match;
      }
    }

    // No function found
    return null;
  }
}

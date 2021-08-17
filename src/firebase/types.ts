export interface FirebaseConfig {
  rewrites: FirebaseRewrites;
}

export interface FirebaseRewrites extends Array<FirebaseRewrite> {}

export interface FirebaseFunctionRewrite {
  source: string;
  function: string;
}

export interface FirebaseDestinationRewrite {
  source: string;
  destination: string;
}

export type FirebaseRewrite =
  | FirebaseFunctionRewrite
  | FirebaseDestinationRewrite;

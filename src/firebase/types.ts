export interface FirebaseConfig {
  rewrites: FirebaseRewrites;
}

export interface FirebaseRewrites extends Array<FirebaseRewrite> {}

export interface FirebaseRewrite {
  source: string;
  function: string;
}

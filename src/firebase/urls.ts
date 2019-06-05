export function cloudfuncHost(projectID: string): URL {
  return new URL(`https://us-central1-${projectID}.cloudfunctions.net/`);
}

export function cloudfuncEndpoint(projectID: string, name: string): URL {
  return new URL(`https://us-central1-${projectID}.cloudfunctions.net/${name}`);
}

export function fbhostingEndpoint(projectID: string): URL {
  return new URL(`https://${projectID}.firebaseapp.com`);
}

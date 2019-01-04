
export function cloudfuncHost(projectID) {
    return new URL(`https://us-central1-${projectID}.cloudfunctions.net/`);
}

export function cloudfuncEndpoint(projectID, name) {
    return new URL(`https://us-central1-${projectID}.cloudfunctions.net/${name}`);
}

export function fbhostingEndpoint(projectID) {
    return new URL(`https://${projectID}.firebaseapp.com`);
}

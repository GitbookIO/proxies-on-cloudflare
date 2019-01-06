import firecloud from 'firebase-on-cloudflare';
import { hosting as hostingConfig } from './firebase.json';

// Init once (globally) for better perfs
const fcloud = new firecloud('gitbook-staging', hostingConfig);

addEventListener("fetch", (event: any) => fcloud.serve(event));

import firecloud from 'firebase-on-cloudflare';
import { hosting as hostingConfig } from './firebase.json';

// Init once (globally) for better perfs
const fcloud = new firecloud('gitbook-staging', hostingConfig, {
    headers: {
        'X-Release': 'firecloud-0.0.0',
    },
    seed: 'custom-cache-seed',
});

addEventListener("fetch", (event: any) => fcloud.serve(event));

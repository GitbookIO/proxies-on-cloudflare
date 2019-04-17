import { firebase, mixpanel, quoi, proxy } from 'proxies-on-cloudflare';
import { hosting as hostingConfig } from './firebase.json';

// Setup firebase
const fbase = new firebase('gitbook-staging', hostingConfig, {
    headers: {
        'X-Release': 'firecloud-0.0.0',
    },
    seed: 'custom-cache-seed',
});

// Route & listen
const app = quoi();
app.domain('potato.com').serve(proxy.to('https://www.gitbook-staging.com/'));
app.domain('*').root('/__mix/').serve(mixpanel());
app.domain('example.com').serve(proxy.to('https://request-dump.herokuapp.com'));
app.domain('*').serve((event) => fbase.serve(event));
app.listen();

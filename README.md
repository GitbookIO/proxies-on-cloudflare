# `proxies-on-cloudflare`

Makes it easy to build [Cloudflare Workers](https://www.cloudflare.com/products/cloudflare-workers/), by providing high-level proxying primitives addressing common needs.

## Installation

```
$ yarn add proxies-on-cloudflare
```

## Features

- Built-in proxies for
    - Firebase (Hosting & CloudFunctions)
    - Mixpanel
- Simple routing via `quoi` (providing a familiar `express`-like API)
- One-liner proxies (e.g: `proxy.to('https://upstream.com/')`)
- Loadbalancing (`roundrobin`, `random`, `iphash`, ...)
- Fallback and error handling

## Example

```js
import { quoi, firebase, proxy }  from 'proxies-on-cloudflare';
import { hosting as hostingConfig } from './firebase.json';

// Init firebase proxy
const fbase = new firebase('gitbook-staging', hostingConfig);

// Route and listen
const app = quoi();
app.domain('app.gitbook.com').serve(fbase);
app.domain('test.gitbook.com').serve(proxy.to('https://test.github.io/test/'));
app.domain('storage.gitbook.com').serve(proxy.roundrobin(['https://server1', /* ... */ ]));
app.listen();
```

You can see a more complex (real-world) example in `_examples/gitbook/`

## Why ?

We originally (GitBook) built `proxies-on-cloudflare` (previously named `firebase-on-cloudflare`) to fix connection issues we had between `Cloudflare` and `Fastly/Firebase Hosting` but have now extended it to solve broad routing needs.

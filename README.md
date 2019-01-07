# `firebase-on-cloudflare`

Is a [Cloudflare Worker](https://www.cloudflare.com/products/cloudflare-workers/) that reimplements Firebase's hosting logic.

## Installation

```
$ yarn add firebase-on-cloudflare
```

## Usage

```js
import firecloud from 'firebase-on-cloudflare';
import { hosting as hostingConfig } from './firebase.json';

// Init once (globally) for better perfs
const fcloud = new firecloud('gitbook-staging', hostingConfig);

// Proxy (and cache) requests to Google Cloud Functions & Firebase Hosting
addEventListener("fetch", (event) => fcloud.serve(event));
```

## Why ?

We (GitBook) built `firebase-on-cloudflare` to fix connection issues we had between `Cloudflare` and `Fastly/Firebase Hosting`.

## Ideas

- Allow routing to cloud-functions closest to users (rather than everything going to `us-central1`)

// !!! Please use !!!
// import firecloud from 'firecloud';
import firecloud from '../../src/';
import { hosting as hostingConfig } from './firebase.json';
import { FetchEvent } from '../../dist/types';

// Init once (globally) for better perfs
const fcloud = new firecloud('gitbook-staging', hostingConfig);

addEventListener("fetch", (event: any) => fcloud.serve(event));

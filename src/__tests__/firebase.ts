import { Firebase } from '../firebase';

const firebase = new Firebase(
  'firebase-project',
  {
    rewrites: [
      {
        source: '/function-with-glob/**',
        function: 'glob-function'
      },
      {
        source: '/exact-path',
        function: 'exact-function'
      },
      {
        source: '**/!(*.js)',
        destination: '/index.html'
      }
    ]
  },
  {
    headers: {
      'Some-Header': 'My-Firebase-Header'
    },
    publicEndpoint: new URL('https://my-endpoint.com/public')
  }
);

describe('getEndpoint', () => {
  it('should return the function URL that match a glob with a path', async () => {
    const endpointURL = firebase.getEndpoint(
      new Request('https://myapp.com/function-with-glob/with/path')
    );

    expect(endpointURL.toString()).toBe(
      'https://us-central1-firebase-project.cloudfunctions.net/glob-function'
    );
  });

  it('should return the function URL that match a glob without a path', async () => {
    const endpointURL = firebase.getEndpoint(
      new Request('https://myapp.com/function-with-glob')
    );

    expect(endpointURL.toString()).toBe(
      'https://us-central1-firebase-project.cloudfunctions.net/glob-function'
    );
  });

  it('should return the function URL that has an exact match', async () => {
    const endpointURL = firebase.getEndpoint(
      new Request('https://myapp.com/exact-path')
    );

    expect(endpointURL.toString()).toBe(
      'https://us-central1-firebase-project.cloudfunctions.net/exact-function'
    );
  });

  it('should return the public endpoint URL when not an exact match', async () => {
    const endpointURL = firebase.getEndpoint(
      new Request('https://myapp.com/exact-path/with/more')
    );

    expect(endpointURL.toString()).toBe('https://my-endpoint.com/public');
  });

  it('should return the default Firebase hosting endpoint for reserved requests', async () => {
    const endpointURL = firebase.getEndpoint(
      new Request('https://myapp.com/__/some/firebase/request')
    );

    expect(endpointURL.toString()).toBe(
      'https://firebase-project.firebaseapp.com/'
    );
  });

  it('should return the public endpoint URL for any other request', async () => {
    const endpointURL = firebase.getEndpoint(
      new Request('https://myapp.com/some/file.js')
    );

    expect(endpointURL.toString()).toBe('https://my-endpoint.com/public');
  });
});

describe('rewriteURL', () => {
  it('should not rewrite an URL that matches a rewrite rule', async () => {
    const finalURL = firebase.rewriteURL(
      new URL('https://myapp.com/some/js-file.js')
    );

    expect(finalURL.toString()).toBe('https://myapp.com/some/js-file.js');
  });

  it('should rewrite an URL that has a rewrite rule', async () => {
    const finalURL = firebase.rewriteURL(
      new URL('https://myapp.com/some/non-js-file.html')
    );

    expect(finalURL.toString()).toBe('https://myapp.com/index.html');
  });

  it('should not rewrite Firebase reserved requests', async () => {
    const finalURL = firebase.rewriteURL(
      new URL('https://myapp.com/__/some/firebase/request')
    );

    expect(finalURL.toString()).toBe(
      'https://myapp.com/__/some/firebase/request'
    );
  });

  it('should not rewrite an URL that matches a function', async () => {
    const finalURL = firebase.rewriteURL(
      new URL('https://myapp.com/function-with-glob/and/path')
    );

    expect(finalURL.toString()).toBe(
      'https://myapp.com/function-with-glob/and/path'
    );
  });
});

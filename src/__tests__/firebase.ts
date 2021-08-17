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

  it('should return the public endpoint URL for any other request', async () => {
    const endpointURL = firebase.getEndpoint(
      new Request('https://myapp.com/some/file.js')
    );

    expect(endpointURL.toString()).toBe('https://my-endpoint.com/public');
  });
});

describe('rewriteURL', () => {
  it('should not modify an URL that matches a rewrite rule', async () => {
    const finalURL = firebase.rewriteURL(
      new URL('https://myapp.com/some/file.js')
    );

    expect(finalURL.toString()).toBe('https://myapp.com/some/js-file.js');
  });

  it('should modify an URL that has a rewrite rule', async () => {
    const finalURL = firebase.rewriteURL(
      new URL('https://myapp.com/some/non-js-file.html')
    );

    expect(finalURL.toString()).toBe('https://myapp.com/index.html');
  });
});

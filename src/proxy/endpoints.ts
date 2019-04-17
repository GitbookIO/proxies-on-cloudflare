import { GetEndpoint } from './proxy';

export function roundrobin(upstreams: string[]): GetEndpoint {
    const urls = upstreams.map(u => new URL(u));
    let idx = 0;
    return () => {
        const url = urls[idx];
        idx = (idx + 1) % urls.length; // next index
        return url;
    };
}

export function random(upstreams: string[]): GetEndpoint {
    const urls = upstreams.map(u => new URL(u));
    return () => urls[Math.floor(urls.length * Math.random())];
}

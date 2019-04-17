import { proxy as rawProxy, GetEndpoint } from './proxy';
import * as endpoints from './endpoints';
import { ServeFunction } from '../types';

export type GetEndpoint = (req: Request) => URL;

export function random(upstreams: string[]): ServeFunction {
    return rawProxy(endpoints.random(upstreams));
}

export function roundrobin(upstreams: string[]): ServeFunction {
    return rawProxy(endpoints.roundrobin(upstreams));
}

export function to(upstream: string): ServeFunction {
    const url = new URL(upstream);
    return rawProxy(() => url);
}

export function custom(picker: GetEndpoint): ServeFunction {
    return rawProxy(picker);
}

import { ServeFunction } from '../types';
import * as endpoints from './endpoints';
import { GetEndpoint, proxy as rawProxy, ProxyOptions } from './proxy';

export type GetEndpoint = (req: Request) => URL;

export function random(
  upstreams: string[],
  opts?: ProxyOptions
): ServeFunction {
  return rawProxy(endpoints.random(upstreams), opts);
}

export function roundrobin(
  upstreams: string[],
  opts?: ProxyOptions
): ServeFunction {
  return rawProxy(endpoints.roundrobin(upstreams), opts);
}

export function to(upstream: string, opts?: ProxyOptions): ServeFunction {
  const url = new URL(upstream);
  return rawProxy(() => url, opts);
}

export function custom(
  picker: GetEndpoint,
  opts?: ProxyOptions
): ServeFunction {
  return rawProxy(picker, opts);
}

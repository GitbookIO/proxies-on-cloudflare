import { patchEvent } from '../common/patch';
import * as proxy from '../proxy';
import { ServeFunction } from '../quoi';
import { FetchEvent } from '../types';

import { md5 } from './md5';

// amplitude returns a proxy that sends events to api.amplitude.com
export default function amplitude(): ServeFunction {
  const p = proxy.to('https://api.amplitude.com');

  return async function amplitudeProxy(event: FetchEvent): Promise<Response> {
    const req = await injectIP(event.request);
    const newEvent = patchEvent(event, req);
    return await p(newEvent);
  };
}

interface AmplitudeFormData {
  client: string;
  upload_time: string;
  e: string;
  v: string;
  checksum: string;
}

// injectIP modifies a request for MixPanel to inject the IP into the URL
// (querystring) payload
async function injectIP(req: Request): Promise<Request> {
  // Get client IP
  const ip = req.headers.get('CF-Connecting-IP');
  // Get URL
  const formData = await req.formData();
  const data = Object.fromEntries(formData as any) as AmplitudeFormData;

  // Patch events
  const events = JSON.parse(data.e);
  events.forEach((e: any) => (e.ip = ip));
  const eventsJSON = JSON.stringify(events);

  const checksum = await md5(
    data.v + data.client + eventsJSON + data.upload_time
  );

  const body = new URLSearchParams({
    client: data.client,
    e: eventsJSON,
    checksum,
    upload_time: data.upload_time,
    v: data.v
  } as any);

  return new Request(req.url, {
    body,
    method: req.method,
    headers: req.headers
  });
}

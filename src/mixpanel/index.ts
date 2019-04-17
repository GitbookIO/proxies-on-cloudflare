import { FetchEvent } from '../types';
import { ServeFunction } from '../quoi';
import * as proxy from '../proxy';
import { patchEvent } from '../common/patch';

// base64 stuff
const b64Decode = atob;
const b64Encode = btoa;

// mixpanel returns a proxy that sends events to api.mixpanel.com
// In short implementing: https://help.mixpanel.com/hc/en-us/articles/115004499463-Ad-Blockers-Affect-Mixpanel
export default function mixpanel(): ServeFunction {
    const p = proxy.to('https://api.mixpanel.com');

    return function mixpanelProxy(event: FetchEvent): Promise<Response> {
        const req = injectIP(event.request);
        const newEvent = patchEvent(event, req);
        return p(newEvent);
    }
}

// injectIP modifies a request for MixPanel to inject the IP into the URL
// (querystring) payload
function injectIP(req: Request): Request {
    // Get client IP
    const ip = req.headers.get('CF-Connecting-IP');
    // Get URL
    const url = new URL(req.url);
    // Indicate to get IP from data payload
    url.searchParams.set('ip', '0');
    // Inject IP into b64 encoded JSON "data" param
    const datab64 = url.searchParams.get('data') || '';
    const data = datab64 ? JSON.parse(b64Decode(datab64)) : {};
    data['ip'] = ip;
    url.searchParams.set('data', b64Encode(JSON.stringify(data)));

    return new Request(url.toString(), {
        body: req.body,
        method: req.method,
        headers: req.headers,
    })
}

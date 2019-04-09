import quoi from './quoi';
import FirebaseOnCloudflare from './firebase';
import { ReverseProxy, CachedProxy, StaticEndpoint, StaticHeaders } from './reverseproxy';

export default FirebaseOnCloudflare;
export {
    quoi,
    ReverseProxy,
    CachedProxy,
    StaticEndpoint,
    StaticHeaders
}

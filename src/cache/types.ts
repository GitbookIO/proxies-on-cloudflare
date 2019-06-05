export interface CloudflareCache {
  put(request: Request, response: Response): Promise<any>;
  match(request: Request): Promise<Response | undefined>;
}

export interface CloudflareCacheStorage {
  default: CloudflareCache;
}

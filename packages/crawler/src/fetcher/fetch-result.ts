export type HttpFetchResult = {
  url: string;
  status: number;
  headers: Readonly<Record<string, string>>;
  body: string;
};

export type TextFetchResult = {
  url: string;
  body: string;
  status: number;
  fromCache: boolean;
};

export type HttpFetchClient = (url: string, options: {
  headers: Readonly<Record<string, string>>;
  timeoutMs: number;
}) => Promise<HttpFetchResult>;

export type TextCacheAdapter = {
  exists: () => Promise<boolean>;
  read: () => Promise<string>;
  write: (content: string) => Promise<void>;
};

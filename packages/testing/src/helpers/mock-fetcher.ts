export type MockFetchRequest = {
  url: string;
};

export type MockFetchResponse = {
  status: number;
  body: string;
  headers?: Readonly<Record<string, string>>;
};

export type MockFetcher = {
  requests: MockFetchRequest[];
  fetch: (url: string) => Promise<MockFetchResponse>;
};

export function createMockFetcher(responses: ReadonlyMap<string, MockFetchResponse>): MockFetcher {
  const requests: MockFetchRequest[] = [];

  return {
    requests,
    fetch: async (url: string) => {
      requests.push({ url });
      const response = responses.get(url);

      if (response === undefined) {
        return { status: 404, body: "" };
      }

      return response;
    }
  };
}

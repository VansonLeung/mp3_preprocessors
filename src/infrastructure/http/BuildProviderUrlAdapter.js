export function buildProviderUrlAdapter({ baseUrl, endpointPath }) {
  if (!baseUrl) {
    throw new Error("Provider base URL is required.");
  }

  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;
  const normalizedEndpointPath = endpointPath.startsWith("/")
    ? endpointPath
    : `/${endpointPath}`;

  return `${normalizedBaseUrl}${normalizedEndpointPath}`;
}

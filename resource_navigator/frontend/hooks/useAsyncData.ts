import { useEffect, useState } from "react";

export function useAsyncData<T>({
  load,
  dependencies,
  initialValue,
}: {
  load: () => Promise<T>;
  dependencies: unknown[];
  initialValue: T;
}) {
  const [data, setData] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    load()
      .then((loadedData) => {
        if (!isCancelled) {
          setData(loadedData);
        }
      })
      .catch((caughtError: Error) => {
        if (!isCancelled) {
          setError(caughtError.message);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, dependencies);

  return { data, isLoading, error };
}

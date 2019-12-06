import { useState, useEffect } from "react";
import { ApiBuilder } from "neofetch";

export interface UseFetchResult<TData> {
    data: TData | undefined;
    loading: boolean;
    error?: Error;
}

export function useFetch<TApi extends ApiBuilder, TData>(api: TApi, handler: (api: TApi) => Promise<TData>): UseFetchResult<TData> {
    const [state, setState] = useState<UseFetchResult<TData>>({ data: undefined, loading: false });

    useEffect(() => {
        const loadData = async () => {
            setState({ data: undefined, loading: true });
            try {
                const result = await handler(api);
                setState({ data: result, loading: false });
            } catch (error) {
                setState({ data: undefined, loading: false, error: error });
            }
        };
        loadData();
    }, [handler, setState]);

    return state;
}

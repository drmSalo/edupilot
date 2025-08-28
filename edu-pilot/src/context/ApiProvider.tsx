import React, { createContext, useContext, useMemo } from "react";
import { ApiClient, type TokenProvider } from "./ApiClient";
import { useDjangoToken } from "../components/hooks/useDjangoToken";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const ApiContext = createContext<ApiClient | null>(null);

export const ApiProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { token, refresh } = useDjangoToken();
  const client = useMemo(() => {
    const tp: TokenProvider = { getToken: async () => token, refreshToken: refresh };
    return new ApiClient(API_BASE, tp);
  }, [token, refresh]);
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
};

export const useApiClient = () => {
  const c = useContext(ApiContext);
  if (!c) throw new Error("useApiClient must be used within <ApiProvider>");
  return c;
};

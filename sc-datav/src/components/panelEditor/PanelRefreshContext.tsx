import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Ctx = {
  version: number;
  bump: () => void;
};

const PanelRefreshContext = createContext<Ctx>({
  version: 0,
  bump: () => {},
});

export function PanelRefreshProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo(() => ({ version, bump }), [version, bump]);
  return (
    <PanelRefreshContext.Provider value={value}>
      {children}
    </PanelRefreshContext.Provider>
  );
}

export function usePanelRefresh() {
  return useContext(PanelRefreshContext);
}

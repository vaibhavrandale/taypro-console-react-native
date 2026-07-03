import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type StatusBarOverlayContextValue = {
  overlay: boolean;
  setOverlay: (active: boolean) => void;
};

const StatusBarOverlayContext = createContext<
  StatusBarOverlayContextValue | undefined
>(undefined);

export function StatusBarOverlayProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [overlay, setOverlayState] = useState(false);

  const setOverlay = useCallback((active: boolean) => {
    setOverlayState(active);
  }, []);

  const value = useMemo(
    () => ({ overlay, setOverlay }),
    [overlay, setOverlay],
  );

  return (
    <StatusBarOverlayContext.Provider value={value}>
      {children}
    </StatusBarOverlayContext.Provider>
  );
}

export function useStatusBarOverlay(active: boolean) {
  const context = useContext(StatusBarOverlayContext);
  const setOverlay = context?.setOverlay;

  React.useEffect(() => {
    if (!setOverlay) return;
    setOverlay(active);
    return () => setOverlay(false);
  }, [active, setOverlay]);
}

export function useStatusBarOverlayState() {
  const context = useContext(StatusBarOverlayContext);
  return context?.overlay ?? false;
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type BottomNavVisibilityContextValue = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
};

export const BottomNavVisibilityContext = createContext<BottomNavVisibilityContextValue>({
  visible: true,
  setVisible: () => undefined,
});

export function BottomNavVisibilityProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  const value = useMemo(() => ({ visible, setVisible }), [visible]);

  return (
    <BottomNavVisibilityContext.Provider value={value}>
      {children}
    </BottomNavVisibilityContext.Provider>
  );
}

export function useHideBottomNav() {
  const { setVisible } = useContext(BottomNavVisibilityContext);

  useEffect(() => {
    setVisible(false);
    return () => setVisible(true);
  }, [setVisible]);
}

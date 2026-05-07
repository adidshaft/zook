import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

export function useAppFocusInvalidation(queryKeys: QueryKey[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let lastState: AppStateStatus = AppState.currentState;
    const subscription = AppState.addEventListener("change", (nextState) => {
      const becameActive = lastState.match(/inactive|background/) && nextState === "active";
      lastState = nextState;
      if (!becameActive) return;
      for (const queryKey of queryKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    });

    return () => subscription.remove();
  }, [queryClient, queryKeys]);
}

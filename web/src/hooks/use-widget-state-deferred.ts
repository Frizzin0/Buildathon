import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { getAdaptor, useHostContext, WIDGET_CONTEXT_KEY } from "skybridge/web";

function filterWidgetContext(
  state: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (state === null || state === undefined) return null;
  const { [WIDGET_CONTEXT_KEY]: _, ...filtered } = state;
  return filtered;
}

function injectWidgetContext(
  newState: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (newState === null) return null;
  const currentState = getAdaptor()
    .getHostContextStore("widgetState")
    .getSnapshot() as Record<string, unknown> | null;
  if (
    currentState !== null &&
    currentState !== undefined &&
    WIDGET_CONTEXT_KEY in currentState
  ) {
    return {
      ...newState,
      [WIDGET_CONTEXT_KEY]: currentState[WIDGET_CONTEXT_KEY],
    };
  }
  return newState;
}

function defaultFrom<T extends Record<string, unknown>>(
  defaultState: T | (() => T),
): T {
  return typeof defaultState === "function"
    ? (defaultState as () => T)()
    : defaultState;
}

/**
 * Same behavior as skybridge `useWidgetState`, but defers `adaptor.setWidgetState`
 * to a microtask so it does not run inside React's `useState` updater (avoids
 * "Cannot update a component while rendering" with `useSyncExternalStore`).
 */
export function useWidgetStateDeferred<T extends Record<string, unknown>>(
  defaultState: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const adaptor = getAdaptor();
  const widgetStateFromBridge = useHostContext("widgetState") as T | null;

  const [widgetState, _setWidgetState] = useState<T>(() => {
    if (widgetStateFromBridge !== null) {
      const filtered = filterWidgetContext(
        widgetStateFromBridge as Record<string, unknown>,
      );
      if (filtered !== null) return filtered as T;
    }
    return defaultFrom(defaultState);
  });

  useEffect(() => {
    if (widgetStateFromBridge !== null) {
      const next = filterWidgetContext(
        widgetStateFromBridge as Record<string, unknown>,
      );
      if (next !== null) _setWidgetState(next as T);
    }
  }, [widgetStateFromBridge]);

  const setWidgetState = useCallback(
    (state: SetStateAction<T>) => {
      _setWidgetState((prevState) => {
        const newState =
          typeof state === "function"
            ? (state as (p: T) => T)(prevState)
            : state;
        const stateToSet = injectWidgetContext(
          newState as Record<string, unknown> | null,
        );
        if (stateToSet === null) return prevState;
        queueMicrotask(() => {
          void adaptor.setWidgetState(stateToSet);
        });
        return filterWidgetContext(stateToSet) as T;
      });
    },
    [adaptor],
  );

  return [widgetState, setWidgetState];
}

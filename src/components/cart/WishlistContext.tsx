"use client";

import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";

export type WishlistItem = { productId: string; slug: string; name: string };

type State = { items: WishlistItem[] };
type Action =
  | { type: "HYDRATE"; items: WishlistItem[] }
  | { type: "TOGGLE"; item: WishlistItem };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { items: action.items };
    case "TOGGLE": {
      const exists = state.items.some((i) => i.productId === action.item.productId);
      return {
        items: exists
          ? state.items.filter((i) => i.productId !== action.item.productId)
          : [...state.items, action.item],
      };
    }
    default:
      return state;
  }
}

const WishlistContext = createContext<{
  items: WishlistItem[];
  isWishlisted: (productId: string) => boolean;
  toggle: (item: WishlistItem) => void;
} | null>(null);

const STORAGE_KEY = "dasdum:wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", items: JSON.parse(raw) });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // best-effort persistence only
    }
  }, [state.items]);

  return (
    <WishlistContext.Provider
      value={{
        items: state.items,
        isWishlisted: (productId) => state.items.some((i) => i.productId === productId),
        toggle: (item) => dispatch({ type: "TOGGLE", item }),
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}

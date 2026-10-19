"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";

export type CartLine = {
  id: string; // productId + variant key
  productId: string;
  slug: string;
  name: string;
  variantLabel?: string;
  /** Thumbnail shown in the cart. Optional: lines saved before this field
   * existed simply render without a picture. */
  imageUrl?: string;
  unitPrice: number; // minor units (pence)
  quantity: number;
  savedForLater: boolean;
};

type CartState = { lines: CartLine[] };

type CartAction =
  | { type: "HYDRATE"; lines: CartLine[] }
  | { type: "ADD"; line: Omit<CartLine, "savedForLater"> }
  | { type: "REMOVE"; id: string }
  | { type: "SET_QUANTITY"; id: string; quantity: number }
  | { type: "TOGGLE_SAVED"; id: string }
  | { type: "CLEAR_ACTIVE" };

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return { lines: action.lines };
    case "ADD": {
      const existing = state.lines.find((l) => l.id === action.line.id);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.id === action.line.id ? { ...l, quantity: l.quantity + action.line.quantity } : l
          ),
        };
      }
      return { lines: [...state.lines, { ...action.line, savedForLater: false }] };
    }
    case "REMOVE":
      return { lines: state.lines.filter((l) => l.id !== action.id) };
    case "SET_QUANTITY":
      return {
        lines: state.lines.map((l) =>
          l.id === action.id ? { ...l, quantity: Math.max(1, action.quantity) } : l
        ),
      };
    case "TOGGLE_SAVED":
      return {
        lines: state.lines.map((l) =>
          l.id === action.id ? { ...l, savedForLater: !l.savedForLater } : l
        ),
      };
    case "CLEAR_ACTIVE":
      return { lines: state.lines.filter((l) => l.savedForLater) };
    default:
      return state;
  }
}

const CartContext = createContext<{
  lines: CartLine[];
  addLine: (line: Omit<CartLine, "savedForLater">) => void;
  removeLine: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  toggleSaved: (id: string) => void;
  clearActive: () => void;
  subtotal: number;
  activeCount: number;
} | null>(null);

const STORAGE_KEY = "dasdum:cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { lines: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", lines: JSON.parse(raw) });
    } catch {
      // ignore corrupt/local storage-unavailable state
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lines));
    } catch {
      // best-effort persistence only
    }
  }, [state.lines]);

  const activeLines = state.lines.filter((l) => !l.savedForLater);
  const subtotal = activeLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const activeCount = activeLines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        lines: state.lines,
        addLine: (line) => dispatch({ type: "ADD", line }),
        removeLine: (id) => dispatch({ type: "REMOVE", id }),
        setQuantity: (id, quantity) => dispatch({ type: "SET_QUANTITY", id, quantity }),
        toggleSaved: (id) => dispatch({ type: "TOGGLE_SAVED", id }),
        clearActive: () => dispatch({ type: "CLEAR_ACTIVE" }),
        subtotal,
        activeCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

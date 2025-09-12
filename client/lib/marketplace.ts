import { supabase } from "./supabase";

export type MarketCategory =
  | "electronics"
  | "furniture"
  | "books"
  | "clothes"
  | "other";
export type MarketCondition = "new" | "used" | "repair";
export type DeliveryStatus = "pending" | "collected" | "delivered";

export interface MarketItem {
  id: string;
  user_id: string;
  name: string;
  category: MarketCategory;
  condition: MarketCondition;
  price: number;
  description?: string;
  images: string[];
  verified: boolean;
  created_at: string;
  status: "available" | "reserved" | "sold";
}

export interface MarketOrder {
  id: string;
  item_id: string;
  seller_id: string;
  buyer_id: string;
  price: number;
  status: DeliveryStatus;
  created_at: string;
  eta_seconds?: number;
  started_at?: string;
}

const LS_ITEMS = "ecosort_market_items";
const LS_ORDERS = "ecosort_market_orders";

const read = <T>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : d;
  } catch {
    return d;
  }
};
const write = (k: string, v: any) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

export async function listItems(filter?: {
  category?: MarketCategory;
  condition?: MarketCondition;
  q?: string;
}): Promise<MarketItem[]> {
  if (!supabase) {
    let all = read<MarketItem[]>(LS_ITEMS, []);
    if (filter?.category)
      all = all.filter((i) => i.category === filter.category);
    if (filter?.condition)
      all = all.filter((i) => i.condition === filter.condition);
    if (filter?.q) {
      const q = filter.q.toLowerCase();
      all = all.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description || "").toLowerCase().includes(q),
      );
    }
    return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const query = supabase
    .from("market_items")
    .select("*")
    .order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  let items = (data || []) as MarketItem[];
  if (filter?.category)
    items = items.filter((i) => i.category === filter.category);
  if (filter?.condition)
    items = items.filter((i) => i.condition === filter.condition);
  if (filter?.q) {
    const q = filter.q.toLowerCase();
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description || "").toLowerCase().includes(q),
    );
  }
  return items;
}

export async function createItem(
  input: Omit<MarketItem, "id" | "created_at" | "status" | "verified"> & {
    verified?: boolean;
  },
): Promise<MarketItem> {
  const base: Omit<MarketItem, "id" | "created_at"> = {
    ...input,
    status: "available",
    verified: input.verified ?? true,
  } as any;

  if (!supabase) {
    const item: MarketItem = {
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...base,
    } as MarketItem;
    const list = read<MarketItem[]>(LS_ITEMS, []);
    list.unshift(item);
    write(LS_ITEMS, list);
    return item;
  }
  const { data, error } = await supabase
    .from("market_items")
    .insert({ ...base })
    .select("*")
    .single();
  if (error) throw error;
  return data as MarketItem;
}

export async function buyNow(
  item: MarketItem,
  buyerId: string,
): Promise<MarketOrder> {
  const orderBase = {
    item_id: item.id,
    seller_id: item.user_id,
    buyer_id: buyerId,
    price: item.price,
    status: "pending" as DeliveryStatus,
    eta_seconds: 2 * 60 * 60, // 2h ETA
    started_at: new Date().toISOString(),
  };

  if (!supabase) {
    const order: MarketOrder = {
      id: `ord-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...orderBase,
    } as any;
    const orders = read<MarketOrder[]>(LS_ORDERS, []);
    orders.unshift(order);
    write(LS_ORDERS, orders);
    // update item status
    const items = read<MarketItem[]>(LS_ITEMS, []);
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx > -1) {
      items[idx].status = "reserved";
      write(LS_ITEMS, items);
    }
    return order;
  }
  const { data, error } = await supabase
    .from("market_orders")
    .insert(orderBase)
    .select("*")
    .single();
  if (error) throw error;
  await supabase
    .from("market_items")
    .update({ status: "reserved" })
    .eq("id", item.id);
  return data as MarketOrder;
}

export async function updateOrderStatus(
  orderId: string,
  status: DeliveryStatus,
) {
  if (!supabase) {
    const orders = read<MarketOrder[]>(LS_ORDERS, []);
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx > -1) {
      orders[idx].status = status;
      write(LS_ORDERS, orders);
    }
    return;
  }
  const { error } = await supabase
    .from("market_orders")
    .update({ status })
    .eq("id", orderId);
  if (error) throw error;
}

export function formatEta(seconds?: number) {
  if (!seconds || seconds <= 0) return "00h 00m 00s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

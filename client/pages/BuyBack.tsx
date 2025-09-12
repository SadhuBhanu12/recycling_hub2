import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Gift, Timer, CheckCircle2, ShieldCheck } from "lucide-react";
import { getBuybackOrder, updateBuybackOrder } from "@/lib/buyback";
import { useAuth as useSbAuth } from "@/lib/supabase";
import {
  createItem,
  listItems,
  buyNow,
  type MarketItem,
  type MarketCategory,
  type MarketCondition,
  formatEta,
} from "@/lib/marketplace";
import { toast } from "@/components/ui/use-toast";

export default function BuyBackPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user: sbUser } = useSbAuth();

  // Marketplace state (when no orderId)
  const [items, setItems] = useState<MarketItem[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<MarketCategory | "">("");
  const [cond, setCond] = useState<MarketCondition | "">("");
  const [posting, setPosting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "electronics" as MarketCategory,
    condition: "used" as MarketCondition,
    description: "",
    image: "",
  });

  // Order confirmation state (when orderId present)
  const [order, setOrder] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Marketplace loader
  useEffect(() => {
    if (!orderId) {
      (async () => {
        const list = await listItems({
          q,
          category: (cat || undefined) as any,
          condition: (cond || undefined) as any,
        });
        setItems(list);
      })();
    }
  }, [orderId, q, cat, cond]);

  // Fetch the specific order details
  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      const data = await getBuybackOrder(orderId);
      if (data) {
        setOrder(data);
        // Set the 24-hour countdown
        const orderDate = new Date(data.created_at);
        const twentyFourHoursLater = new Date(
          orderDate.getTime() + 24 * 60 * 60 * 1000,
        );
        setTimeRemaining(twentyFourHoursLater.getTime() - new Date().getTime());
      }
      setLoading(false);
    };
    fetchOrder();
  }, [orderId]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prevTime) => prevTime - 1000);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handlePickupCollected = async () => {
    try {
      await updateBuybackOrder(orderId, {
        status: "collected",
        collected_at: new Date().toISOString(),
      });
      toast({
        title: "Pickup confirmed",
        description: "Thanks for recycling sustainably.",
      });
      navigate("/buyback");
    } catch (error) {
      console.error("Failed to update order status:", error);
      toast({ title: "Failed to confirm", description: "Please try again." });
    }
  };

  const postItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    setPosting(true);
    try {
      const newItem = await createItem({
        user_id: sbUser?.id || "mock-user-1",
        name: form.name.trim(),
        category: form.category,
        condition: form.condition,
        price: Number(form.price),
        description: form.description.trim(),
        images: form.image
          ? [form.image]
          : [
              "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?w=800&q=80&auto=format&fit=crop",
            ],
      });
      toast({ title: "Item posted", description: "Your item is now live." });
      setForm({
        name: "",
        price: "",
        category: "electronics",
        condition: "used",
        description: "",
        image: "",
      });
      const list = await listItems({});
      setItems(list);
    } catch (err: any) {
      toast({ title: "Post failed", description: err?.message || String(err) });
    } finally {
      setPosting(false);
    }
  };

  const handleBuyNow = async (item: MarketItem) => {
    try {
      const order = await buyNow(item, sbUser?.id || "mock-user-1");
      toast({
        title: "Order placed",
        description: `ETA: ${formatEta(order.eta_seconds)}`,
      });
      const list = await listItems({
        q,
        category: (cat || undefined) as any,
        condition: (cond || undefined) as any,
      });
      setItems(list);
    } catch (err: any) {
      toast({
        title: "Purchase failed",
        description: err?.message || String(err),
      });
    }
  };

  const formatTime = (ms) => {
    if (ms <= 0) return "Pickup time has expired.";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  if (!orderId) {
    // Marketplace view
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Buy-Back Marketplace</CardTitle>
            <CardDescription>
              Sell unused items or buy second-hand sustainably
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={postItem} className="grid md:grid-cols-5 gap-3">
              <Input
                placeholder="Item name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="furniture">Furniture</SelectItem>
                  <SelectItem value="books">Books</SelectItem>
                  <SelectItem value="clothes">Clothes</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={form.condition}
                onValueChange={(v) => setForm({ ...form, condition: v as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="repair">Repair Needed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Price (₹)"
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <Button type="submit" disabled={posting}>
                {posting ? "Posting..." : "Post Item"}
              </Button>
              <Input
                className="md:col-span-5"
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
              <Input
                className="md:col-span-5"
                placeholder="Image URL (optional)"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
              />
            </form>

            <div className="grid md:grid-cols-4 gap-3 items-center">
              <Input
                placeholder="Search items"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Select value={cat} onValueChange={(v) => setCat(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="furniture">Furniture</SelectItem>
                  <SelectItem value="books">Books</SelectItem>
                  <SelectItem value="clothes">Clothes</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={cond} onValueChange={(v) => setCond(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="repair">Repair Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {items.map((it) => (
                <Card key={it.id} className="overflow-hidden">
                  <img
                    src={it.images?.[0]}
                    alt={it.name}
                    className="w-full h-40 object-cover"
                  />
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{it.name}</div>
                      {it.verified && (
                        <Badge className="bg-green-600 text-white">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Eco Verified
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {it.category} • {it.condition}
                    </div>
                    <div className="text-lg font-bold">₹{it.price}</div>
                    {it.status !== "available" ? (
                      <Button disabled variant="secondary">
                        Reserved
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleBuyNow(it)}
                        className="w-full"
                      >
                        <Gift className="w-4 h-4 mr-1" /> Buy Now
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {items.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground">
                  No items found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">Loading order details...</div>
    );
  }

  if (!order) {
    return <div className="container mx-auto p-4">Order not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Order #{orderId} Confirmed</CardTitle>
          <CardDescription>
            Your pickup has been scheduled. A partner will be in touch shortly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p>
              <strong>Material:</strong> {order.material_type}
            </p>
            <p>
              <strong>Weight:</strong> {order.weight_kg} kg
            </p>
            <p>
              <strong>Estimated Payout:</strong> ₹{order.price_quote}
            </p>
            <p>
              <strong>Status:</strong> {order.status}
            </p>
          </div>

          <div className="space-y-2">
            <CardTitle className="text-xl">
              Time Until Pickup Window Closes
            </CardTitle>
            <div
              className={`p-3 rounded text-center font-bold text-2xl ${timeRemaining > 0 ? "bg-green-700 text-white" : "bg-red-700 text-white"}`}
            >
              {formatTime(timeRemaining)}
            </div>
          </div>

          {order.status !== "collected" && timeRemaining > 0 && (
            <div className="space-y-2">
              <CardTitle className="text-xl">Pickup Confirmation</CardTitle>
              <p>
                Once your material has been collected by our partner, please
                confirm below:
              </p>
              <Button onClick={handlePickupCollected} className="w-full">
                Confirm Material Collected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

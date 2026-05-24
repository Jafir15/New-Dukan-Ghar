import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Package, Clock, ChevronRight, Truck, CheckCircle, Box } from "lucide-react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrders } from "@/hooks/useFirebaseData";
import { getSessionId } from "@/lib/session";
import { useAuth } from "@/lib/auth";

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "زیرِ التواء ⏳", icon: <Clock className="w-3.5 h-3.5 text-white" />, color: "bg-red-600 text-white border border-red-700 font-bold shadow-sm" },
  packed: { label: "پیک ہوگیا 📦", icon: <Box className="w-3.5 h-3.5 text-white" />, color: "bg-red-600 text-white border border-red-700 font-bold shadow-sm" },
  on_the_way: { label: "راستے میں 🚚", icon: <Truck className="w-3.5 h-3.5 text-white" />, color: "bg-red-600 text-white border border-red-700 font-bold shadow-sm" },
  delivered: { label: "پہنچ گیا ✅", icon: <CheckCircle className="w-3.5 h-3.5 text-white" />, color: "bg-red-600 text-white border border-red-700 font-bold shadow-sm" },
};

export default function Orders() {
  const [, setLocation] = useLocation();
  const [trackingInput, setTrackingInput] = useState("");
  const { data: allOrders, isLoading } = useOrders();
  const { user } = useAuth();
  const orders = allOrders?.filter(o => {
    if (user?.uid) {
      // Logged in: ONLY show orders belonging to THIS Firebase account
      return o.userId === user.uid;
    }
    // Guest: show by browser session
    return o.sessionId === getSessionId();
  });

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingInput.trim()) {
      setLocation(`/track/${encodeURIComponent(trackingInput.trim())}`);
    }
  };

  return (
    <Layout>
      <div className="p-4 flex flex-col gap-5">
        <h1 className="urdu-text text-2xl font-bold text-right">میرے آرڈر</h1>

        {/* Tracking Search (Moved from Home) */}
        <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20 shadow-sm">
          <h2 className="urdu-text text-xl font-bold text-primary mb-1 text-right">اپنا آرڈر ٹریک کریں</h2>
          <p className="urdu-text text-[10px] text-muted-foreground text-right mb-4">آرڈر کی صورتحال جاننے کے لیے ٹریکنگ نمبر درج کریں</p>
          <form onSubmit={handleTrack} className="flex gap-2">
            <Input
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              placeholder="ٹریکنگ نمبر (e.g. DG123456)"
              className="bg-background rounded-xl flex-1 text-right urdu-text"
            />
            <Button type="submit" className="shrink-0 rounded-xl px-5 font-bold">
              <Search className="w-4 h-4 mr-2" />
              <span className="urdu-text">تلاش کریں</span>
            </Button>
          </form>
        </div>

        {/* Orders List */}
        <div className="flex flex-col gap-3">
          <h2 className="urdu-text text-lg font-semibold text-right text-muted-foreground">تمام آرڈر</h2>
          {isLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="w-full h-24 rounded-xl" />)
          ) : orders?.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-dashed">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="urdu-text text-muted-foreground">ابھی تک کوئی آرڈر نہیں</p>
              <p className="text-sm text-muted-foreground mt-1">No orders yet.</p>
            </div>
          ) : (
            orders?.map((order) => {
              const status = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;
              return (
                <button
                  key={order.id}
                  onClick={() => setLocation(`/track/${order.trackingNumber}`)}
                  className="bg-card border rounded-xl p-4 flex flex-col gap-2 shadow-sm text-left w-full hover-elevate hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
                      {status.icon}
                      <span className="urdu-text">{status.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-primary">{order.trackingNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ur-PK") : "..."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ChevronRight className="w-4 h-4" />
                      <span className="text-xs">View details</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">Rs. {order.total}</p>
                      <p className="text-xs text-muted-foreground urdu-text font-bold">{order.customerName}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[150px] urdu-text">{order.customerAddress}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}

import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { ChevronLeft, Clock, Box, Truck, CheckCircle, Package, Trash2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrders, useDeleteOrder } from "@/hooks/useFirebaseData";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";


const STEPS = [
  { key: "pending", label: "زیرِ التواء", sublabel: "Order received", icon: Clock },
  { key: "packed", label: "پیک ہوگیا", sublabel: "Packed & ready", icon: Box },
  { key: "on_the_way", label: "راستے میں", sublabel: "Out for delivery", icon: Truck },
  { key: "delivered", label: "پہنچ گیا", sublabel: "Delivered", icon: CheckCircle },
];

const stepIndex = (status: string) => STEPS.findIndex(s => s.key === status);

export default function Track() {
  const params = useParams<{ trackingNumber: string }>();
  const trackingNumber = decodeURIComponent(params.trackingNumber || "");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: allOrders, isLoading } = useOrders();
  const deleteOrder = useDeleteOrder();
  const order = allOrders?.find(o => o.trackingNumber === trackingNumber);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);


  const currentStep = order ? stepIndex(order.status) : -1;

  const handleDelete = () => {
    if (!order) return;
    deleteOrder.mutate(order.id, {
      onSuccess: () => {
        toast({ title: "Order Deleted", description: "Your order has been removed." });
        setLocation("/");
      }
    });
  };

  return (
    <Layout>
      <div className="p-4 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/orders"><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="urdu-text text-2xl font-bold flex-1 text-right">آرڈر ٹریکنگ</h1>
        </div>

        {!trackingNumber ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="urdu-text text-muted-foreground font-bold text-lg">ٹریکنگ نمبر درج کریں</p>
            <p className="text-sm text-muted-foreground mt-1">Go to Orders to search by tracking number.</p>
            <Button asChild variant="outline" className="mt-4 rounded-xl">
              <Link href="/orders">آرڈرز دیکھیں</Link>
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="w-full h-32 rounded-xl" />
            <Skeleton className="w-full h-48 rounded-xl" />
          </div>
        ) : !order ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="urdu-text text-muted-foreground font-bold text-lg">آرڈر نہیں ملا</p>
            <p className="text-sm text-muted-foreground mt-1 font-mono">"{trackingNumber}"</p>
            <Button asChild variant="outline" className="mt-4 rounded-xl">
              <Link href="/orders">واپس جائیں</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Order Info Card (Simpler Design with requested Alignment) */}
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Package className="w-24 h-24 text-red-900" />
              </div>
              
              <div className="flex justify-between items-start relative z-10 gap-4">
                {/* Left Side: Vertical Details */}
                <div className="text-left flex flex-col gap-1">
                   <p className="urdu-text text-sm font-bold text-red-900">{order.customerName}</p>
                   <p className="text-xs text-red-700/80 font-mono">{order.customerPhone}</p>
                   <p className="urdu-text text-[11px] text-red-800 mt-1">
                     {order.customerAddress}
                   </p>
                </div>

                {/* Right Side: Order ID */}
                <div className="text-right flex flex-col items-end">
                  <p className="font-mono text-2xl font-black text-red-900 leading-none">{order.trackingNumber}</p>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => setShowDeleteDialog(true)} 
                    className="text-red-600 hover:bg-red-100 h-8 w-8 rounded-full mt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-red-200/50 space-y-3">
                {/* Product List in Card */}
                <div className="bg-white/40 rounded-lg p-3 space-y-2">
                  <p className="urdu-text text-[10px] font-bold text-red-900/40 text-center border-b border-red-200/30 pb-1">مصنوعات کی تفصیل</p>
                  {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span className="font-bold text-red-900">Rs. {item.price * item.quantity}</span>
                      <span className="urdu-text text-red-800">{item.productNameUrdu} × {item.quantity}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[11px] pt-1 border-t border-red-200/30">
                    <span className="font-bold text-red-900">Rs. {order.deliveryCharge || 0}</span>
                    <span className="urdu-text text-red-800">ڈیلیوری چارجز</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-red-600 text-white p-3 rounded-xl shadow-md">
                   <span className="text-lg font-black">Rs. {order.total}</span>
                   <span className="urdu-text text-lg font-bold">کل رقم</span>
                </div>
              </div>
            </div>

            {/* Progress Stepper */}
            <div className="bg-card border rounded-xl p-4 shadow-sm">
              <h2 className="urdu-text text-lg font-bold text-right mb-5 border-b pb-2">آرڈر کی صورتحال</h2>
              <div className="relative pl-2">
                {/* Background line */}
                <div className="absolute left-7 top-5 bottom-5 w-0.5 bg-border" />
                {/* Progress line */}
                <div
                  className="absolute left-7 top-5 w-0.5 bg-primary transition-all duration-700"
                  style={{ height: currentStep > 0 ? `${(currentStep / (STEPS.length - 1)) * 100}%` : "0%" }}
                />
                <div className="flex flex-col gap-7">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = i <= currentStep;
                    const active = i === currentStep;
                    return (
                      <div key={step.key} className="flex items-center gap-4">
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${done ? "bg-primary border-primary text-primary-foreground shadow-md" : "bg-background border-muted text-muted-foreground"} ${active ? "scale-110 shadow-lg border-primary ring-4 ring-primary/20" : ""}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-right">
                          <p className={`urdu-text font-bold ${done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                          <p className={`text-xs ${done ? "text-muted-foreground" : "text-muted-foreground/40"}`}>{step.sublabel}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <DeleteConfirmDialog 
        isOpen={showDeleteDialog} 
        onClose={() => setShowDeleteDialog(false)} 
        onConfirm={handleDelete}
        isPending={deleteOrder.isPending}
      />
    </Layout>
  );
}

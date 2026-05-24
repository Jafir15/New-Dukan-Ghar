import { useState, useRef, useEffect } from "react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useQueryClient } from "@tanstack/react-query";
import { playNotificationChime } from "@/lib/audio";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, limit } from "firebase/firestore";
import {
  useDashboardStats,
  useOrders, useUpdateOrder, useDeleteOrder,
  useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle,
  useBookings, useUpdateBooking, useDeleteBooking,
  usePaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod,
  useSliders, useCreateSlider, useDeleteSlider,
  useNotifications, useCreateNotification,
  useUsers, useUpdateUser,
  usePaymentRequests, useUpdatePaymentRequest,
  useCustomRequests, useUpdateCustomRequest, useDeleteCustomRequest,
  usePromoBoxes, useUpdatePromoBox,
  useAppSettings, useUpdateAppSettings,
  useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon
} from "@/hooks/useFirebaseData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, BarChart3, Package, Tag, Truck, ClipboardList, CreditCard, ImageIcon, Check, X, Eye, EyeOff, MapPin, ChevronRight, ChevronLeft, User, Briefcase, Clock, Phone, Download, Edit2, Trash2, Megaphone, Bell, Plus, Pencil, FileText, Printer, Gift, Ticket } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import type { Product } from "@/types";


function ImageEditRow({ currentUrl, onSave, isPending }: { currentUrl: string | null | undefined; onSave: (url: string | null) => void; isPending: boolean }) {
  const [url, setUrl] = useState(currentUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const uploadedUrl = await uploadToCloudinary(file);
      setUrl(uploadedUrl);
      onSave(uploadedUrl);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t pt-3 mt-1 bg-muted/30 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Image (URL or Upload)</p>
        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading || isPending}>
          {isUploading ? "Uploading..." : "Upload File"}
        </Button>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      </div>
      {url && (
        <div className="w-full h-32 bg-muted rounded-lg overflow-hidden flex items-center justify-center border">
          <img src={url} alt="preview" className="h-full w-full object-contain" onError={e => (e.currentTarget.style.display = "none")} />
        </div>
      )}
      <Input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://example.com/image.jpg"
        className="text-xs"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(url || null)} disabled={isPending || isUploading} className="h-7 text-xs gap-1">
          <Check className="w-3 h-3" /> Save Changes
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onSave(null)} disabled={isPending || isUploading} className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
          <X className="w-3 h-3" /> Remove
        </Button>
      </div>
    </div>
  );
}

const STATUS_OPTIONS = ["pending", "packed", "on_the_way", "delivered"];
const STATUS_LABELS: Record<string, string> = { pending: "زیرِ التواء", packed: "پیک ہوگیا", on_the_way: "راستے میں", delivered: "پہنچ گیا" };
const BOOKING_STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled"];
const BOOKING_STATUS_LABELS: Record<string, string> = { pending: "زیرِ غور", confirmed: "تصدیق شدہ", completed: "مکمل", cancelled: "منسوخ" };
const UNIT_OPTIONS = ["kg", "gram", "liter", "pound", "piece", "dozen", "box", "packet"];
const VEHICLE_TYPES = ["rickshaw", "chigchi", "carry_bolan", "car", "high_roof", "bus"];

export default function Admin() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!sessionStorage.getItem("admin_token"));
  const { toast } = useToast();
  const { data: settings } = useAppSettings();

  // Wrong attempts count state loaded from localStorage
  const [attempts, setAttempts] = useState(() => {
    const val = localStorage.getItem("admin_pin_attempts");
    return val ? parseInt(val, 10) : 0;
  });

  // Lockout timestamp state loaded from localStorage
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const val = localStorage.getItem("admin_pin_lockout_until");
    return val ? parseInt(val, 10) : null;
  });

  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState("");

  // Check the lockout state and tick the timer every second
  useEffect(() => {
    if (!lockoutUntil) {
      setTimeRemaining(0);
      return;
    }

    const checkLockout = () => {
      const now = Date.now();
      const remaining = lockoutUntil - now;
      if (remaining <= 0) {
        // Lockout time expired! Reset state and localStorage.
        setLockoutUntil(null);
        setAttempts(0);
        setErrorMsg("");
        localStorage.removeItem("admin_pin_lockout_until");
        localStorage.removeItem("admin_pin_attempts");
        setTimeRemaining(0);
      } else {
        setTimeRemaining(Math.ceil(remaining / 1000));
        setErrorMsg("سیکیورٹی لاک: 5 مرتبہ غلط کوششوں کی وجہ سے ایڈمن پینل 24 گھنٹے کے لیے لاک کر دیا گیا ہے۔");
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Safeguard: do not allow attempts if locked
    if (lockoutUntil && Date.now() < lockoutUntil) {
      return;
    }

    const correctPin = settings?.adminPin || "1234";
    if (pin === correctPin) {
      sessionStorage.setItem("admin_token", "hardcoded-token");
      setIsAuthenticated(true);
      setAttempts(0);
      localStorage.removeItem("admin_pin_attempts");
      localStorage.removeItem("admin_pin_lockout_until");
      toast({ title: "Logged in", variant: "default" });
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem("admin_pin_attempts", newAttempts.toString());
      setPin("");

      if (newAttempts >= 5) {
        const lockoutTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours lock
        setLockoutUntil(lockoutTime);
        localStorage.setItem("admin_pin_lockout_until", lockoutTime.toString());
        setErrorMsg("سیکیورٹی لاک: 5 مرتبہ غلط کوششوں کی وجہ سے ایڈمن پینل 24 گھنٹے کے لیے لاک کر دیا گیا ہے۔");
        toast({
          title: "Attempts Limit Reached",
          description: "Admin panel locked for 24 hours due to 5 consecutive wrong PIN attempts.",
          variant: "destructive"
        });
      } else {
        const remaining = 5 - newAttempts;
        setErrorMsg(`غلط پن کوڈ! باقی کوششیں: ${remaining}`);
        toast({
          title: "Invalid PIN",
          description: `Invalid PIN entered. Attempts remaining: ${remaining}`,
          variant: "destructive"
        });
      }
    }
  };

  const formatLockoutTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isLocked = !!lockoutUntil && timeRemaining > 0;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="bg-card border rounded-2xl p-8 w-full max-w-[350px] shadow-xl text-center flex flex-col gap-5 border-border">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors duration-500 ${
            isLocked ? "bg-red-500/10 text-red-500 animate-pulse" : "bg-primary/10 text-primary"
          }`}>
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="urdu-text text-2xl font-bold mb-1">ایڈمن پینل لاگ ان</h1>
            <p className="text-xs text-muted-foreground">Enter admin PIN to access dashboard</p>
          </div>

          {/* Custom Lockout / Error Message Area */}
          {errorMsg && (
            <div className={`p-3 rounded-xl text-xs urdu-text leading-relaxed border ${
              isLocked 
                ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 font-bold" 
                : "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400 font-medium"
            }`}>
              {errorMsg}
            </div>
          )}

          {/* Locked Screen Custom Countdown */}
          {isLocked && (
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex flex-col gap-1 items-center">
              <span className="text-[10px] text-red-500 uppercase tracking-wider font-semibold">Security Lockout Active</span>
              <span className="font-mono text-3xl font-extrabold text-red-600 dark:text-red-400 tracking-wider">
                {formatLockoutTimer(timeRemaining)}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5 urdu-text">اس کے بعد خودکار طور پر انلاک ہو جائے گا</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input 
              type="password" 
              value={pin} 
              onChange={e => setPin(e.target.value)} 
              placeholder={isLocked ? "LOCKED" : "Enter PIN"} 
              className="text-center text-2xl tracking-widest h-14 rounded-xl font-bold border-border" 
              maxLength={6} 
              disabled={isLocked}
              data-testid="input-admin-pin" 
            />
            <Button 
              type="submit" 
              className={`h-12 rounded-xl font-bold text-base transition-all duration-300 ${
                isLocked ? "bg-red-600/50 cursor-not-allowed" : ""
              }`}
              disabled={isLocked}
            >
              <span className="urdu-text">{isLocked ? "لاکڈ" : "داخل ہوں"}</span>
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return <AdminDashboard onLogout={() => { sessionStorage.removeItem("admin_token"); setIsAuthenticated(false); }} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const queryClient = useQueryClient();
  const [liveNotifications, setLiveNotifications] = useState<{ id: string; title: string; message: string; type: string; timestamp: number }[]>([]);

  useEffect(() => {
    const mountTime = Date.now();

    const triggerNotification = (title: string, message: string, type: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      const item = { id, title, message, type, timestamp: Date.now() };
      
      setLiveNotifications(prev => [item, ...prev]);
      playNotificationChime();

      // Invalidate queries to refresh lists and dashboard counts immediately
      queryClient.invalidateQueries();

      // Auto dismiss after 8 seconds
      setTimeout(() => {
        setLiveNotifications(prev => prev.filter(n => n.id !== id));
      }, 8000);
    };

    // 1. Listen for new Orders
    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const createdTime = data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
          if (createdTime > mountTime) {
            triggerNotification(
              "نیا آرڈر موصول ہوا ہے! 🛒",
              `کسٹمر: ${data.customerName || "مہمان"} | بل رقم: Rs. ${data.total}`,
              "order"
            );
          }
        }
      });
    });

    // 2. Listen for new Transport Bookings
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const createdTime = data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
          if (createdTime > mountTime) {
            triggerNotification(
              "نئی گاڑی بکنگ موصول ہوئی ہے! 🚚",
              `کسٹمر: ${data.customerName || "مہمان"} | گاڑی: ${data.vehicleNameUrdu || "ٹرانسپورٹ"}`,
              "booking"
            );
          }
        }
      });
    });

    // 3. Listen for new Payment Requests (withdraw/deposit)
    const unsubPayments = onSnapshot(collection(db, "payment_requests"), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const createdTime = data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
          if (createdTime > mountTime) {
            const reqType = data.type === "withdraw" ? "رقم نکلوانے" : "رقم جمع کروانے";
            triggerNotification(
              "ادائیگی کی نئی درخواست! 💳",
              `کسٹمر: ${data.userName || "صارف"} | نوعیت: ${reqType} | رقم: Rs. ${data.amount}`,
              "payment"
            );
          }
        }
      });
    });

    // 4. Listen for new Custom Requests (Slips)
    const unsubCustom = onSnapshot(collection(db, "custom_requests"), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const createdTime = data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
          if (createdTime > mountTime) {
            triggerNotification(
              "خصوصی آرڈر پرچی موصول ہوئی ہے! 📝",
              `کسٹمر: ${data.customerName || "صارف"} | نئی پرچی/فہرست`,
              "custom"
            );
          }
        }
      });
    });

    return () => {
      unsubOrders();
      unsubBookings();
      unsubPayments();
      unsubCustom();
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Live Notifications */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {liveNotifications.map((n) => (
          <div key={n.id} className="bg-card border-2 border-primary/20 rounded-2xl p-4 shadow-2xl pointer-events-auto flex items-start gap-3 text-right justify-end relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-yellow-500"></div>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setLiveNotifications(prev => prev.filter(x => x.id !== n.id))}
              className="h-5 w-5 rounded-full absolute top-2 left-2 text-muted-foreground hover:bg-muted"
            >
              <X className="w-3 h-3" />
            </Button>
            <div className="flex flex-col text-right pr-1">
              <span className="urdu-text font-bold text-sm text-primary">{n.title}</span>
              <span className="urdu-text text-xs text-muted-foreground mt-0.5">{n.message}</span>
            </div>
            <div className="bg-primary/10 p-1.5 rounded-full shrink-0 flex items-center justify-center text-primary mt-0.5">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
          </div>
        ))}
      </div>
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-md">
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-primary-foreground hover:bg-primary-foreground/20 rounded-lg text-xs">Logout</Button>
        <h1 className="urdu-text text-xl font-bold">ایڈمن پینل</h1>
      </header>

      <div className="max-w-[900px] mx-auto p-4">
        <Tabs defaultValue="dashboard">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4 bg-muted p-1 rounded-xl">
            <TabsTrigger value="dashboard" className="rounded-lg text-xs gap-1"><BarChart3 className="w-3.5 h-3.5" />Dashboard</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-lg text-xs gap-1"><ClipboardList className="w-3.5 h-3.5" />Orders</TabsTrigger>
            <TabsTrigger value="products" className="rounded-lg text-xs gap-1"><Package className="w-3.5 h-3.5" />Products</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-lg text-xs gap-1"><Tag className="w-3.5 h-3.5" />Categories</TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg text-xs gap-1"><User className="w-3.5 h-3.5" />Users</TabsTrigger>
            <TabsTrigger value="vehicles" className="rounded-lg text-xs gap-1"><Truck className="w-3.5 h-3.5" />Vehicles</TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-lg text-xs gap-1"><Truck className="w-3.5 h-3.5" />Bookings</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg text-xs gap-1"><CreditCard className="w-3.5 h-3.5" />Payment Methods</TabsTrigger>
            <TabsTrigger value="payment_requests" className="rounded-lg text-xs gap-1"><CreditCard className="w-3.5 h-3.5" />Requests</TabsTrigger>
            <TabsTrigger value="custom_requests" className="rounded-lg text-xs gap-1"><FileText className="w-3.5 h-3.5" />Custom Slips</TabsTrigger>
            <TabsTrigger value="sliders" className="rounded-lg text-xs gap-1"><ImageIcon className="w-3.5 h-3.5" />Sliders</TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-lg text-xs gap-1"><Megaphone className="w-3.5 h-3.5" />Notifications</TabsTrigger>
            <TabsTrigger value="promo_boxes" className="rounded-lg text-xs gap-1"><Gift className="w-3.5 h-3.5" />Promo Boxes</TabsTrigger>
            <TabsTrigger value="coupons" className="rounded-lg text-xs gap-1"><Ticket className="w-3.5 h-3.5" />Coupons</TabsTrigger>
            <TabsTrigger value="app_settings" className="rounded-lg text-xs gap-1"><ShieldCheck className="w-3.5 h-3.5" />App Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {[
                { label: "Total Orders", value: stats?.totalOrders ?? "—", urdu: "کل آرڈر" },
                { label: "Revenue", value: `Rs. ${stats?.totalRevenue?.toFixed(0) ?? "—"}`, urdu: "آمدنی" },
                { label: "Pending Orders", value: stats?.pendingOrders ?? "—", urdu: "زیرِ التواء" },
                { label: "Delivered", value: stats?.deliveredOrders ?? "—", urdu: "پہنچائے گئے" },
                { label: "Total Bookings", value: stats?.totalBookings ?? "—", urdu: "بکنگز" },
                { label: "Total Products", value: stats?.totalProducts ?? "—", urdu: "مصنوعات" },
              ].map((s) => (
                <div key={s.label} className="bg-card border rounded-xl p-4 text-right shadow-sm">
                  <p className="text-2xl font-bold text-primary">{statsLoading ? "..." : s.value}</p>
                  <p className="urdu-text text-sm text-muted-foreground">{s.urdu}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders"><AdminOrders /></TabsContent>
          <TabsContent value="products"><AdminProducts /></TabsContent>
          <TabsContent value="categories"><AdminCategories /></TabsContent>
          <TabsContent value="users"><AdminUsers /></TabsContent>
          <TabsContent value="vehicles"><AdminVehicles /></TabsContent>
          <TabsContent value="bookings"><AdminBookings /></TabsContent>
          <TabsContent value="payments"><AdminPayments /></TabsContent>
          <TabsContent value="payment_requests"><AdminPaymentRequests /></TabsContent>
          <TabsContent value="custom_requests"><AdminCustomRequests /></TabsContent>
          <TabsContent value="sliders"><AdminSliders /></TabsContent>
          <TabsContent value="notifications"><AdminNotifications /></TabsContent>
          <TabsContent value="promo_boxes"><PromoBoxesTab /></TabsContent>
          <TabsContent value="coupons"><AdminCoupons /></TabsContent>
          <TabsContent value="app_settings"><AppSettingsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function AdminOrders() {
  const { data: orders } = useOrders();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);


  const handleStatusChange = (id: string, status: string) => {
    updateOrder.mutate({ id, data: { status: status as "pending" | "packed" | "on_the_way" | "delivered" } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["orders"] }); toast({ title: "Status updated" }); },
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteOrder.mutate(deleteId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        toast({ title: "Order deleted successfully" });
        setDeleteId(null);
      }
    });
  };

  const openEditablePDF = (order: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to edit and download PDF!");
      return;
    }

    const itemsHTML = order.items.map((item: any) => `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td contenteditable="true" style="padding: 8px; text-align: right; font-weight: bold; border: 1px solid #cbd5e1;">${item.productNameUrdu}</td>
        <td contenteditable="true" style="padding: 8px; text-align: center; font-family: Arial, sans-serif; border: 1px solid #cbd5e1;">${item.quantity} ${item.unit}</td>
        <td contenteditable="true" style="padding: 8px; text-align: center; font-family: Arial, sans-serif; border: 1px solid #cbd5e1;">Rs. ${item.price}</td>
        <td contenteditable="true" style="padding: 8px; text-align: left; font-family: Arial, sans-serif; font-weight: bold; border: 1px solid #cbd5e1;">Rs. ${item.price * item.quantity}</td>
      </tr>
    `).join("");

    const logoSvg = `<svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="logo-grad-1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2563eb" /><stop offset="100%" stop-color="#1e3a8a" /></linearGradient><linearGradient id="logo-grad-2" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ef4444" /><stop offset="100%" stop-color="#991b1b" /></linearGradient><filter id="logo-shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.2" /></filter></defs><rect x="5" y="5" width="90" height="90" rx="24" fill="url(#logo-grad-1)" filter="url(#logo-shadow)" /><path d="M50 25 L20 48 H30 V75 H70 V48 H80 Z" fill="white" /><path d="M40 75 V55 C40 48, 60 48, 60 55 V75" fill="url(#logo-grad-1)" /><path d="M35 32 C35 18, 65 18, 65 32" fill="none" stroke="white" stroke-width="6" stroke-linecap="round" /><circle cx="50" cy="50" r="5" fill="url(#logo-grad-2)" /></svg>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ur">
      <head>
        <meta charset="utf-8">
        <title>بل پی ڈی ایف - ${order.trackingNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">
        <style>
          @media print {
            body {
              margin: 0;
              padding: 0;
              background-color: #fff;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: A4 portrait;
              margin: 0.4in;
            }
            .no-print {
              display: none !important;
            }
            .invoice-box {
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
            }
          }
          body {
            font-family: 'Noto Nastaliq Urdu', 'Segoe UI', serif;
            color: #0f172a;
            line-height: 1.5;
            padding: 20px;
            background-color: #f1f5f9;
          }
          .editor-bar {
            max-width: 800px;
            margin: 0 auto 20px auto;
            background: #1e293b;
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }
          .editor-bar-text {
            font-size: 13px;
            font-weight: 500;
          }
          .download-btn {
            background: #ef4444;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .download-btn:hover {
            background: #dc2626;
            transform: scale(1.02);
          }
          .invoice-box {
            max-width: 800px;
            margin: auto;
            border: 1px solid #cbd5e1;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05);
            background: #fff;
            position: relative;
            overflow: hidden;
          }
          .diagonal-accent {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 14px;
            background: linear-gradient(135deg, #1e3a8a 65%, #facc15 35%);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
            border-bottom: 3px double #94a3b8;
            padding-bottom: 16px;
          }
          .header-right {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-container {
            background: #fff;
            padding: 4px;
            border-radius: 50%;
            border: 2px solid #1e3a8a;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .app-title {
            font-size: 32px;
            font-weight: 700;
            margin: 0;
            color: #1e3a8a;
            line-height: 1;
          }
          .app-subtitle {
            font-size: 10px;
            color: #64748b;
            margin: 10px 0 0 0;
          }
          .header-left {
            text-align: left;
          }
          .invoice-title {
            font-family: sans-serif;
            font-size: 20px;
            font-weight: 800;
            margin: 0;
            color: #1e3a8a;
            letter-spacing: 1px;
          }
          .invoice-meta {
            font-family: sans-serif;
            font-size: 12px;
            margin: 4px 0 0 0;
            color: #475569;
          }
          .customer-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px;
            margin: 24px 0;
          }
          .customer-title {
            font-size: 15px;
            font-weight: 700;
            margin: 0 0 10px 0;
            color: #1e3a8a;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 6px;
          }
          .customer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            font-size: 13px;
          }
          .customer-phone {
            font-family: sans-serif;
            direction: ltr;
            text-align: right;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 24px 0;
            font-size: 13px;
          }
          .items-table th {
            background-color: #1e3a8a;
            color: white;
            padding: 10px;
            border: 1px solid #1e3a8a;
            font-weight: bold;
          }
          .items-table td[contenteditable="true"]:hover,
          [contenteditable="true"]:hover {
            background-color: #fef08a !important;
            outline: 2px dashed #facc15;
            cursor: pointer;
          }
          .summary-container {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
            border-top: 2px dashed #94a3b8;
            padding-top: 16px;
            font-size: 14px;
          }
          .summary-row {
            width: 100%;
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .summary-total {
            width: 100%;
            display: flex;
            justify-content: space-between;
            background: #fef08a;
            border: 1.5px solid #facc15;
            padding: 12px;
            border-radius: 10px;
            font-weight: 900;
            font-size: 20px;
            color: #1e3a8a;
            box-sizing: border-box;
          }
          .footer-section {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #cbd5e1;
            padding-top: 16px;
            font-size: 11px;
            color: #475569;
          }
          .payment-badge {
            font-weight: bold;
            color: #1e3a8a;
          }
        </style>
      </head>
      <body>
        <div class="editor-bar no-print">
          <div class="editor-bar-text">📝 بل میں کسی بھی جگہ کلک کر کے اسے اپنی مرضی سے تبدیل (Edit) کریں، پھر دائیں جانب موجود بٹن سے پی ڈی ایف ڈاؤن لوڈ کریں۔</div>
          <button class="download-btn" onclick="window.print()">پی ڈی ایف ڈاؤن لوڈ کریں (Save PDF)</button>
        </div>

        <div class="invoice-box">
          <div class="diagonal-accent"></div>
          
          <div class="header">
            <div class="header-right">
              <div class="logo-container">${logoSvg}</div>
              <div>
                <h1 class="app-title">دکان گھر</h1>
                <p class="app-subtitle">آپ کی روزمرہ کی ضروریات کا گھر</p>
              </div>
            </div>
            <div class="header-left">
              <h2 class="invoice-title">DELIVERY NOTE / بل</h2>
              <p class="invoice-meta"><b>بل نمبر:</b> <span contenteditable="true">${order.trackingNumber}</span></p>
              <p class="invoice-meta"><b>تاریخ:</b> <span contenteditable="true">${new Date(order.createdAt).toLocaleDateString("ur-PK")}</span></p>
            </div>
          </div>

          <div class="customer-card">
            <h3 class="customer-title">گاہک کی تفصیلات (Customer Details)</h3>
            <div class="customer-grid">
              <div><b>گاہک کا نام:</b> <span contenteditable="true">${order.customerName}</span></div>
              <div class="customer-phone"><b>موبائل نمبر:</b> <span contenteditable="true">${order.customerPhone}</span></div>
              <div style="grid-column: span 2;"><b>پتہ:</b> <span contenteditable="true">${order.address || "بذریعہ دکان گھر ایپ"}</span></div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">تفصیل اشیاء (Product Description)</th>
                <th style="width: 15%;">مقدار (Qty)</th>
                <th style="width: 15%;">قیمت (Price)</th>
                <th style="width: 20%; text-align: left;">کل رقم (Total)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div class="summary-container">
            <div class="summary-row">
              <span>شاپنگ بل کل رقم (Subtotal):</span>
              <span>Rs. <span contenteditable="true">${order.subtotal || (order.total - (order.deliveryCharges || 0))}</span></span>
            </div>
            <div class="summary-row">
              <span>ڈیلیوری چارجز (Delivery Charges):</span>
              <span>Rs. <span contenteditable="true">${order.deliveryCharge || order.deliveryCharges || 0}</span></span>
            </div>
            ${order.discountAmount ? `
            <div class="summary-row" style="color: #16a34a;">
              <span>ڈسکاؤنٹ (Discount) - ${order.couponCode || 'Coupon'}:</span>
              <span>- Rs. <span contenteditable="true">${order.discountAmount}</span></span>
            </div>
            ` : ''}
            <div class="summary-total">
              <span>قابلِ ادائیگی رقم (Grand Total):</span>
              <span>Rs. <span contenteditable="true">${order.total}</span></span>
            </div>
          </div>

          <div class="footer-section">
            <div><b>طریقہ ادائیگی:</b> <span class="payment-badge" contenteditable="true">${order.paymentMethod === "online" ? "آن لائن پیمنٹ (Online)" : order.paymentMethod === "wallet" ? "اکاؤنٹ والیٹ (Wallet)" : "کیش آن ڈیلیوری (COD)"}</span></div>
            <div contenteditable="true">شکریہ! دکان گھر کا حصہ بننے پر خوش آمدید۔</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const printA4Bill = (order: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print!");
      return;
    }

    const itemsHTML = order.items.map((item: any) => `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 6px 8px; text-align: right; font-weight: bold; border: 1px solid #cbd5e1;">${item.productNameUrdu}</td>
        <td style="padding: 6px 8px; text-align: center; font-family: Arial, sans-serif; border: 1px solid #cbd5e1;">${item.quantity} ${item.unit}</td>
        <td style="padding: 6px 8px; text-align: center; font-family: Arial, sans-serif; border: 1px solid #cbd5e1;">Rs. ${item.price}</td>
        <td style="padding: 6px 8px; text-align: left; font-family: Arial, sans-serif; font-weight: bold; border: 1px solid #cbd5e1;">Rs. ${item.price * item.quantity}</td>
      </tr>
    `).join("");

    const logoSvg = `<svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="logo-grad-1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2563eb" /><stop offset="100%" stop-color="#1e3a8a" /></linearGradient><linearGradient id="logo-grad-2" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ef4444" /><stop offset="100%" stop-color="#991b1b" /></linearGradient><filter id="logo-shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.2" /></filter></defs><rect x="5" y="5" width="90" height="90" rx="24" fill="url(#logo-grad-1)" filter="url(#logo-shadow)" /><path d="M50 25 L20 48 H30 V75 H70 V48 H80 Z" fill="white" /><path d="M40 75 V55 C40 48, 60 48, 60 55 V75" fill="url(#logo-grad-1)" /><path d="M35 32 C35 18, 65 18, 65 32" fill="none" stroke="white" stroke-width="6" stroke-linecap="round" /><circle cx="50" cy="50" r="5" fill="url(#logo-grad-2)" /></svg>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ur">
      <head>
        <meta charset="utf-8">
        <title>بل نمبر - ${order.trackingNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">
        <style>
          @media print {
            body {
              margin: 0;
              padding: 0;
              background-color: #fff;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: A4 portrait;
              margin: 0.4in;
            }
            .no-print {
              display: none !important;
            }
          }
          body {
            font-family: 'Noto Nastaliq Urdu', 'Segoe UI', serif;
            color: #0f172a;
            line-height: 1.5;
            padding: 20px;
          }
          .invoice-box {
            max-width: 800px;
            margin: auto;
            border: 1px solid #cbd5e1;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
            background: #fff;
            position: relative;
            overflow: hidden;
          }
          .diagonal-accent {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 12px;
            background: linear-gradient(135deg, #1e3a8a 65%, #facc15 35%);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
            border-bottom: 3px double #94a3b8;
            padding-bottom: 16px;
          }
          .header-right {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-container {
            background: #fff;
            padding: 4px;
            border-radius: 50%;
            border: 2px solid #1e3a8a;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .app-title {
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: #1e3a8a;
            line-height: 1.2;
          }
          .app-subtitle {
            font-size: 11px;
            color: #64748b;
            margin: 12px 0 0 0;
          }
          .header-left {
            text-align: left;
          }
          .invoice-title {
            font-family: sans-serif;
            font-size: 18px;
            font-weight: 800;
            margin: 0;
            color: #1e3a8a;
            letter-spacing: 1px;
          }
          .invoice-meta {
            font-family: sans-serif;
            font-size: 11px;
            margin: 4px 0 0 0;
            color: #475569;
          }
          .customer-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px;
            margin: 20px 0;
          }
          .customer-title {
            font-size: 15px;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: #1e3a8a;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
          }
          .customer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            font-size: 13px;
          }
          .customer-phone {
            font-family: sans-serif;
            direction: ltr;
            text-align: right;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 13px;
          }
          .items-table th {
            background-color: #1e3a8a;
            color: white;
            padding: 8px 10px;
            border: 1px solid #1e3a8a;
            font-weight: bold;
          }
          .summary-container {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
            border-top: 2px dashed #94a3b8;
            padding-top: 14px;
            font-size: 14px;
          }
          .summary-row {
            width: 100%;
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
          }
          .summary-total {
            width: 100%;
            display: flex;
            justify-content: space-between;
            background: #fef08a;
            border: 1.5px solid #facc15;
            padding: 10px;
            border-radius: 8px;
            font-weight: 900;
            font-size: 18px;
            color: #1e3a8a;
            box-sizing: border-box;
          }
          .footer-section {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #cbd5e1;
            padding-top: 14px;
            font-size: 11px;
            color: #475569;
          }
          .payment-badge {
            font-weight: bold;
            color: #1e3a8a;
          }
          .bill-stamp {
            position: absolute;
            top: 25px;
            right: 280px;
            border: 4px double #dc2626;
            color: #dc2626;
            padding: 4px 12px;
            border-radius: 6px;
            text-align: center;
            font-family: sans-serif;
            font-weight: 900;
            font-size: 16px;
            letter-spacing: 1px;
            transform: rotate(-8deg);
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 0 0 2px #fff;
            z-index: 10;
            opacity: 0.9;
            display: inline-block;
          }
          .bill-stamp-title {
            font-size: 20px;
            line-height: 1;
            margin: 0;
            font-weight: 900;
          }
          .bill-stamp-sub {
            font-size: 8px;
            letter-spacing: 0.5px;
            margin-top: 2px;
            font-weight: bold;
          }
          .bill-stamp-cod {
            border-color: #0f766e;
            color: #0f766e;
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="diagonal-accent"></div>
          
          ${order.paymentMethod === "online" ? `
            <div class="bill-stamp">
              <div class="bill-stamp-title">PAID</div>
              <div class="bill-stamp-sub">دکان گھر DUKAN GHAR</div>
            </div>
          ` : `
            <div class="bill-stamp bill-stamp-cod">
              <div class="bill-stamp-title">C.O.D</div>
              <div class="bill-stamp-sub">دکان گھر DUKAN GHAR</div>
            </div>
          `}
          
          <div class="header">
            <div class="header-right">
              <div class="logo-container">${logoSvg}</div>
              <div>
                <h1 class="app-title">دکان گھر</h1>
                <p class="app-subtitle" style="margin-top: 10px;">آپ کی روزمرہ کی ضروریات کا گھر</p>
              </div>
            </div>
            <div class="header-left">
              <h2 class="invoice-title">DELIVERY NOTE / بل</h2>
              <p class="invoice-meta"><b>نمبر:</b> ${order.trackingNumber}</p>
              <p class="invoice-meta"><b>تاریخ:</b> ${new Date(order.createdAt).toLocaleDateString("ur-PK")}</p>
            </div>
          </div>

          <div class="customer-card">
            <h3 class="customer-title">گاہک کی تفصیلات (Customer Details)</h3>
            <div class="customer-grid">
              <div><b>گاہک کا نام:</b> ${order.customerName}</div>
              <div class="customer-phone"><b>موبائل نمبر:</b> <span>${order.customerPhone}</span></div>
              <div style="grid-column: span 2;"><b>پتہ:</b> ${order.address || "بذریعہ دکان گھر ایپ"}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">تفصیل اشیاء (Product Description)</th>
                <th style="width: 15%;">مقدار (Qty)</th>
                <th style="width: 15%;">قیمت (Price)</th>
                <th style="width: 20%; text-align: left;">کل رقم (Total)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div class="summary-container">
            <div class="summary-row">
              <span>شاپنگ بل کل رقم (Subtotal):</span>
              <span style="font-family: Arial, sans-serif;">Rs. ${order.subtotal || (order.total - (order.deliveryCharges || 0))}</span>
            </div>
            <div class="summary-row">
              <span>Rs. ${order.deliveryCharge || order.deliveryCharges || 0}</span>
            </div>
            ${order.discountAmount ? `
            <div class="summary-row" style="color: #16a34a;">
              <span>ڈسکاؤنٹ (Discount) - ${order.couponCode || 'Coupon'}:</span>
              <span>- Rs. ${order.discountAmount}</span>
            </div>
            ` : ''}
            <div class="summary-total">
              <span>قابلِ ادائیگی رقم (Grand Total):</span>
              <span style="font-family: Arial, sans-serif;">Rs. ${order.total}</span>
            </div>
          </div>

          <div class="footer-section">
            <div><b>طریقہ ادائیگی:</b> <span class="payment-badge">${order.paymentMethod === "online" ? "آن لائن پیمنٹ (Online)" : order.paymentMethod === "wallet" ? "اکاؤنٹ والیٹ (Wallet)" : "کیش آن ڈیلیوری (COD)"}</span></div>
            <div>شکریہ! دکان گھر کا حصہ بننے پر خوش آمدید۔</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="urdu-text text-xl font-bold text-right">آرڈر مینجمنٹ</h2>
      {orders?.map(o => (
        <div key={o.id} className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Select defaultValue={o.status} onValueChange={v => handleStatusChange(o.id, v)}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}><span className="urdu-text text-xs">{STATUS_LABELS[s]}</span></SelectItem>)}</SelectContent>
              </Select>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(o.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-primary">{o.trackingNumber}</p>
              <p className="text-xs text-muted-foreground">{o.customerName} — {o.customerPhone}</p>
              {o.createdAt && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                  <span>{new Date(o.createdAt).toLocaleString("ur-PK", { dateStyle: "short", timeStyle: "short" })}</span>
                  <Clock className="w-3 h-3" />
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t pt-2 mb-3">
            <p className="text-[10px] font-bold text-muted-foreground urdu-text text-right">مصنوعات کی تفصیل:</p>
            {o.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-xs">
                <span>Rs. {item.price * item.quantity}</span>
                <span className="urdu-text">{item.productNameUrdu} × {item.quantity} {item.unit}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 border-t pt-3">
            <div className="flex items-center gap-2">
              {o.paymentMethod === "online" ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] py-0 h-5">Online Payment</Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-[10px] py-0 h-5">COD</Badge>
              )}
              
              {o.paymentScreenshot && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1">
                      <Eye className="w-3 h-3" /> View Pic
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[400px] w-[95vw] rounded-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b">
                      <DialogTitle className="text-sm urdu-text text-right">پیمنٹ اسکرین شاٹ</DialogTitle>
                      <DialogDescription className="sr-only">پیمنٹ اسکرین شاٹ کی تصویر</DialogDescription>
                    </DialogHeader>
                    <div className="p-2 bg-muted/20">
                      <img src={o.paymentScreenshot} alt="Payment Screenshot" className="w-full h-auto max-h-[70vh] object-contain rounded-lg" />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            <div className="text-right text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-bold text-primary">Rs. {o.total}</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end border-t pt-2.5 mt-2">
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              onClick={() => printA4Bill(o)}
              className="h-8 text-xs font-semibold gap-1.5 border-primary/20 hover:bg-primary/5 text-primary"
            >
              <Printer className="w-3.5 h-3.5" /> Print Bill (A4)
            </Button>
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              onClick={() => openEditablePDF(o)}
              className="h-8 text-xs font-semibold gap-1.5 border-red-200 hover:bg-red-50 text-red-700 dark:hover:bg-red-950/20"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </Button>
          </div>
        </div>
      ))}
      <DeleteConfirmDialog 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={handleDelete}
        isPending={deleteOrder.isPending}
      />
    </div>
  );
}

function AdminProducts() {
  const { data: products } = useProducts();
  const { data: categories } = useCategories({ type: "product" });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [nameUrdu, setNameUrdu] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [unit, setUnit] = useState("kg");
  const [stock, setStock] = useState("10");
  const [catId, setCatId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedImg, setExpandedImg] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const createNotification = useCreateNotification();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate({
        name, nameUrdu, price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        unit: unit as "kg" | "gram" | "liter" | "pound" | "piece",
        stock: Number(stock),
        categoryId: catId || null,
        featured: false,
        imageUrl: imageUrl || null,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        
        // Auto-Notification Trigger
        const templates = [
          { t: `نئی آمد: ${nameUrdu} 🔥`, d: `شاندار معیار اور بہترین قیمت! اب صرف Rs. ${price} میں دستیاب۔` },
          { t: `OMG! ${nameUrdu} اب اسٹاک میں 😱`, d: `جلدی کریں، اسٹاک ختم ہونے سے پہلے اپنا آرڈر بک کریں!` },
          { t: `دھماکہ خیز ڈیل: ${nameUrdu} 🚀`, d: `آپ کی پسندیدہ پروڈکٹ اب نئی قیمت کے ساتھ۔ ابھی وزٹ کریں!` }
        ];
        const pick = templates[Math.floor(Math.random() * templates.length)];
        createNotification.mutate({
          title: pick.t,
          description: pick.d,
          imageUrl: imageUrl || null,
          type: 'alert',
          linkUrl: `/products?search=${name}`
        });

        setName(""); setNameUrdu(""); setPrice(""); setOriginalPrice(""); setStock("10"); setImageUrl("");
        toast({ title: "Product added!" });
      },
    });
  };

  const handleSaveImage = (id: string, url: string | null) => {
    updateProduct.mutate({ id, data: { imageUrl: url } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        setExpandedImg(null);
        toast({ title: url ? "تصویر محفوظ ہو گئی!" : "تصویر ہٹا دی گئی" });
      },
    });
  };

  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProduct.mutate({
      id: editingProduct,
      data: {
        ...editForm,
        price: Number(editForm.price),
        originalPrice: editForm.originalPrice ? Number(editForm.originalPrice) : null,
        stock: Number(editForm.stock),
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        setEditingProduct(null);
        setEditForm(null);
        toast({ title: "Product updated successfully!" });
      }
    });
  };

  const startEdit = (p: Product) => {
    setEditingProduct(p.id);
    setEditForm({ ...p });
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="urdu-text text-xl font-bold text-right">مصنوعات مینجمنٹ</h2>

      {/* Edit Form Modal/Panel */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-md w-[95vw] rounded-2xl p-5 gap-4">
          <DialogHeader>
            <DialogTitle className="urdu-text text-right text-lg font-bold">پروڈکٹ ایڈٹ کریں</DialogTitle>
            <DialogDescription className="sr-only">پروڈکٹ کی معلومات تبدیل کرنے کا فارم</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateInfo} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">English Name</label>
                <Input value={editForm?.name || ""} onChange={e => setEditForm({...editForm, name: e.target.value})} className="h-9" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase text-right block">Urdu Name</label>
                <Input value={editForm?.nameUrdu || ""} onChange={e => setEditForm({...editForm, nameUrdu: e.target.value})} className="h-9 text-right urdu-text" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">Price (Rs.)</label>
                <Input type="number" value={editForm?.price || ""} onChange={e => setEditForm({...editForm, price: e.target.value})} className="h-9" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">Cutting Price</label>
                <Input type="number" value={editForm?.originalPrice || ""} onChange={e => setEditForm({...editForm, originalPrice: e.target.value})} className="h-9" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">Stock</label>
                <Input type="number" value={editForm?.stock || ""} onChange={e => setEditForm({...editForm, stock: e.target.value})} className="h-9" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">Unit</label>
                <Select value={editForm?.unit || "kg"} onValueChange={v => setEditForm({...editForm, unit: v})}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[110]">{UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase">Category</label>
              <Select value={editForm?.categoryId || ""} onValueChange={v => setEditForm({...editForm, categoryId: v})}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[110]">{categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nameUrdu}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase">Image URL</label>
              <Input value={editForm?.imageUrl || ""} onChange={e => setEditForm({...editForm, imageUrl: e.target.value})} className="h-9 text-[10px]" />
            </div>

            <div className="flex gap-2 mt-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setEditingProduct(null)}>Cancel</Button>
              <Button type="submit" disabled={updateProduct.isPending} className="flex-1 rounded-xl urdu-text">محفوظ کریں</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Form */}
      <form onSubmit={handleCreate} className="bg-card border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
        <h3 className="font-semibold text-sm">نئی مصنوعہ شامل کریں</h3>
        <div className="grid grid-cols-2 gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name (English)" required />
          <Input value={nameUrdu} onChange={e => setNameUrdu(e.target.value)} placeholder="نام (اردو)" className="text-right urdu-text" required />
          <Input value={price} onChange={e => setPrice(e.target.value)} placeholder="Current Price (Rs.)" type="number" required />
          <Input value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} placeholder="Cutting Price (Optional)" type="number" />
          <Input value={stock} onChange={e => setStock(e.target.value)} placeholder="Stock" type="number" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={catId} onValueChange={setCatId}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ImageIcon className="w-3 h-3" /> تصویر (URL یا فائل)</p>
            <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload File"}
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          </div>
          <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="text-xs" />
          {imageUrl && (
            <div className="w-full h-24 bg-muted rounded-lg overflow-hidden flex items-center justify-center border">
              <img src={imageUrl} alt="preview" className="h-full w-full object-contain" onError={e => (e.currentTarget.style.display = "none")} />
            </div>
          )}
        </div>
        <Button type="submit" disabled={createProduct.isPending || isUploading} size="sm">Add Product</Button>
      </form>

      {/* Product List */}
      <div className="flex flex-col gap-2">
        {products?.map(p => (
          <div key={p.id} className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 p-3">
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg bg-muted/40 border flex items-center justify-center shrink-0 overflow-hidden">
                {p.imageUrl
                  ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  : <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                }
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0 text-right">
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="urdu-text text-xs text-muted-foreground truncate">{p.nameUrdu}</p>
                <p className="text-xs text-primary font-semibold">Rs. {p.price} / {p.unit}</p>
              </div>
              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 w-full"
                  onClick={() => startEdit(p)}
                >
                  <Pencil className="w-3 h-3" />
                  Edit Info
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs w-full"
                  onClick={() => deleteProduct.mutate(p.id, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }) })}
                >
                  Delete
                </Button>
              </div>
            </div>
            {/* Inline image edit panel */}
            {expandedImg === p.id && (
              <div className="px-3 pb-3">
                <ImageEditRow
                  currentUrl={p.imageUrl}
                  onSave={(url) => handleSaveImage(p.id, url)}
                  isPending={updateProduct.isPending}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminCategories() {
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [nameUrdu, setNameUrdu] = useState("");
  const [type, setType] = useState<"product" | "vehicle">("product");
  const [icon, setIcon] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedIcon, setExpandedIcon] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createCategory.mutate({ name, nameUrdu, type, icon: icon || null, imageUrl: imageUrl || null }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        setName(""); setNameUrdu(""); setIcon(""); setImageUrl("");
        toast({ title: "Category added!" });
      },
    });
  };

  const handleSaveIcon = (id: string, newIcon: string | null, newImageUrl: string | null) => {
    updateCategory.mutate({ id, data: { icon: newIcon, imageUrl: newImageUrl } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        setExpandedIcon(null);
        toast({ title: "زمرہ اپڈیٹ ہو گیا!" });
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="urdu-text text-xl font-bold text-right">زمرہ مینجمنٹ</h2>

      {/* Create Form */}
      <form onSubmit={handleCreate} className="bg-card border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
        <h3 className="font-semibold text-sm">نیا زمرہ شامل کریں</h3>
        <div className="grid grid-cols-2 gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name (English)" required />
          <Input value={nameUrdu} onChange={e => setNameUrdu(e.target.value)} placeholder="نام (اردو)" className="text-right urdu-text" required />
        </div>
        <Select value={type} onValueChange={v => setType(v as "product" | "vehicle")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="product">Product</SelectItem><SelectItem value="vehicle">Vehicle</SelectItem></SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Emoji آئیکن (مثلاً 🥦 🐄)</p>
            <Input value={icon} onChange={e => setIcon(e.target.value)} placeholder="🥦" className="text-center text-xl" maxLength={4} />
          </div>
          <div className="flex flex-col gap-1 items-center justify-center">
            {icon && <span className="text-4xl">{icon}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ImageIcon className="w-3 h-3" /> تصویر (URL یا فائل)</p>
            <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload File"}
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          </div>
          <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="یا تصویر کا URL paste کریں" className="text-xs" />
          {imageUrl && (
            <div className="w-full h-20 bg-muted rounded-lg overflow-hidden flex items-center justify-center border">
              <img src={imageUrl} alt="preview" className="h-full w-full object-contain" onError={e => (e.currentTarget.style.display = "none")} />
            </div>
          )}
        </div>
        <Button type="submit" size="sm" disabled={createCategory.isPending || isUploading}>Add Category</Button>
      </form>

      {/* Category List */}
      <div className="flex flex-col gap-2">
        {categories?.map(c => (
          <div key={c.id} className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 p-3">
              {/* Icon / Image preview */}
              <div className="w-14 h-14 rounded-xl bg-muted/40 border flex items-center justify-center shrink-0 overflow-hidden">
                {c.imageUrl
                  ? <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                  : c.icon
                    ? <span className="text-3xl">{c.icon}</span>
                    : <Tag className="w-5 h-5 text-muted-foreground/40" />
                }
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0 text-right">
                <p className="font-medium text-sm truncate">{c.name}</p>
                <p className="urdu-text text-xs text-muted-foreground truncate">{c.nameUrdu}</p>
                <Badge variant="outline" className="text-xs">{c.type}</Badge>
              </div>
              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 w-full"
                  onClick={() => setExpandedIcon(expandedIcon === c.id ? null : c.id)}
                >
                  <ImageIcon className="w-3 h-3" />
                  {c.icon || c.imageUrl ? "Edit" : "Add"} Icon
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs w-full"
                  onClick={() => deleteCategory.mutate(c.id, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }) })}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Inline icon/image edit panel */}
            {expandedIcon === c.id && (
              <CategoryIconEdit
                currentIcon={c.icon}
                currentImageUrl={c.imageUrl}
                onSave={(newIcon, newImageUrl) => handleSaveIcon(c.id, newIcon, newImageUrl)}
                isPending={updateCategory.isPending}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryIconEdit({ currentIcon, currentImageUrl, onSave, isPending }: {
  currentIcon: string | null | undefined;
  currentImageUrl: string | null | undefined;
  onSave: (icon: string | null, imageUrl: string | null) => void;
  isPending: boolean;
}) {
  const [icon, setIcon] = useState(currentIcon || "");
  const [imageUrl, setImageUrl] = useState(currentImageUrl || "");
  return (
    <div className="flex flex-col gap-3 border-t bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ImageIcon className="w-3 h-3" /> آئیکن یا تصویر تبدیل کریں</p>
      {/* Emoji icon */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Emoji آئیکن (مثلاً 🥦 🛺)</p>
          <Input value={icon} onChange={e => setIcon(e.target.value)} placeholder="Emoji paste کریں" className="text-center text-xl" maxLength={4} />
        </div>
        {icon && <span className="text-4xl">{icon}</span>}
      </div>
      {/* Image URL */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">یا تصویر کا URL</p>
        <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/icon.png" className="text-xs" />
        {imageUrl && (
          <div className="w-full h-24 bg-muted rounded-lg overflow-hidden flex items-center justify-center border mt-2">
            <img src={imageUrl} alt="preview" className="h-full w-full object-contain" onError={e => (e.currentTarget.style.display = "none")} />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(icon || null, imageUrl || null)} disabled={isPending} className="h-7 text-xs gap-1">
          <Check className="w-3 h-3" /> محفوظ کریں
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onSave(null, null)} disabled={isPending} className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
          <X className="w-3 h-3" /> ہٹائیں
        </Button>
      </div>
    </div>
  );
}

function AdminVehicles() {
  const { data: vehicles } = useVehicles();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [nameUrdu, setNameUrdu] = useState("");
  const [type, setType] = useState("rickshaw");
  const [rent, setRent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [expandedImg, setExpandedImg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createVehicle.mutate({
        name, nameUrdu,
        type: type as "rickshaw" | "chigchi" | "carry_bolan" | "car" | "high_roof" | "bus",
        baseRent: Number(rent),
        imageUrl: imageUrl || null,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        setName(""); setNameUrdu(""); setRent(""); setImageUrl("");
        toast({ title: "Vehicle added!" });
      },
    });
  };

  const handleSaveImage = (id: string, url: string | null) => {
    updateVehicle.mutate({ id, data: { imageUrl: url } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        setExpandedImg(null);
        toast({ title: url ? "تصویر محفوظ ہو گئی!" : "تصویر ہٹا دی گئی" });
      },
    });
  };

  const VEHICLE_TYPE_URDU: Record<string, string> = {
    rickshaw: "رکشہ", chigchi: "چنگچی", carry_bolan: "کیری بولان",
    car: "گاڑی", high_roof: "ہائی روف", bus: "بس",
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="urdu-text text-xl font-bold text-right">گاڑی مینجمنٹ</h2>

      {/* Create Form */}
      <form onSubmit={handleCreate} className="bg-card border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
        <h3 className="font-semibold text-sm">نئی گاڑی شامل کریں</h3>
        <div className="grid grid-cols-2 gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name (English)" required />
          <Input value={nameUrdu} onChange={e => setNameUrdu(e.target.value)} placeholder="نام (اردو)" className="urdu-text text-right" required />
          <Input value={rent} onChange={e => setRent(e.target.value)} placeholder="Base Rent (Rs.)" type="number" required />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{VEHICLE_TYPE_URDU[t] || t} ({t})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {/* Image URL for new vehicle */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ImageIcon className="w-3 h-3" /> تصویر (URL یا فائل)</p>
            <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload File"}
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          </div>
          <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="یا تصویر کا URL paste کریں" className="text-xs" />
          {imageUrl && (
            <div className="w-full h-24 bg-muted rounded-lg overflow-hidden flex items-center justify-center border">
              <img src={imageUrl} alt="preview" className="h-full w-full object-contain" />
            </div>
          )}
        </div>
        <Button type="submit" size="sm" disabled={createVehicle.isPending}>Add Vehicle</Button>
      </form>

      {/* Vehicle List */}
      <div className="flex flex-col gap-2">
        {vehicles?.map(v => (
          <div key={v.id} className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 p-3">
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg bg-muted/40 border flex items-center justify-center shrink-0 overflow-hidden">
                {v.imageUrl
                  ? <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" />
                  : <Truck className="w-5 h-5 text-muted-foreground/40" />
                }
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0 text-right">
                <p className="font-medium text-sm truncate">{v.name}</p>
                <p className="urdu-text text-xs text-muted-foreground truncate">{v.nameUrdu}</p>
                <p className="text-xs text-primary font-semibold">Rs. {v.baseRent}+ | {v.type}</p>
              </div>
              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 w-full"
                  onClick={() => setExpandedImg(expandedImg === v.id ? null : v.id)}
                >
                  <ImageIcon className="w-3 h-3" />
                  {v.imageUrl ? "Edit" : "Add"} Pic
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs w-full"
                  onClick={() => deleteVehicle.mutate(v.id, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }) })}
                >
                  Delete
                </Button>
              </div>
            </div>
            {/* Inline image edit panel */}
            {expandedImg === v.id && (
              <div className="px-3 pb-3">
                <ImageEditRow
                  currentUrl={v.imageUrl}
                  onSave={(url) => handleSaveImage(v.id, url)}
                  isPending={updateVehicle.isPending}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminBookings() {
  const { data: bookings } = useBookings();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Record<string, any>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);


  const handleDelete = () => {
    if (!deleteId) return;
    deleteBooking.mutate(deleteId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        toast({ title: "Booking deleted successfully" });
        setDeleteId(null);
      }
    });
  };

  const startEdit = (b: any) => {
    setEditing(prev => ({ 
      ...prev, 
      [b.id]: { 
        adminAddress: b.adminAddress || "", 
        agreedRent: b.agreedRent?.toString() || "",
        pickupAddress: b.pickupAddress || "",
        dropoffAddress: b.dropoffAddress || "",
        passengersDetail: b.passengersDetail || "",
        luggageDetail: b.luggageDetail || "",
        travelTime: b.travelTime || "",
        customerName: b.customerName || "",
        customerPhone: b.customerPhone || "",
        assignedVehicleName: b.assignedVehicleName || "",
        driverName: b.driverName || "",
        assignedVehicleNumber: b.assignedVehicleNumber || "",
        driverNumber: b.driverNumber || ""
      } 
    }));
  };

  const saveEdit = (id: string) => {
    const e = editing[id];
    if (!e) return;
    updateBooking.mutate({ 
      id, 
      data: { 
        adminAddress: e.adminAddress || null, 
        agreedRent: e.agreedRent ? Number(e.agreedRent) : null,
        pickupAddress: e.pickupAddress || null,
        dropoffAddress: e.dropoffAddress || null,
        passengersDetail: e.passengersDetail || null,
        luggageDetail: e.luggageDetail || null,
        travelTime: e.travelTime || null,
        customerName: e.customerName || null,
        customerPhone: e.customerPhone || null,
        assignedVehicleName: e.assignedVehicleName || null,
        driverName: e.driverName || null,
        assignedVehicleNumber: e.assignedVehicleNumber || null,
        driverNumber: e.driverNumber || null
      } 
    }, {
      onSuccess: () => { 
        queryClient.invalidateQueries({ queryKey: ["bookings"] }); 
        setEditing(prev => { const n = { ...prev }; delete n[id]; return n; }); 
        toast({ title: "Booking updated!" }); 
      },
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    updateBooking.mutate({ id, data: { status: status as any } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
    });
  };

  const downloadPDF = (b: any) => {
    const element = document.createElement("div");
    element.innerHTML = `
      <div id="pdf-content" style="font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif; padding: 25px; direction: rtl; text-align: right; width: 550px; color: #000; line-height: 1.6; background: white;">
        <div style="border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 15px; text-align: center;">
          <h1 style="font-size: 32px; color: #000; margin: 0; font-weight: normal;">دکان گھر - ٹرانسپورٹ بکنگ</h1>
          <p style="font-size: 12px; color: #666; font-family: sans-serif; margin: 5px 0 0 0;">Booking ID: ${b.id.substring(0, 8)}</p>
        </div>
        
        <div style="background: #fdfdfd; padding: 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #000;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>گاڑی:</span> <strong style="font-size: 20px;">${b.vehicleNameUrdu}</strong></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>کسٹمر:</span> <strong style="font-size: 18px;">${b.customerName}</strong></div>
          <div style="display: flex; justify-content: space-between;"><span>فون:</span> <strong style="font-size: 16px; font-family: sans-serif;">${b.customerPhone}</strong></div>
        </div>

        <div style="background: #fdfdfd; padding: 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #000;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>روانگی (Pickup):</span> <strong style="font-size: 16px;">${b.pickupAddress || "---"}</strong></div>
          <div style="display: flex; justify-content: space-between;"><span>منزل (Dropoff):</span> <strong style="font-size: 16px;">${b.dropoffAddress || "---"}</strong></div>
        </div>

        <div style="background: #fdfdfd; padding: 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #000;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>سواریاں:</span> <strong style="font-size: 16px;">${b.passengersDetail}</strong></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>سامان:</span> <strong style="font-size: 16px;">${b.luggageDetail}</strong></div>
          <div style="display: flex; justify-content: space-between;"><span>مطلوبہ وقت:</span> <strong style="font-size: 16px;">${b.travelTime || "---"}</strong></div>
        </div>

        ${(b.assignedVehicleName || b.driverName) ? `
        <div style="background: #f0f7ff; padding: 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #0056b3;">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #0056b3; border-bottom: 1px solid #b3d7ff; font-size: 14px;">ڈرائیور اور گاڑی کی تفصیل</p>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>بھیجی گئی گاڑی:</span> <strong>${b.assignedVehicleName || "---"}</strong> ${b.assignedVehicleNumber ? `<span style="font-family: sans-serif; font-size: 13px;">(${b.assignedVehicleNumber})</span>` : ""}</div>
          <div style="display: flex; justify-content: space-between;"><span>ڈرائیور:</span> <strong>${b.driverName || "---"}</strong> ${b.driverNumber ? `<span style="font-family: sans-serif; font-size: 13px;">(${b.driverNumber})</span>` : ""}</div>
        </div>
        ` : ""}

        <div style="background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 12px; border: 2px solid #000;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 20px; font-weight: bold;">متفقہ کرایہ:</span>
            <span style="font-size: 28px; font-weight: 900; font-family: sans-serif;">Rs. ${b.agreedRent || "---"}</span>
          </div>
        </div>

        ${b.adminAddress ? `<div style="background: #eee; padding: 8px; border-radius: 5px; border-right: 4px solid #000;"><p style="font-size: 14px; margin: 0;"><b>نوٹ:</b> ${b.adminAddress}</p></div>` : ""}

        <div style="margin-top: 15px; text-align: center; font-size: 11px; color: #444; border-top: 1px solid #000; padding-top: 8px;">
          <p style="margin: 0;">Dukan Ghar App - Transport Booking System</p>
        </div>
      </div>
    `;

    const opt = {
      margin: [0.2, 0.2, 0.2, 0.2],
      filename: `Booking_${b.id.substring(0, 8)}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true,
        scrollY: 0
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // @ts-ignore
    window.html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="urdu-text text-xl font-bold text-right">بکنگ مینجمنٹ</h2>
      {bookings?.map(b => (
        <div key={b.id} className="bg-card border rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Select defaultValue={b.status} onValueChange={v => handleStatusChange(b.id, v)}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{BOOKING_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}><span className="urdu-text text-xs">{BOOKING_STATUS_LABELS[s]}</span></SelectItem>)}</SelectContent>
              </Select>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(b.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
               <div className="text-right">
                <p className="font-bold urdu-text">{b.vehicleNameUrdu}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                  {b.customerName} — {b.customerPhone} <Phone className="w-3 h-3" />
                </p>
                {b.createdAt && (
                  <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                    <span>{new Date(b.createdAt).toLocaleString("ur-PK", { dateStyle: "short", timeStyle: "short" })}</span>
                    <Clock className="w-3.5 h-3.5" />
                  </p>
                )}
              </div>
            </div>
          </div>

          {editing[b.id] ? (
            <div className="flex flex-col gap-3 border-t pt-3">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">کسٹمر کا نام</label>
                   <Input value={editing[b.id].customerName} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], customerName: e.target.value } }))} placeholder="Name" className="text-right h-8 text-xs urdu-text" />
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">فون نمبر</label>
                   <Input value={editing[b.id].customerPhone} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], customerPhone: e.target.value } }))} placeholder="Phone" className="text-right h-8 text-xs" />
                </div>
              </div>
              {/* Addresses */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">روانگی کا پتہ</label>
                   <Input value={editing[b.id].pickupAddress} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], pickupAddress: e.target.value } }))} placeholder="Pickup" className="text-right h-8 text-xs urdu-text" />
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">منزل کا پتہ</label>
                   <Input value={editing[b.id].dropoffAddress} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], dropoffAddress: e.target.value } }))} placeholder="Dropoff" className="text-right h-8 text-xs urdu-text" />
                </div>
              </div>
              {/* Driver & Vehicle (Admin Only) */}
              <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 space-y-3">
                <p className="urdu-text text-[10px] text-primary font-bold text-right border-b border-primary/10 pb-1">صرف ایڈمن کے لیے (Driver/Vehicle Details)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-muted-foreground text-right urdu-text">گاڑی کا نام</label>
                    <Input value={editing[b.id].assignedVehicleName} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], assignedVehicleName: e.target.value } }))} placeholder="گاڑی کا نام" className="text-right h-8 text-xs urdu-text" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-muted-foreground text-right urdu-text">گاڑی کا نمبر</label>
                    <Input value={editing[b.id].assignedVehicleNumber} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], assignedVehicleNumber: e.target.value } }))} placeholder="گاڑی کا نمبر" className="text-right h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-muted-foreground text-right urdu-text">ڈرائیور کا نام</label>
                    <Input value={editing[b.id].driverName} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], driverName: e.target.value } }))} placeholder="ڈرائیور کا نام" className="text-right h-8 text-xs urdu-text" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-muted-foreground text-right urdu-text">ڈرائیور کا نمبر</label>
                    <Input value={editing[b.id].driverNumber} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], driverNumber: e.target.value } }))} placeholder="ڈرائیور کا نمبر" className="text-right h-8 text-xs" />
                  </div>
                </div>
              </div>
              {/* Other Details */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">سواریاں</label>
                   <Input value={editing[b.id].passengersDetail} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], passengersDetail: e.target.value } }))} placeholder="Psgrs" className="text-right h-8 text-xs urdu-text" />
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">سامان</label>
                   <Input value={editing[b.id].luggageDetail} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], luggageDetail: e.target.value } }))} placeholder="Lugg" className="text-right h-8 text-xs urdu-text" />
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">وقت</label>
                   <Input value={editing[b.id].travelTime} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], travelTime: e.target.value } }))} placeholder="Time" className="text-right h-8 text-xs urdu-text" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 col-span-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">متفقہ کرایہ</label>
                   <Input value={editing[b.id].agreedRent} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], agreedRent: e.target.value } }))} placeholder="Rent" type="number" className="h-8 text-xs" />
                </div>
                <div className="flex flex-col gap-1 col-span-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">اضافی تفصیلات</label>
                   <Input value={editing[b.id].adminAddress} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], adminAddress: e.target.value } }))} placeholder="Info" className="text-right urdu-text h-8 text-xs" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveEdit(b.id)} disabled={updateBooking.isPending} className="flex-1">Save Changes</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(prev => { const n = { ...prev }; delete n[b.id]; return n; })}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Visualization */}
              <div className="bg-muted/20 p-2 rounded-lg border border-dashed">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="flex items-center gap-1 text-primary">
                      <MapPin className="w-3 h-3" />
                      <span className="urdu-text text-[10px] font-bold">منزل</span>
                    </div>
                    <p className="text-[11px] font-medium leading-tight line-clamp-1 urdu-text">{b.dropoffAddress || "---"}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center px-1">
                    <ChevronLeft className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="flex items-center gap-1 text-primary">
                      <MapPin className="w-3 h-3" />
                      <span className="urdu-text text-[10px] font-bold">روانگی</span>
                    </div>
                    <p className="text-[11px] font-medium leading-tight line-clamp-1 urdu-text">{b.pickupAddress || "---"}</p>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 p-2 rounded-lg text-right flex items-start justify-end gap-2">
                   <div>
                     <p className="text-[10px] text-muted-foreground urdu-text">سواریاں:</p>
                     <p className="text-xs font-bold urdu-text">{b.passengersDetail}</p>
                   </div>
                   <User className="w-3 h-3 text-muted-foreground mt-1" />
                </div>
                <div className="bg-muted/30 p-2 rounded-lg text-right flex items-start justify-end gap-2">
                   <div>
                     <p className="text-[10px] text-muted-foreground urdu-text">سامان:</p>
                     <p className="text-xs font-bold urdu-text">{b.luggageDetail}</p>
                   </div>
                   <Briefcase className="w-3 h-3 text-muted-foreground mt-1" />
                </div>
                <div className="bg-muted/30 p-2 rounded-lg text-right flex items-start justify-end gap-2">
                   <div>
                     <p className="text-[10px] text-muted-foreground urdu-text">وقت:</p>
                     <p className="text-xs font-bold urdu-text">{b.travelTime || "---"}</p>
                   </div>
                   <Clock className="w-3 h-3 text-muted-foreground mt-1" />
                </div>
                <div className="bg-muted/30 p-2 rounded-lg text-right flex items-start justify-end gap-2 border-primary/20 border">
                   <div>
                     <p className="text-[10px] text-primary urdu-text font-bold">کرایہ:</p>
                     <p className="text-xs font-bold text-primary">Rs. {b.agreedRent || "---"}</p>
                   </div>
                </div>
              </div>

              {/* Admin Assigned Driver Info (Static View) */}
              {(b.driverName || b.assignedVehicleNumber) && (
                <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                   <div className="grid grid-cols-2 gap-y-2">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground urdu-text">گاڑی / نمبر:</p>
                        <p className="text-[11px] font-bold urdu-text">{b.assignedVehicleName} {b.assignedVehicleNumber && `(${b.assignedVehicleNumber})`}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground urdu-text">ڈرائیور / نمبر:</p>
                        <p className="text-[11px] font-bold urdu-text">{b.driverName} {b.driverNumber && `(${b.driverNumber})`}</p>
                      </div>
                   </div>
                </div>
              )}

              <div className="flex gap-2">
                 <Button size="sm" variant="outline" onClick={() => startEdit(b)} className="flex-1 text-xs h-8 gap-1">
                   <Edit2 className="w-3 h-3" /> Edit Details
                 </Button>
                 <Button size="sm" variant="secondary" onClick={() => downloadPDF(b)} className="flex-1 text-xs h-8 gap-1">
                   <Download className="w-3 h-3" /> Get PDF for Driver
                 </Button>
              </div>
            </div>
          )}
        </div>
      ))}
      <DeleteConfirmDialog 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={handleDelete}
        isPending={deleteBooking.isPending}
        title="بکنگ ختم کریں؟"
      />
    </div>
  );
}

function AdminPayments() {
  const { data: methods } = usePaymentMethods();
  const createPM = useCreatePaymentMethod();
  const updatePM = useUpdatePaymentMethod();
  const deletePM = useDeletePaymentMethod();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Create Form State
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [holder, setHolder] = useState("");
  const [logo, setLogo] = useState("");

  // Edit Form State
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    bankName: "",
    accountNumber: "",
    holderName: "",
    logoUrl: "",
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createPM.mutate({ bankName: bank, accountNumber: account, holderName: holder, logoUrl: logo || null, active: true }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["paymentMethods"] }); setBank(""); setAccount(""); setHolder(""); setLogo(""); toast({ title: "Payment method added!" }); },
    });
  };

  const handleEditClick = (m: any) => {
    setEditingMethod(m);
    setEditForm({
      bankName: m.bankName,
      accountNumber: m.accountNumber,
      holderName: m.holderName,
      logoUrl: m.logoUrl || "",
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;
    updatePM.mutate({
      id: editingMethod.id,
      data: {
        bankName: editForm.bankName,
        accountNumber: editForm.accountNumber,
        holderName: editForm.holderName,
        logoUrl: editForm.logoUrl || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
        setEditingMethod(null);
        toast({ title: "Payment method updated!" });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="urdu-text text-xl font-bold text-right">ادائیگی طریقے</h2>
      <form onSubmit={handleCreate} className="bg-card border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
        <h3 className="font-semibold text-sm">Add Payment Method</h3>
        <Input value={bank} onChange={e => setBank(e.target.value)} placeholder="Bank Name (e.g. JazzCash)" required />
        <Input value={account} onChange={e => setAccount(e.target.value)} placeholder="Account Number" required />
        <Input value={holder} onChange={e => setHolder(e.target.value)} placeholder="Holder Name" required />
        <Input value={logo} onChange={e => setLogo(e.target.value)} placeholder="Logo URL (optional)" />
        <Button type="submit" size="sm" disabled={createPM.isPending}>Add</Button>
      </form>
      <div className="flex flex-col gap-3">
        {methods?.map(m => (
          <div key={m.id} className="bg-card border rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={() => deletePM.mutate(m.id, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["paymentMethods"] }) })}>Del</Button>
              <Button variant="outline" size="sm" onClick={() => handleEditClick(m)}><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</Button>
              <Button variant="outline" size="sm" onClick={() => updatePM.mutate({ id: m.id, data: { active: !m.active } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["paymentMethods"] }) })}>{m.active ? "Disable" : "Enable"}</Button>
            </div>
            <div className="text-right">
              {m.logoUrl && <img src={m.logoUrl} alt={m.bankName} className="h-6 ml-auto mb-1 object-contain" />}
              <p className="font-bold text-sm">{m.bankName}</p>
              <p className="text-xs text-muted-foreground">{m.holderName} — {m.accountNumber}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Payment Method Dialog */}
      <Dialog open={!!editingMethod} onOpenChange={(open) => { if (!open) setEditingMethod(null); }}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Payment Method</DialogTitle>
            <DialogDescription className="sr-only">Form to modify an existing payment method details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-1">
              <Label>Bank Name</Label>
              <Input value={editForm.bankName} onChange={e => setEditForm(p => ({ ...p, bankName: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Account Number</Label>
              <Input value={editForm.accountNumber} onChange={e => setEditForm(p => ({ ...p, accountNumber: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Holder Name</Label>
              <Input value={editForm.holderName} onChange={e => setEditForm(p => ({ ...p, holderName: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Logo URL (optional)</Label>
              <Input value={editForm.logoUrl} onChange={e => setEditForm(p => ({ ...p, logoUrl: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingMethod(null)}>Cancel</Button>
              <Button type="submit" disabled={updatePM.isPending}>Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminSliders() {
  const { data: sliders } = useSliders();
  const createSlider = useCreateSlider();
  const deleteSlider = useDeleteSlider();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;
    createSlider.mutate({ imageUrl, linkUrl: linkUrl || null }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["sliders"] });
        setImageUrl(""); setLinkUrl("");
        toast({ title: "Slider added!" });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="urdu-text text-xl font-bold text-right">سلائیڈر مینجمنٹ</h2>
      
      <form onSubmit={handleCreate} className="bg-card border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">سلائیڈر کی تصویر (2752x1536 ریکومینڈڈ)</p>
          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload File"}
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
        </div>
        <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Image URL" required />
        <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="Link URL (Optional) - User click par kahan jaye?" />
        {imageUrl && (
          <div className="w-full aspect-[2752/1536] bg-muted rounded-lg overflow-hidden border">
            <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
          </div>
        )}
        <Button type="submit" size="sm" disabled={createSlider.isPending || isUploading}>Add Slider Image</Button>
      </form>

      <div className="grid grid-cols-1 gap-4">
        {sliders?.map(s => (
          <div key={s.id} className="bg-card border rounded-xl overflow-hidden shadow-sm relative group">
            <div className="aspect-[2752/1536] w-full">
              <img src={s.imageUrl} alt="slider" className="w-full h-full object-cover" />
            </div>
            <div className="p-3 flex items-center justify-between bg-muted/50 border-t">
              <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{s.linkUrl || "No Link"}</p>
              <Button size="sm" variant="destructive" onClick={() => deleteSlider.mutate(s.id)} className="h-7 text-xs">Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminNotifications() {
  const { data: notifications } = useNotifications();
  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  const createNotification = useCreateNotification();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [discount, setDiscount] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [manualLink, setManualLink] = useState("");
  const [notifType, setNotifType] = useState<"banner" | "alert">("banner");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    let finalLink = manualLink;
    if (!finalLink && selectedProduct) finalLink = `/products?search=${products?.find(p => p.id === selectedProduct)?.name}`;
    if (!finalLink && selectedCategory) finalLink = `/category/${selectedCategory}`;

    createNotification.mutate({
      title,
      description: desc,
      imageUrl: imageUrl || null,
      discountPercentage: discount || null,
      productId: selectedProduct || null,
      linkUrl: finalLink || null,
      type: notifType
    }, {
      onSuccess: () => {
        setTitle(""); setDesc(""); setImageUrl(""); setDiscount(""); setSelectedProduct(""); setSelectedCategory(""); setManualLink("");
        toast({ title: "Notification Sent! 🔥" });
      }
    });
  };

  const applyAI = () => {
    const prod = products?.find(p => p.id === selectedProduct);
    const cat = categories?.find(c => c.id === selectedCategory);
    const name = prod ? prod.nameUrdu : (cat ? cat.nameUrdu : "نئی آئٹم");
    const templates = [
      { t: `OMG! ${name} پر دھماکہ سیل 😱`, d: `صرف محدود وقت کے لیے! Up to ${discount || '80'}% OFF حاصل کریں۔ ابھی خریدیں!` },
      { t: `Mega Deal: ${name} اب صرف بہترین قیمت میں 🔥`, d: `Sale ka Hot Mode On! جلدی کریں ورنہ دیر ہو جائے گی۔` },
      { t: `آپ کا پسندیدہ ${name} واپس آگیا! 🚀`, d: `بغیر کسی انتظار کے ابھی آرڈر کریں اور ڈیلیوری حاصل کریں۔` }
    ];
    const pick = templates[Math.floor(Math.random() * templates.length)];
    setTitle(pick.t);
    setDesc(pick.d);
  };

  const filteredProducts = selectedCategory 
    ? products?.filter(p => p.categoryId === selectedCategory) 
    : products;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="urdu-text text-xl font-bold text-right">نوٹیفکیشن مینجمنٹ</h2>
      
      <form onSubmit={handleSend} className="bg-card border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex gap-2">
          <Button type="button" variant={notifType === 'banner' ? 'default' : 'outline'} className="flex-1 text-xs h-8" onClick={() => setNotifType('banner')}>Banner View</Button>
          <Button type="button" variant={notifType === 'alert' ? 'default' : 'outline'} className="flex-1 text-xs h-8" onClick={() => setNotifType('alert')}>Small Icon View</Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={selectedProduct} onValueChange={setSelectedProduct} disabled={!!(selectedCategory && filteredProducts?.length === 0)}>
            <SelectTrigger><SelectValue placeholder={(selectedCategory && filteredProducts?.length === 0) ? "No products" : "Product"} /></SelectTrigger>
            <SelectContent>
              {filteredProducts?.length === 0 ? (
                <SelectItem value="_none" disabled className="text-muted-foreground urdu-text text-right">مصنوعات دستیاب نہیں</SelectItem>
              ) : (
                filteredProducts?.map(p => <SelectItem key={p.id} value={p.id}>{p.nameUrdu}</SelectItem>)
              )}
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={(val) => {
            setSelectedCategory(val);
            setSelectedProduct(""); // Reset product when category changes
          }}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.nameUrdu}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <Input value={manualLink} onChange={e => setManualLink(e.target.value)} placeholder="Manual Link (Optional) e.g. /transport" className="text-xs" />

        <div className="grid grid-cols-2 gap-2">
          <Input value={discount} onChange={e => setDiscount(e.target.value)} placeholder="Discount (e.g. 80%)" />
          <Button type="button" variant="secondary" size="sm" onClick={applyAI} disabled={!selectedProduct && !selectedCategory} className="urdu-text">AI Marketing 🔥</Button>
        </div>
        
        <Separator />

        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (Catchy)" className="urdu-text text-right" required />
        <textarea 
          value={desc} 
          onChange={e => setDesc(e.target.value)} 
          placeholder="Description (Marketing style...)" 
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm urdu-text text-right"
          required
        />
        
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Banner Image</p>
            <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload File"}
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          </div>
          <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Image URL" className="text-xs" />
          {imageUrl && <img src={imageUrl} className="w-full aspect-[1200/600] object-contain rounded-lg border mt-1 bg-muted/20" />}
        </div>

        <Button type="submit" disabled={createNotification.isPending || isUploading} className="w-full urdu-text font-bold">نوٹیفکیشن بھیجیں 🚀</Button>
      </form>

      <div className="flex flex-col gap-3 mt-4">
        <h3 className="urdu-text text-lg font-bold text-right">تاریخ</h3>
        {notifications?.map(n => (
          <div key={n.id} className="bg-card border rounded-xl p-3 flex gap-3 shadow-sm items-center">
            <div className="flex-1 text-right">
              <p className="urdu-text font-bold text-sm">{n.title}</p>
              <p className="urdu-text text-xs text-muted-foreground line-clamp-1">{n.description}</p>
            </div>
            {n.imageUrl && <img src={n.imageUrl} className="w-12 h-12 rounded-lg object-cover" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminUsers() {
  const { data: users } = useUsers();
  const updateUser = useUpdateUser();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", password: "", balance: 0 });

  const handleToggleBlock = (u: any) => {
    updateUser.mutate({ id: u.uid, data: { isBlocked: !u.isBlocked } }, {
      onSuccess: () => toast({ title: u.isBlocked ? "User Unblocked" : "User Blocked" })
    });
  };

  const handleEditClick = (u: any) => {
    setEditingUser(u);
    setEditForm({
      name: u.name || "",
      phone: u.phone || "",
      email: u.email || "",
      password: u.password || "",
      balance: u.balance || 0
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    updateUser.mutate({
      id: editingUser.uid,
      data: {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email || null,
        password: editForm.password || "",
        balance: Number(editForm.balance)
      }
    }, {
      onSuccess: () => {
        setEditingUser(null);
        toast({ title: "User updated successfully" });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Users Management</h2>
      <div className="overflow-x-auto border rounded-xl shadow-sm bg-card">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
            <tr>
              <th className="px-2.5 py-3">Name</th>
              <th className="px-2.5 py-3">Phone</th>
              <th className="px-2.5 py-3">Email</th>
              <th className="px-2.5 py-3">Password</th>
              <th className="px-2.5 py-3 text-right">Balance</th>
              <th className="px-2.5 py-3 text-center">Status</th>
              <th className="px-2.5 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs">
            {users?.map((u: any) => (
              <tr key={u.uid} className="hover:bg-muted/20">
                <td className="px-2.5 py-3 font-medium max-w-[120px] truncate" title={u.name}>{u.name}</td>
                <td className="px-2.5 py-3 max-w-[100px] truncate" title={u.phone}>{u.phone}</td>
                <td className="px-2.5 py-3 text-muted-foreground max-w-[130px] truncate" title={u.email}>{u.email || "—"}</td>
                <td className="px-2.5 py-3 font-mono text-xs max-w-[100px] truncate" title={u.password}>{u.password || "—"}</td>
                <td className="px-2.5 py-3 text-right font-bold text-primary">Rs. {u.balance}</td>
                <td className="px-2.5 py-3 text-center">
                  <Badge variant={u.isBlocked ? "destructive" : "outline"} className={!u.isBlocked ? "bg-green-50 text-green-700 border-green-200" : ""}>
                    {u.isBlocked ? "Blocked" : "Active"}
                  </Badge>
                </td>
                <td className="px-2.5 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-7.5 px-2 gap-1 text-[11px]" onClick={() => handleEditClick(u)}>
                      <Edit2 size={10} /> Edit
                    </Button>
                    <Button size="sm" variant={u.isBlocked ? "default" : "destructive"} onClick={() => handleToggleBlock(u)} className="h-7.5 px-2 text-[11px]">
                      {u.isBlocked ? "Unblock" : "Block"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
            <DialogDescription className="sr-only">Form to edit user name, email, phone, password and balance.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input required value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input required value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="Not Provided" />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input required value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Balance (Rs)</Label>
              <Input type="number" required value={editForm.balance} onChange={e => setEditForm(p => ({ ...p, balance: Number(e.target.value) }))} />
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminPaymentRequests() {
  const { data: requests } = usePaymentRequests();
  const updateReq = useUpdatePaymentRequest();
  const { data: users } = useUsers();
  const updateUser = useUpdateUser();
  const { toast } = useToast();
  const createNotification = useCreateNotification();

  const handleApprove = (req: any) => {
    const user = users?.find((u: any) => u.uid === req.userId);
    if (!user) return toast({ title: "User not found", variant: "destructive" });

    const newBalance = req.type === "deposit" 
      ? user.balance + req.amount 
      : user.balance - req.amount; // Should be checked if enough earlier

    // 1. Update Request
    updateReq.mutate({ id: req.id, data: { status: "approved" } }, {
      onSuccess: () => {
        // 2. Update User Balance
        updateUser.mutate({ id: req.userId, data: { balance: newBalance } });
        // 3. Send Notification
        createNotification.mutate({
          title: `Payment Approved ✅`,
          description: `Your ${req.type} request for Rs. ${req.amount} has been approved.`,
          type: "alert",
          userId: req.userId
        });
        toast({ title: "Request Approved & Balance Updated" });
      }
    });
  };

  const handleReject = (req: any) => {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return;
    
    updateReq.mutate({ id: req.id, data: { status: "rejected", reason } }, {
      onSuccess: () => {
        createNotification.mutate({
          title: `Payment Rejected ❌`,
          description: `Your ${req.type} request for Rs. ${req.amount} was rejected. Reason: ${reason}`,
          type: "alert",
          userId: req.userId
        });
        toast({ title: "Request Rejected" });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Payment Requests</h2>
      <div className="space-y-3">
        {requests?.map((req: any) => (
          <div key={req.id} className="bg-card border rounded-xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{req.userName}</p>
                <p className="text-xs text-muted-foreground">{req.userPhone}</p>
                <Badge variant="outline" className={`mt-1 text-[10px] uppercase ${req.type === 'deposit' ? 'text-green-600 border-green-200' : 'text-orange-600 border-orange-200'}`}>
                  {req.type}
                </Badge>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">Rs. {req.amount}</p>
                <p className="text-xs text-muted-foreground capitalize">{req.status}</p>
              </div>
            </div>

            <div className="bg-muted/30 p-2 rounded-lg text-xs space-y-1">
              <p><span className="font-medium text-muted-foreground">Method:</span> <span className="uppercase">{req.method}</span></p>
              <p><span className="font-medium text-muted-foreground">Account Name:</span> {req.accountName}</p>
              <p><span className="font-medium text-muted-foreground">Account Number:</span> {req.accountNumber}</p>
            </div>

            {req.proofScreenshot && (
              <div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-xs"><Eye className="w-3 h-3 mr-1"/> View Proof Screenshot</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[400px]">
                    <DialogHeader>
                      <DialogTitle>Payment Proof</DialogTitle>
                      <DialogDescription className="sr-only">Screenshot of the transaction submitted by the user.</DialogDescription>
                    </DialogHeader>
                    <img src={req.proofScreenshot} alt="proof" className="w-full rounded-lg" />
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {req.status === "pending" && (
              <div className="flex gap-2 pt-2 border-t">
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(req)}>Approve</Button>
                <Button className="flex-1" variant="destructive" onClick={() => handleReject(req)}>Reject</Button>
              </div>
            )}
            {req.status === "rejected" && req.reason && (
              <p className="text-xs text-destructive border-t pt-2">Reason: {req.reason}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminCustomRequests() {
  const { data: requests, isLoading } = useCustomRequests();
  const updateRequest = useUpdateCustomRequest();
  const deleteRequest = useDeleteCustomRequest();
  const { toast } = useToast();

  const handleQuickStatusChange = (id: string, newStatus: string) => {
    updateRequest.mutate({
      id,
      data: { status: newStatus as any }
    }, {
      onSuccess: () => {
        toast({ title: "Status updated successfully!" });
      }
    });
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    status: "pending",
    deliveryCharge: 0,
    adminNotes: "",
    customerName: "",
    customerPhone: "",
    details: ""
  });

  const handleEditClick = (req: any) => {
    setEditingId(req.id);
    setEditForm({
      status: req.status || "pending",
      deliveryCharge: req.deliveryCharge || 0,
      adminNotes: req.adminNotes || "",
      customerName: req.customerName || "",
      customerPhone: req.customerPhone || "",
      details: req.details || ""
    });
  };

  const handleSave = (id: string) => {
    updateRequest.mutate({
      id,
      data: {
        status: editForm.status as any,
        deliveryCharge: Number(editForm.deliveryCharge) || null,
        adminNotes: editForm.adminNotes || null,
        customerName: editForm.customerName || null,
        customerPhone: editForm.customerPhone || null,
        details: editForm.details || null
      } as any
    }, {
      onSuccess: () => {
        setEditingId(null);
        toast({ title: "Custom request updated successfully!" });
      }
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteRequest.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: "Request deleted!" });
        setDeleteId(null);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-32 rounded-xl" />
        <Skeleton className="w-full h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Custom Order Slips (خصوصی آرڈر)</h2>
      <div className="space-y-4">
        {requests?.length === 0 ? (
          <div className="text-center py-8 bg-card border rounded-xl text-muted-foreground text-sm">
            No custom requests received yet.
          </div>
        ) : (
          requests?.map((req: any) => {
            const isEditing = editingId === req.id;
            return (
              <div key={req.id} className="bg-card border rounded-xl p-4 shadow-sm flex flex-col gap-3">
                
                {/* Header info */}
                <div className="flex justify-between items-start border-b pb-2.5">
                  <div className="text-right">
                    <p className="font-semibold text-base">{req.customerName}</p>
                    <a href={`tel:${req.customerPhone}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5 justify-end">
                      {req.customerPhone} <Phone className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-left">
                    <Badge variant="outline" className={`capitalize text-[10px] ${
                      req.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      req.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      req.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {req.status === 'pending' ? 'زیرِ غور ⏳' : req.status === 'confirmed' ? 'تصدیق شدہ ✅' : req.status === 'completed' ? 'مکمل 📦' : 'منسوخ ❌'}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {req.createdAt ? new Date(req.createdAt).toLocaleString("ur-PK", { dateStyle: "short", timeStyle: "short" }) : "Processing..."}
                    </p>
                  </div>
                </div>

                {/* Details / Text list */}
                {req.details && (
                  <div className="bg-muted/30 p-3 rounded-lg text-sm text-right leading-relaxed font-medium text-foreground/90">
                    <p className="urdu-text text-sm">{req.details}</p>
                  </div>
                )}

                {/* Image preview / dialog popup */}
                {req.imageUrl && (
                  <div className="flex justify-end mt-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1.5">
                          <Eye className="w-3.5 h-3.5"/> View Uploaded Slip
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[400px]">
                        <DialogHeader>
                          <DialogTitle>Custom Order Slip / Image</DialogTitle>
                          <DialogDescription className="sr-only">Uploaded image details from customer.</DialogDescription>
                        </DialogHeader>
                        <img src={req.imageUrl} alt="proof" className="w-full rounded-lg shadow" />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {/* Delivery details status */}
                <div className="flex justify-between items-center bg-muted/20 px-3 py-2 rounded-lg text-xs">
                  <div>
                    {req.deliveryCharge !== null && req.deliveryCharge !== undefined ? (
                      <span className="font-semibold text-green-600">Rs. {req.deliveryCharge}</span>
                    ) : (
                      <span className="text-muted-foreground italic">Not Set</span>
                    )}
                    <span className="text-muted-foreground mr-1">:Delivery Charges</span>
                  </div>
                  {req.adminNotes && (
                    <div className="text-right max-w-[60%]">
                      <span className="text-muted-foreground text-[10px] block font-bold">Admin Note</span>
                      <span className="urdu-text text-xs block mt-0.5">{req.adminNotes}</span>
                    </div>
                  )}
                </div>

                {/* Inline Editing Form */}
                {isEditing ? (
                  <div className="border-t pt-3 mt-1 flex flex-col gap-3 bg-muted/40 p-3 rounded-lg text-right">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">گاہک کا نام (Customer Name)</Label>
                        <Input 
                          value={editForm.customerName}
                          onChange={e => setEditForm(p => ({ ...p, customerName: e.target.value }))}
                          className="h-8 text-xs text-right urdu-text"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">موبائل نمبر (Customer Phone)</Label>
                        <Input 
                          value={editForm.customerPhone}
                          onChange={e => setEditForm(p => ({ ...p, customerPhone: e.target.value }))}
                          className="h-8 text-xs text-left font-mono"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">خصوصی آرڈر کی تفصیلات (Groceries/Medicines/Parcel Details)</Label>
                      <textarea 
                        value={editForm.details}
                        onChange={e => setEditForm(p => ({ ...p, details: e.target.value }))}
                        placeholder="سورس لسٹ یا تفصیلات لکھیں..."
                        className="w-full min-h-[70px] rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-right urdu-text"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">آرڈر اسٹیٹس (Status)</Label>
                        <Select 
                          value={editForm.status} 
                          onValueChange={val => setEditForm(p => ({ ...p, status: val }))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending (زیرِ غور)</SelectItem>
                            <SelectItem value="confirmed">Confirmed (تصدیق شدہ)</SelectItem>
                            <SelectItem value="completed">Completed (مکمل)</SelectItem>
                            <SelectItem value="cancelled">Cancelled (منسوخ)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">ڈیلیوری چارجز (Delivery Charges - Rs)</Label>
                        <Input 
                          type="number"
                          value={editForm.deliveryCharge}
                          onChange={e => setEditForm(p => ({ ...p, deliveryCharge: Number(e.target.value) }))}
                          className="h-8 text-xs text-left"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">ایڈمن نوٹ / اردو ہدایات (Admin Note / Details)</Label>
                      <Input 
                        value={editForm.adminNotes}
                        onChange={e => setEditForm(p => ({ ...p, adminNotes: e.target.value }))}
                        placeholder="مثال: راشن کا سامان روانہ کر دیا گیا ہے..."
                        className="h-8 text-xs text-right urdu-text"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 text-xs">Cancel</Button>
                      <Button size="sm" className="h-8 text-xs" onClick={() => handleSave(req.id)}>Save Updates</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center border-t pt-2 mt-1 gap-2">
                    <div className="flex items-center gap-2">
                      <Select defaultValue={req.status} onValueChange={v => handleQuickStatusChange(req.id, v)}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending"><span className="urdu-text text-xs">زیرِ غور ⏳</span></SelectItem>
                          <SelectItem value="confirmed"><span className="urdu-text text-xs">تصدیق شدہ ✅</span></SelectItem>
                          <SelectItem value="completed"><span className="urdu-text text-xs">مکمل 📦</span></SelectItem>
                          <SelectItem value="cancelled"><span className="urdu-text text-xs">منسوخ ❌</span></SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button"
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setDeleteId(req.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEditClick(req)}
                      className="h-8 text-xs font-semibold"
                    >
                      <Edit2 className="w-3 h-3 mr-1" /> Edit details & charges
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <DeleteConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="خصوصی آرڈر حذف کریں؟"
        description="کیا آپ واقعی اس خصوصی آرڈر کو ڈیلیٹ کرنا چاہتے ہیں؟ یہ عمل واپس نہیں لیا جا سکتا۔"
        isPending={deleteRequest.isPending}
      />
    </div>
  );
}

function PromoBoxesTab() {
  const { data: promoBoxes, isLoading } = usePromoBoxes();
  const updateBoxMutation = useUpdatePromoBox();
  const { toast } = useToast();

  const handleInitialize = async () => {
    try {
      await updateBoxMutation.mutateAsync({
        id: "box1",
        data: {
          id: "box1",
          title: "خصوصی آرڈر",
          subtitle: "پرچی بھیجیں",
          linkUrl: "/custom-order",
          imageUrl: null
        }
      });
      await updateBoxMutation.mutateAsync({
        id: "box2",
        data: {
          id: "box2",
          title: "بڑی بچت",
          subtitle: "ڈسکاؤنٹ سیل",
          linkUrl: "/products",
          imageUrl: null
        }
      });
      await updateBoxMutation.mutateAsync({
        id: "box3",
        data: {
          id: "box3",
          title: "فوری سروس",
          subtitle: "ٹرانسپورٹ",
          linkUrl: "/transport",
          imageUrl: null
        }
      });
      toast({ title: "برکات!", description: "ڈبے کامیابی سے ری سیٹ کر دیے گئے ہیں۔" });
    } catch (e) {
      toast({ title: "Error", description: "Initialization failed", variant: "destructive" });
    }
  };

  if (isLoading) return <Skeleton className="h-60 w-full" />;

  const boxes = promoBoxes || [];

  return (
    <div className="bg-card border rounded-2xl p-4 shadow-sm text-right">
      <div className="flex justify-between items-center mb-6">
        <Button onClick={handleInitialize} size="sm" variant="outline" className="text-xs">
          ری سیٹ / شروع کریں (Reset Defaults)
        </Button>
        <div>
          <h2 className="urdu-text text-xl font-bold font-semibold">ہوم پیج گفٹ ڈبے (Promo Boxes)</h2>
          <p className="urdu-text text-xs text-muted-foreground mt-1">ہوم پیج پر سلائیڈر کے نیچے موجود 3 ڈبوں کی تفصیلات یہاں سے تبدیل کریں</p>
        </div>
      </div>

      {boxes.length === 0 ? (
        <div className="py-8 text-center bg-muted/20 rounded-xl border border-dashed">
          <p className="urdu-text text-sm text-muted-foreground">کوئی ڈبے نہیں ملے، براہ کرم پہلے شروع کرنے والے بٹن پر کلک کریں۔</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {["box1", "box2", "box3"].map((id, index) => {
            const box = boxes.find(b => b.id === id) || {
              id,
              title: index === 0 ? "خصوصی آرڈر" : index === 1 ? "بڑی بچت" : "فوری سروس",
              subtitle: index === 0 ? "پرچی بھیجیں" : index === 1 ? "ڈسکاؤنٹ سیل" : "ٹرانسپورٹ",
              linkUrl: index === 0 ? "/custom-order" : index === 1 ? "/products" : "/transport",
              imageUrl: null
            };
            return (
              <PromoBoxEditorCard key={id} box={box} onSave={async (data) => {
                await updateBoxMutation.mutateAsync({ id, data });
                toast({ title: "محفوظ ہو گیا!", description: "تفصیلات تبدیل کر دی گئی ہیں۔" });
              }} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function PromoBoxEditorCard({ box, onSave }: { box: any; onSave: (data: any) => Promise<void> }) {
  const [title, setTitle] = useState(box.title);
  const [subtitle, setSubtitle] = useState(box.subtitle);
  const [linkUrl, setLinkUrl] = useState(box.linkUrl);
  const [imageUrl, setImageUrl] = useState(box.imageUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ title, subtitle, linkUrl, imageUrl: imageUrl || null });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border rounded-2xl p-4 bg-muted/10 relative overflow-hidden flex flex-col gap-4">
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-primary"></div>
      <div className="text-right">
        <span className="urdu-text font-bold text-sm text-primary block">ڈبہ نمبر {box.id === "box1" ? "1 (خصوصی آرڈر)" : box.id === "box2" ? "2 (بڑی بچت)" : "3 (ٹرانسپورٹ)"}</span>
      </div>

      <div className="flex flex-col gap-1.5 text-right">
        <Label className="urdu-text text-xs text-muted-foreground">نام (Title Urdu)</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="urdu-text text-right text-xs" />
      </div>

      <div className="flex flex-col gap-1.5 text-right">
        <Label className="urdu-text text-xs text-muted-foreground">ذیلی عنوان (Subtitle Urdu)</Label>
        <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="urdu-text text-right text-xs" />
      </div>

      <div className="flex flex-col gap-1.5 text-right">
        <Label className="urdu-text text-xs text-muted-foreground">لنک (Destination Route/Link Url)</Label>
        <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="text-left text-xs" dir="ltr" />
      </div>

      <div className="flex flex-col gap-1.5 text-right">
        <Label className="urdu-text text-xs text-muted-foreground">تصویر کا براہ راست لنک (Direct Image URL Link)</Label>
        <Input 
          value={imageUrl} 
          onChange={(e) => setImageUrl(e.target.value)} 
          placeholder="https://example.com/image.png" 
          className="text-left text-xs" 
          dir="ltr" 
        />
      </div>

      <div className="flex flex-col gap-2 text-right">
        <Label className="urdu-text text-xs text-muted-foreground">یا فائل اپلوڈ کریں (Or Upload File)</Label>
        
        {imageUrl ? (
          <div className="relative aspect-video rounded-xl overflow-hidden border bg-muted group mt-1">
            <img src={imageUrl} alt="Promo" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => setImageUrl("")}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-1.5 mt-1"
          >
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
            <span className="urdu-text text-[10px] text-muted-foreground">فائل منتخب کریں</span>
            {isUploading && <span className="text-[10px] text-primary animate-pulse">اپلوڈ ہو رہا ہے...</span>}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </div>

      <Button onClick={handleSave} disabled={isSaving || isUploading} className="w-full text-xs gap-1.5 rounded-xl mt-2">
        {isSaving ? "محفوظ ہو رہا ہے..." : "تبدیلی محفوظ کریں"}
      </Button>
    </div>
  );
}

function AppSettingsTab() {
  const { data: settings, isLoading } = useAppSettings();
  const updateSettingsMutation = useUpdateAppSettings();
  const { toast } = useToast();

  const [adminPin, setAdminPin] = useState("");
  const [footerEmail, setFooterEmail] = useState("");
  const [footerPhone, setFooterPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Sync state when data loads
  useEffect(() => {
    if (settings) {
      setAdminPin(settings.adminPin || "1234");
      setFooterEmail(settings.footerEmail || "jafir0691824@gmail.com");
      setFooterPhone(settings.footerPhone || "0300-1234567");
    }
  }, [settings]);

  const handleSave = async () => {
    if (!adminPin || adminPin.length < 4) {
      toast({ title: "پن کوڈ کم از کم 4 ہندسوں کا ہونا چاہیے", variant: "destructive" });
      return;
    }
    if (!footerPhone) {
      toast({ title: "فون نمبر درج کریں", variant: "destructive" });
      return;
    }
    if (!footerEmail) {
      toast({ title: "ای میل ایڈریس درج کریں", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      await updateSettingsMutation.mutateAsync({
        adminPin,
        footerEmail,
        footerPhone
      });
      toast({ title: "ترتیبات کامیابی سے محفوظ کر دی گئیں!", variant: "default" });
    } catch (err: any) {
      toast({ title: "محفوظ کرنے میں خرابی پیش آئی", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[450px] mx-auto bg-card border rounded-2xl p-6 shadow-md text-right">
      <div className="border-b pb-3 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Manage App Configurations</span>
        <h2 className="urdu-text text-xl font-bold text-primary">عمومی سیٹنگز (App Settings)</h2>
      </div>

      <div className="space-y-4">
        {/* Admin PIN */}
        <div className="flex flex-col gap-1.5">
          <Label className="urdu-text text-sm font-semibold text-foreground">ایڈمن لاگ ان پن (Admin Login PIN)</Label>
          <div className="relative flex items-center">
            <Input 
              value={adminPin} 
              onChange={(e) => setAdminPin(e.target.value)} 
              type={showPin ? "text" : "password"} 
              placeholder="1234" 
              className="text-center font-mono text-lg tracking-widest h-11 pr-10"
              maxLength={6} 
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <span className="urdu-text text-[10px] text-muted-foreground mt-0.5">ایڈمن پینل لاگ ان کے لیے خفیہ پن کوڈ تبدیل کریں</span>
        </div>

        <Separator />

        {/* Footer Phone */}
        <div className="flex flex-col gap-1.5">
          <Label className="urdu-text text-sm font-semibold text-foreground">رابطہ فون نمبر / واٹس ایپ (Support Phone)</Label>
          <Input 
            value={footerPhone} 
            onChange={(e) => setFooterPhone(e.target.value)} 
            type="text" 
            placeholder="0300-1234567" 
            className="text-left font-mono text-sm h-11" 
            dir="ltr"
          />
          <span className="urdu-text text-[10px] text-muted-foreground mt-0.5">صارف کی سائیڈ پر فٹر میں نظر آنے والا نمبر (اس پر کلک کرنے سے واٹس ایپ اوپن ہوگا)</span>
        </div>

        {/* Footer Email */}
        <div className="flex flex-col gap-1.5">
          <Label className="urdu-text text-sm font-semibold text-foreground">رابطہ ای میل (Support Email)</Label>
          <Input 
            value={footerEmail} 
            onChange={(e) => setFooterEmail(e.target.value)} 
            type="email" 
            placeholder="support@dukanghar.com" 
            className="text-left font-mono text-sm h-11" 
            dir="ltr"
          />
          <span className="urdu-text text-[10px] text-muted-foreground mt-0.5">صارف کی سائیڈ پر فٹر میں نظر آنے والا ای میل پتہ</span>
        </div>
      </div>

      <Button 
        onClick={handleSave} 
        disabled={isSaving} 
        className="w-full text-xs h-11 font-bold rounded-xl mt-4 bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md active:scale-95"
      >
        {isSaving ? "سیٹنگز محفوظ ہو رہی ہیں..." : "سیٹنگز محفوظ کریں"}
      </Button>
    </div>
  );
}

function AdminCoupons() {
  const { data: coupons, isLoading } = useCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const createNotification = useCreateNotification();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [isFreeDelivery, setIsFreeDelivery] = useState(false);
  const [active, setActive] = useState(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setCode("");
    setDiscountAmount("");
    setDiscountPercentage("");
    setQuantity("10");
    setIsFreeDelivery(false);
    setActive(true);
    setEditingId(null);
  };

  const openEdit = (coupon: any) => {
    setCode(coupon.code);
    setDiscountAmount(coupon.discountAmount?.toString() || "");
    setDiscountPercentage(coupon.discountPercentage?.toString() || "");
    setQuantity(coupon.quantity?.toString() || "0");
    setIsFreeDelivery(!!coupon.isFreeDelivery);
    setActive(coupon.active);
    setEditingId(coupon.id);
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!code) return;
    const data = {
      code: code.trim(),
      discountAmount: discountAmount ? parseInt(discountAmount) : 0,
      discountPercentage: discountPercentage ? parseInt(discountPercentage) : 0,
      quantity: parseInt(quantity) || 0,
      isFreeDelivery,
      active
    };

    if (editingId) {
      updateCoupon.mutate({ id: editingId, data }, {
        onSuccess: () => {
          toast({ title: "Coupon updated" });
          setIsOpen(false);
          resetForm();
        }
      });
    } else {
      createCoupon.mutate(data as any, {
        onSuccess: () => {
          toast({ title: "Coupon created" });
          // Send push notification for new coupon
          createNotification.mutate({
            title: "نیا ڈسکاؤنٹ کوڈ! 🎁",
            description: `استعمال کریں کوڈ: ${data.code} اور پائیں خصوصی ڈسکاؤنٹ۔`,
            type: "alert"
          });
          setIsOpen(false);
          resetForm();
        }
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
        <h2 className="urdu-text text-xl font-bold">ڈسکاؤنٹ کپنز (Coupons)</h2>
        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> <span className="urdu-text">نیا کپن</span></Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="urdu-text text-right text-xl">{editingId ? "کپن تبدیل کریں" : "نیا کپن شامل کریں"}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-2">
              <div className="space-y-1">
                <Label className="urdu-text block text-right">کپن کوڈ (جیسے EID50)</Label>
                <Input value={code} onChange={e => setCode(e.target.value)} dir="ltr" className="font-mono text-left" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="urdu-text block text-right">رقم کی چھوٹ (Rs)</Label>
                  <Input type="number" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} dir="ltr" className="text-left" />
                </div>
                <div className="space-y-1">
                  <Label className="urdu-text block text-right">فیصد چھوٹ (%)</Label>
                  <Input type="number" value={discountPercentage} onChange={e => setDiscountPercentage(e.target.value)} dir="ltr" className="text-left" max="100" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="urdu-text block text-right">مقدار (کتنی بار استعمال ہو سکتا ہے)</Label>
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} dir="ltr" className="text-left" />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="freeDel" checked={isFreeDelivery} onChange={e => setIsFreeDelivery(e.target.checked)} className="w-4 h-4" />
                  <label htmlFor="freeDel" className="text-sm">Free Delivery?</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4" />
                  <label htmlFor="active" className="text-sm">Active</label>
                </div>
              </div>
              <Button onClick={handleSave} disabled={createCoupon.isPending || updateCoupon.isPending}>
                <span className="urdu-text">{editingId ? "محفوظ کریں" : "شامل کریں"}</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading ? (
          <p className="text-center w-full col-span-full">Loading...</p>
        ) : coupons?.map(coupon => (
          <div key={coupon.id} className="bg-card border rounded-xl p-4 shadow-sm relative flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <Badge variant={coupon.active && coupon.quantity > 0 ? "default" : "destructive"}>
                  {coupon.active && coupon.quantity > 0 ? "Active" : "Inactive/Empty"}
                </Badge>
                <span className="font-mono font-bold text-lg text-primary">{coupon.code}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Discount: <strong className="text-foreground">
                  {coupon.discountAmount ? `Rs. ${coupon.discountAmount}` : coupon.discountPercentage ? `${coupon.discountPercentage}%` : "None"}
                </strong>
              </p>
              <p className="text-sm text-muted-foreground">Free Delivery: <strong className="text-foreground">{coupon.isFreeDelivery ? "Yes" : "No"}</strong></p>
              <p className="text-sm text-muted-foreground">Uses Left: <strong className="text-foreground">{coupon.quantity}</strong></p>
            </div>
            <div className="flex justify-end gap-2 mt-4 border-t pt-3">
              <Button size="icon" variant="outline" onClick={() => openEdit(coupon)} className="h-8 w-8 text-blue-600"><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="outline" onClick={() => setDeleteId(coupon.id)} className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>

      <DeleteConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteCoupon.mutate(deleteId, {
              onSuccess: () => { toast({ title: "Deleted successfully" }); setDeleteId(null); }
            });
          }
        }}
        title="حذف کریں"
        description="کیا آپ واقعی اس کپن کو حذف کرنا چاہتے ہیں؟"
      />
    </div>
  );
}


import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Minus, Plus, Trash2, ShoppingBag, ChevronLeft } from "lucide-react";
import { Layout } from "@/components/layout";
import { useCart } from "@/components/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useCreateOrder, usePaymentMethods, useCoupons, useUpdateCoupon, useUpdateUser } from "@/hooks/useFirebaseData";
import { getSessionId } from "@/lib/session";
import type { Coupon } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useAuth } from "@/lib/auth";
import { playUrduAudio } from "@/lib/audio";

export default function Cart() {
  const { items, updateQuantity, removeFromCart, clearCart, totalPrice, totalWeight } = useCart();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: coupons } = useCoupons();
  const updateCoupon = useUpdateCoupon();
  const updateUser = useUpdateUser();
  const { user } = useAuth();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [deliverySlot, setDeliverySlot] = useState<"07:00" | "11:00" | "16:00">("11:00");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online" | "wallet">("cod");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  useEffect(() => {
    if (user) {
      setCustomerName(prev => prev || user.name || "");
      setCustomerPhone(prev => prev || user.phone || "");
      setAddress(prev => prev || user.address || "");
    }
  }, [user]);

  let discount = 0;
  let isFreeDelivery = false;

  if (appliedCoupon) {
    if (appliedCoupon.isFreeDelivery) {
      isFreeDelivery = true;
    }
    if (appliedCoupon.discountPercentage) {
      discount = (totalPrice * appliedCoupon.discountPercentage) / 100;
    } else if (appliedCoupon.discountAmount) {
      discount = appliedCoupon.discountAmount;
    }
  }

  const calculatedDeliveryCharge = isFreeDelivery ? 0 : (totalWeight <= 8 ? 50 : 50 + Math.ceil(totalWeight - 8) * 10);
  const total = Math.max(0, totalPrice + calculatedDeliveryCharge - discount);

  const slotLabels: Record<string, string> = {
    "07:00": "7:00 صبح",
    "11:00": "11:00 دوپہر",
    "16:00": "4:00 شام",
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const coupon = coupons?.find(c => c.code.toLowerCase() === couponCode.toLowerCase().trim());
    if (!coupon) {
      toast({ title: "Invalid Coupon", description: "کپن کوڈ غلط ہے۔ (Invalid Code)", variant: "destructive" });
      return;
    }
    if (!coupon.active || coupon.quantity <= 0) {
      toast({ title: "Coupon Unavailable", description: "یہ کپن ختم ہو چکا ہے۔ (Expired/Exhausted)", variant: "destructive" });
      return;
    }
    setAppliedCoupon(coupon);
    toast({ title: "Coupon Applied!", description: "ڈسکاؤنٹ شامل کر دیا گیا ہے۔" });
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      toast({ title: "Account Required", description: "Please signup or login to place an order.", variant: "destructive" });
      setLocation("/signup");
      return;
    }
    if (!customerName || !customerPhone || !address) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Cart is empty", description: "Add items before ordering." });
      return;
    }
    if (paymentMethod === "wallet") {
      if (user.balance < total || user.balance === 0) {
        toast({ title: "Insufficient Balance", description: "آپ کے اکاؤنٹ میں بیلنس کم ہے۔ براہ کرم ٹاپ اپ کریں۔ (Plz top up account)", variant: "destructive" });
        return;
      }
    }
    createOrder.mutate(
      {
        sessionId: getSessionId(),
        userId: user?.uid || null,
        customerName,
        customerPhone,
        customerAddress: address, 
        items: items.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          productNameUrdu: item.product.nameUrdu,
          quantity: item.quantity,
          unit: item.product.unit,
          price: item.product.price,
        })),
        total,
        deliveryCharge: calculatedDeliveryCharge,
        status: "pending",
        paymentMethod,
        paymentScreenshot: screenshotUrl,
        couponCode: appliedCoupon?.code || null,
        discountAmount: discount || 0,
      } as any, 
      {
        onSuccess: (order) => {
          if (paymentMethod === "wallet") {
            updateUser.mutate({ id: user.uid, data: { balance: user.balance - total } });
          }
          if (appliedCoupon) {
            updateCoupon.mutate({ id: appliedCoupon.id, data: { quantity: appliedCoupon.quantity - 1 } });
          }
          clearCart();
          setLocation(`/checkout/success?tracking=${order.trackingNumber}`);
        },
        onError: () => {
          toast({ title: "Order failed", description: "Please try again.", variant: "destructive" });
        },
      }
    );
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag className="w-12 h-12 text-primary/60" />
          </div>
          <h2 className="urdu-text text-2xl font-bold mb-2">کارٹ خالی ہے</h2>
          <p className="text-muted-foreground text-sm mb-6">آپ کا کارٹ خالی ہے۔ کچھ مصنوعات شامل کریں!</p>
          <Button asChild className="rounded-xl px-8">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/"><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="urdu-text text-2xl font-bold flex-1 text-right">آپ کا کارٹ</h1>
        </div>

        {/* Cart Items */}
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.product.id} className="bg-card border rounded-xl p-3 flex gap-3 shadow-sm">
              <div className="w-20 h-20 bg-muted/20 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                {item.product.imageUrl ? (
                  <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-primary/10 rounded-full" />
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div className="text-right">
                  <h3 className="urdu-text text-lg font-bold leading-tight">{item.product.nameUrdu}</h3>
                  <p className="text-xs text-muted-foreground">{item.product.name}</p>
                  <p className="font-semibold text-sm mt-0.5">Rs. {(item.product.price * item.quantity).toFixed(0)}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button onClick={() => removeFromCart(item.product.id)} className="text-destructive hover:text-destructive/70 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 bg-secondary rounded-lg px-1 py-0.5 border">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-md" 
                      onClick={() => {
                        const step = (item.product.unit === "kg" || item.product.unit === "liter" || item.product.unit === "dozen") ? 0.5 : 1;
                        updateQuantity(item.product.id, item.quantity - step);
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-bold w-6 text-center text-sm">{item.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-md" 
                      onClick={() => {
                        const step = (item.product.unit === "kg" || item.product.unit === "liter" || item.product.unit === "dozen") ? 0.5 : 1;
                        updateQuantity(item.product.id, item.quantity + step);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-card border rounded-xl p-4 flex flex-col gap-2 shadow-sm">
          <h2 className="urdu-text text-xl font-bold text-right mb-2">حساب کتاب</h2>
          <div className="flex justify-between text-sm">
            <span className="font-medium">Rs. {totalPrice.toFixed(0)}</span>
            <span className="text-muted-foreground">Subtotal</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium">Rs. {calculatedDeliveryCharge}</span>
            <span className="text-muted-foreground urdu-text">
              {isFreeDelivery ? "مفت ڈیلیوری" : `ڈیلیوری چارجز (${totalWeight.toFixed(2)} kg)`}
            </span>
          </div>
          {appliedCoupon && (
            <div className="flex justify-between text-sm text-green-600">
              <span className="font-medium">- Rs. {discount.toFixed(0)}</span>
              <span className="text-muted-foreground urdu-text">ڈسکاؤنٹ ({appliedCoupon.code})</span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex justify-between font-bold">
            <span className="text-lg">Rs. {total.toFixed(0)}</span>
            <span className="urdu-text text-lg">کل رقم</span>
          </div>
        </div>

        {/* Checkout Form */}
        <div className="bg-card border rounded-xl p-4 flex flex-col gap-4 shadow-sm">
          <h2 className="urdu-text text-xl font-bold text-right">ترسیل کی تفصیل</h2>

          <div className="space-y-1">
            <Label className="text-right block urdu-text">ڈسکاؤنٹ کپن</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button onClick={handleApplyCoupon} type="button" variant="secondary" className="h-10 px-4 whitespace-nowrap" disabled={!!appliedCoupon}>
                Apply
              </Button>
              <Input 
                value={couponCode} 
                onChange={e => setCouponCode(e.target.value)} 
                placeholder="کپن کوڈ (Coupon Code)" 
                className="h-10 text-left font-mono" 
                dir="ltr" 
                disabled={!!appliedCoupon}
              />
            </div>
            {appliedCoupon && (
              <p className="text-xs text-green-600 font-medium text-right mt-1">
                کپن نافذ کر دیا گیا! 
                <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="text-destructive ml-2 underline">ہٹائیں</button>
              </p>
            )}
          </div>
          <Separator className="my-1" />

          <div className="space-y-1">
            <Label className="text-right block urdu-text">نام *</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} onFocus={() => playUrduAudio("اپنا پورا نام لکھیں")} placeholder="Full Name (Ali Khan)" className="text-left" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-right block urdu-text">موبائل نمبر *</Label>
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} onFocus={() => playUrduAudio("اپنا موبائل نمبر درج کریں")} placeholder="03001234567" type="tel" className="text-left font-mono" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-right block urdu-text">پتہ *</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} onFocus={() => playUrduAudio("اپنا مکمل پتہ درج کریں")} placeholder="House / Street / Area / City" className="text-left" dir="ltr" />
          </div>

          <div className="space-y-1">
            <Label className="text-right block urdu-text">ڈیلیوری وقت</Label>
            <Select value={deliverySlot} onValueChange={(v) => setDeliverySlot(v as "07:00" | "11:00" | "16:00")}>
              <SelectTrigger className="text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(slotLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    <span className="urdu-text">{l}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-right block urdu-text">ادائیگی کا طریقہ</Label>
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "cod" | "online" | "wallet")} className="flex flex-col gap-2">
              <div className="flex items-center justify-end gap-3 bg-background rounded-lg p-3 border cursor-pointer">
                <label htmlFor="cod" className="urdu-text text-sm font-medium cursor-pointer">نقد ادائیگی (Cash on Delivery)</label>
                <RadioGroupItem value="cod" id="cod" />
              </div>
              <div className="flex items-center justify-end gap-3 bg-background rounded-lg p-3 border cursor-pointer">
                <label htmlFor="online" className="urdu-text text-sm font-medium cursor-pointer">آن لائن ادائیگی</label>
                <RadioGroupItem value="online" id="online" />
              </div>
              <div className="flex items-center justify-end gap-3 bg-background rounded-lg p-3 border cursor-pointer">
                <div className="flex-1 text-left">
                  {user && (
                    <span className="text-xs font-mono font-bold text-primary ml-2">Balance: Rs. {user.balance || 0}</span>
                  )}
                </div>
                <label htmlFor="wallet" className="urdu-text text-sm font-medium cursor-pointer">اکاؤنٹ والیٹ (Wallet)</label>
                <RadioGroupItem value="wallet" id="wallet" />
              </div>
            </RadioGroup>
          </div>

          {/* Payment details - ONLY show if Online Payment is selected */}
          {paymentMethod === "online" && paymentMethods && paymentMethods.filter(pm => pm.active).length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col gap-2">
              <h3 className="urdu-text text-base font-bold text-right text-primary">بینک تفصیلات (برائے آن لائن ادائیگی)</h3>
              {paymentMethods.filter(pm => pm.active).map(pm => (
                <div key={pm.id} className="text-right border-b last:border-0 pb-2 mb-2 last:mb-0 last:pb-0">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <p className="font-bold text-sm">{pm.bankName}</p>
                    {pm.logoUrl && <img src={pm.logoUrl} alt={pm.bankName} className="h-5 object-contain" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{pm.holderName}</p>
                  <p className="font-mono text-sm font-bold text-primary">{pm.accountNumber}</p>
                </div>
              ))}
              
              {/* Screenshot Upload for Online Payment */}
              <div className="mt-3 border-t border-primary/20 pt-3 flex flex-col gap-2">
                <p className="urdu-text text-sm font-bold text-right text-red-600">
                  اسکرین شاٹ کے بغیر آن لائن پیمنٹ قبول نہیں کی جائے گی
                </p>
                <div className="flex items-center justify-between gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 h-10 gap-2"
                    onClick={() => document.getElementById("screenshot-upload")?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : screenshotUrl ? "Change Screenshot" : "Upload Screenshot"}
                  </Button>
                  <input 
                    type="file" 
                    id="screenshot-upload" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          setIsUploading(true);
                          const url = await uploadToCloudinary(file);
                          setScreenshotUrl(url);
                        } catch (err) {
                          alert("Upload failed");
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    }}
                  />
                </div>
                {screenshotUrl && (
                  <div className="w-full h-32 bg-muted rounded-lg overflow-hidden border">
                    <img src={screenshotUrl} alt="Screenshot" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={handlePlaceOrder}
          disabled={createOrder.isPending || (paymentMethod === "online" && !screenshotUrl) || isUploading}
          className="w-full h-14 text-lg font-bold rounded-xl shadow-lg mt-2"
        >
          {createOrder.isPending ? "Processing..." : <span className="urdu-text">آرڈر دیں</span>}
        </Button>
      </div>
    </Layout>
  );
}

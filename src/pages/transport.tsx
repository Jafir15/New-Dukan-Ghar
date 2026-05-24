import { useState } from "react";
import { 
  useVehicles, 
  useBookings, 
  useCreateBooking,
  useDeleteBooking
} from "@/hooks/useFirebaseData";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { playUrduAudio } from "@/lib/audio";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Clock, CheckCircle, X, ChevronRight, ChevronLeft, Trash2, MapPin, User, Briefcase, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSessionId } from "@/lib/session";
import { useQueryClient } from "@tanstack/react-query";
import { serverTimestamp } from "firebase/firestore";

const VEHICLE_TYPES: Record<string, string> = {
  rickshaw: "رکشہ",
  chigchi: "چنگچی",
  carry_bolan: "کیری بولان",
  car: "گاڑی",
  high_roof: "ہائی روف",
  bus: "بس",
};

const BOOKING_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "زیرِ غور ⏳", color: "bg-red-600 text-white border border-red-700 font-bold shadow-sm" },
  confirmed: { label: "تصدیق شدہ ✅", color: "bg-red-600 text-white border border-red-700 font-bold shadow-sm" },
  completed: { label: "مکمل 📦", color: "bg-red-600 text-white border border-red-700 font-bold shadow-sm" },
  cancelled: { label: "منسوخ ❌", color: "bg-red-600 text-white border border-red-700 font-bold shadow-sm" },
};

export default function Transport() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: vehicles, isLoading } = useVehicles();
  const { data: allBookings } = useBookings();
  const bookings = allBookings?.filter(b => {
    if (user?.uid) {
      // Logged in: ONLY show bookings belonging to THIS Firebase account
      return b.userId === user.uid;
    }
    // Guest: show by browser session
    return b.sessionId === getSessionId();
  });
  
  const createBooking = useCreateBooking();
  const deleteBooking = useDeleteBooking();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [passengersDetail, setPassengersDetail] = useState("");
  const [luggageDetail, setLuggageDetail] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [travelTime, setTravelTime] = useState("");

  const handleBook = (vehicleId: string) => {
    if (!user) {
      toast({ title: "Account Required", description: "Please signup or login to book a vehicle.", variant: "destructive" });
      setLocation("/signup");
      return;
    }
    setSelectedVehicleId(vehicleId);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("آیا آپ یہ بکنگ ختم کرنا چاہتے ہیں؟")) {
      deleteBooking.mutate(id, {
        onSuccess: () => {
          toast({ title: "Booking deleted" });
        }
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !customerName || !customerPhone || !passengersDetail || !luggageDetail || !travelTime) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    
    const vehicle = vehicles?.find(v => v.id === selectedVehicleId);

    createBooking.mutate(
      {
        sessionId: getSessionId(),
        userId: user?.uid || null,
        vehicleId: selectedVehicleId,
        vehicleNameUrdu: vehicle?.nameUrdu || "",
        customerName,
        customerPhone,
        passengersDetail,
        luggageDetail,
        pickupAddress: pickupAddress || null,
        dropoffAddress: dropoffAddress || null,
        travelTime,
        status: "pending",
        createdAt: serverTimestamp(),
        adminAddress: null,
        agreedRent: null
      } as any,
      {
        onSuccess: () => {
          setIsOpen(false);
          setCustomerName(""); setCustomerPhone(""); setPassengersDetail(""); setLuggageDetail(""); setPickupAddress(""); setDropoffAddress(""); setTravelTime("");
          queryClient.invalidateQueries({ queryKey: ["bookings"] });
          toast({ title: "Booking Confirmed!", description: "10 minuts men aap sy rabta kia jaye ga." });
        },
        onError: () => {
          toast({ title: "Booking failed", variant: "destructive" });
        },
      }
    );
  };

  const selectedVehicle = vehicles?.find(v => v.id === selectedVehicleId);

  return (
    <Layout>
      <div className="p-4 flex flex-col gap-5">
        <h1 className="urdu-text text-2xl font-bold text-right">ٹرانسپورٹ سروس</h1>

        {/* Vehicle Grid */}
        <section>
          <h2 className="urdu-text text-lg font-semibold text-right mb-3 text-muted-foreground">دستیاب گاڑیاں</h2>
          <div className="grid grid-cols-2 gap-3">
            {isLoading ? (
              Array(6).fill(0).map((_, i) => <Skeleton key={i} className="w-full h-40 rounded-xl" />)
            ) : (
              vehicles?.map(v => (
                <div
                  key={v.id}
                  onClick={() => handleBook(v.id)}
                  className="bg-card border rounded-xl p-4 flex flex-col gap-2 shadow-sm hover-elevate hover:border-primary/40 transition-colors text-left group cursor-pointer"
                >
                  <div className="w-full aspect-square bg-muted/20 rounded-lg flex items-center justify-center mb-2 group-hover:bg-primary/5 transition-colors overflow-hidden">
                    {v.imageUrl ? (
                      <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" />
                    ) : (
                      <Truck className="w-12 h-12 text-primary/40" />
                    )}
                  </div>
                  <div className="text-right">
                    <p className="urdu-text text-xl font-bold leading-tight">{v.nameUrdu}</p>
                    <p className="text-xs text-muted-foreground">{v.name}</p>
                    <p className="font-semibold text-primary mt-1">Rs. {v.baseRent}+</p>
                  </div>
                  <div className="w-full h-9 mt-1 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-sm font-medium">
                    <span className="urdu-text">بک کریں</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Booking History Tab/Section */}
        <section className="mt-4">
          <h2 className="urdu-text text-lg font-semibold text-right mb-3 text-primary">میری بکنگز (My Bookings)</h2>
          <div className="flex flex-col gap-3">
            {bookings && bookings.length > 0 ? (
              bookings.map(b => {
                const status = BOOKING_STATUS[b.status] ?? BOOKING_STATUS.pending;
                return (
                  <div key={b.id} className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex flex-col gap-2">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full urdu-text text-center ${status.color}`}>{status.label}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(b.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="urdu-text font-bold text-base">{b.vehicleNameUrdu}</p>
                        <p className="text-xs text-muted-foreground">{b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString("ur-PK") : "Processing..."}</p>
                      </div>
                    </div>
                    
                    {/* My Details Area */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                      <div className="bg-muted/30 p-2 rounded-lg text-right flex flex-col justify-center">
                        <div className="flex items-center justify-end gap-1 mb-1">
                          <span className="urdu-text text-[10px] text-muted-foreground">سواریاں / سامان</span>
                          <User className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <p className="text-[10px] font-bold leading-tight urdu-text">{b.passengersDetail} — {b.luggageDetail}</p>
                      </div>
                      <div className="bg-muted/30 p-2 rounded-lg text-right flex flex-col justify-center">
                        <div className="flex items-center justify-end gap-1 mb-1">
                          <span className="urdu-text text-[10px] text-muted-foreground">وقت (Duration)</span>
                          <Clock className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <p className="text-[10px] font-bold urdu-text">{b.travelTime || "---"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-primary/5 p-2 rounded-lg text-right border border-primary/10">
                        <p className="text-[10px] text-primary urdu-text font-bold">متفقہ کرایہ:</p>
                        <p className="text-sm font-black text-primary">{b.agreedRent != null ? `Rs. ${b.agreedRent}` : "پینڈنگ"}</p>
                      </div>
                      <div className="bg-muted/30 p-2 rounded-lg text-right overflow-hidden">
                        <p className="text-[10px] text-muted-foreground urdu-text">اضافی تفصیلات:</p>
                        <p className="text-[10px] font-medium truncate urdu-text">{b.adminAddress || "پینڈنگ"}</p>
                      </div>
                    </div>

                    <div className="mt-3 text-right bg-muted/20 p-2 rounded-lg border border-dashed">
                       <div className="flex items-center justify-between gap-2 px-1">
                         <div className="flex flex-col items-center gap-1 flex-1">
                           <div className="flex items-center gap-1 text-primary">
                             <MapPin className="w-3 h-3" />
                             <span className="urdu-text text-[10px] font-bold">منزل</span>
                           </div>
                           <p className="text-[11px] font-medium leading-tight line-clamp-1 urdu-text">{b.dropoffAddress || "---"}</p>
                         </div>

                         <div className="flex flex-col items-center justify-center px-2">
                           <div className="h-[1px] w-8 bg-muted-foreground/30 relative">
                             <ChevronLeft className="w-3 h-3 absolute -left-2 -top-[5.5px] text-muted-foreground/40" />
                           </div>
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

                    {/* Assigned Vehicle & Driver (User Side) */}
                    {(b.assignedVehicleName || b.driverName) && (
                      <div className="mt-2 bg-primary/10 p-3 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-1 duration-500">
                         <div className="grid grid-cols-2 gap-2">
                            <div className="text-right">
                              <p className="text-[9px] text-muted-foreground urdu-text">بھیجی گئی گاڑی:</p>
                              <p className="text-[11px] font-bold text-primary urdu-text">{b.assignedVehicleName} {b.assignedVehicleNumber && `(${b.assignedVehicleNumber})`}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-muted-foreground urdu-text">ڈرائیور کا نام:</p>
                              <p className="text-[11px] font-bold text-primary urdu-text">{b.driverName} {b.driverNumber && `(${b.driverNumber})`}</p>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed">
                <Truck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="urdu-text text-muted-foreground">آپ نے ابھی کوئی بکنگ نہیں کی</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Booking Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="mx-auto max-w-[400px] w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="urdu-text text-xl text-right">
              {selectedVehicle ? selectedVehicle.nameUrdu : ""} بک کریں
            </DialogTitle>
            <DialogDescription className="sr-only">گاڑی بک کرنے کا فارم</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="space-y-1">
              <Label className="urdu-text text-right block text-xs">نام *</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} onFocus={() => playUrduAudio("اپنا پورا نام لکھیں")} placeholder="آپ کا نام" className="text-right urdu-text" dir="ltr" required />
            </div>
            <div className="space-y-1">
              <Label className="urdu-text text-right block">موبائل نمبر *</Label>
              <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} onFocus={() => playUrduAudio("اپنا موبائل نمبر درج کریں")} placeholder="03001234567" type="tel" className="urdu-text text-right" dir="ltr" required />
            </div>
            <div className="space-y-1">
              <Label className="urdu-text text-right block text-xs">سواریوں/بچوں کی تفصیل *</Label>
              <Textarea value={passengersDetail} onChange={e => setPassengersDetail(e.target.value)} placeholder="کتنے لوگ، عمریں..." className="text-right resize-none urdu-text" rows={2} required />
            </div>
            <div className="space-y-1">
              <Label className="urdu-text text-right block text-xs">سامان کی تفصیل *</Label>
              <Textarea value={luggageDetail} onChange={e => setLuggageDetail(e.target.value)} placeholder="سامان کی تفصیل..." className="text-right resize-none urdu-text" rows={2} required />
            </div>
            <div className="space-y-1">
              <Label className="urdu-text text-right block text-xs">کتنا وقت / دورانیہ؟ *</Label>
              <Select value={travelTime} onValueChange={setTravelTime}>
                <SelectTrigger className="text-right urdu-text"><SelectValue placeholder="وقت کا انتخاب کریں" /></SelectTrigger>
                <SelectContent className="urdu-text">
                  <SelectItem value="10-30 mins">10-30 منٹ</SelectItem>
                  <SelectItem value="1 hour">1 گھنٹہ</SelectItem>
                  <SelectItem value="2-4 hours">2-4 گھنٹے</SelectItem>
                  <SelectItem value="Full Day">پورا دن</SelectItem>
                  <SelectItem value="Other">دیگر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="urdu-text text-right block text-[10px]">منزل کا پتہ</Label>
                <Input value={dropoffAddress} onChange={e => setDropoffAddress(e.target.value)} onFocus={() => playUrduAudio("منزل کا پتہ درج کریں")} placeholder="کہاں جانا ہے؟" className="text-right urdu-text text-xs h-9" dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label className="urdu-text text-right block text-[10px]">روانگی کا پتہ</Label>
                <Input value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} onFocus={() => playUrduAudio("روانگی کا پتہ درج کریں")} placeholder="کہاں سے؟" className="text-right urdu-text text-xs h-9" dir="ltr" />
              </div>
            </div>

            <p className="urdu-text text-[11px] text-center text-primary font-bold mt-1 bg-primary/5 py-2 rounded-lg">
               بکنگ مکمل ہوتے ہی 10 منٹ میں آپ سے رابطہ کیا جائے گا۔
            </p>

            <Button type="submit" disabled={createBooking.isPending} className="w-full h-12 text-base font-bold rounded-xl mt-1">
              {createBooking.isPending ? "Booking..." : <span className="urdu-text">بکنگ کی تصدیق کریں</span>}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

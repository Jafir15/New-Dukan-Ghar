import { useState } from "react";
import { useBookings, useUpdateBooking } from "@/hooks/useFirebaseData";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, ChevronLeft, User, Briefcase, Clock, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BOOKING_STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled"];
const BOOKING_STATUS_LABELS: Record<string, string> = { pending: "زیرِ غور", confirmed: "تصدیق شدہ", completed: "مکمل", cancelled: "منسوخ" };

export function AdminBookings() {
  const { data: bookings } = useBookings();
  const updateBooking = useUpdateBooking();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Record<string, any>>({});

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
        travelTime: b.travelTime || ""
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
        travelTime: e.travelTime || null
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

  return (
    <div className="flex flex-col gap-3">
      <h2 className="urdu-text text-xl font-bold text-right">بکنگ مینجمنٹ</h2>
      {bookings?.map(b => (
        <div key={b.id} className="bg-card border rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <Select defaultValue={b.status} onValueChange={v => handleStatusChange(b.id, v)}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{BOOKING_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}><span className="urdu-text text-xs">{BOOKING_STATUS_LABELS[s]}</span></SelectItem>)}</SelectContent>
            </Select>
            <div className="text-right">
              <p className="font-bold urdu-text">{b.vehicleNameUrdu}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                {b.customerName} — {b.customerPhone} <Phone className="w-3 h-3" />
              </p>
            </div>
          </div>

          {editing[b.id] ? (
            <div className="flex flex-col gap-3 border-t pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">روانگی کا پتہ</label>
                   <Input value={editing[b.id].pickupAddress} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], pickupAddress: e.target.value } }))} placeholder="Pickup" className="text-right" />
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">منزل کا پتہ</label>
                   <Input value={editing[b.id].dropoffAddress} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], dropoffAddress: e.target.value } }))} placeholder="Dropoff" className="text-right" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">سواریاں</label>
                   <Input value={editing[b.id].passengersDetail} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], passengersDetail: e.target.value } }))} placeholder="Passengers" className="text-right" />
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">سامان</label>
                   <Input value={editing[b.id].luggageDetail} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], luggageDetail: e.target.value } }))} placeholder="Luggage" className="text-right" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">کتنا وقت (Time)</label>
                   <Input value={editing[b.id].travelTime} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], travelTime: e.target.value } }))} placeholder="e.g. 2 hours" className="text-right" />
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-muted-foreground text-right urdu-text">متفقہ کرایہ</label>
                   <Input value={editing[b.id].agreedRent} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], agreedRent: e.target.value } }))} placeholder="Rent" type="number" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                 <label className="text-[10px] text-muted-foreground text-right urdu-text">اضافی تفصیلات / پتہ</label>
                 <Input value={editing[b.id].adminAddress} onChange={e => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], adminAddress: e.target.value } }))} placeholder="Info for customer" className="text-right urdu-text" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveEdit(b.id)} disabled={updateBooking.isPending} className="flex-1">Save All Changes</Button>
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
                    <p className="text-[11px] font-medium leading-tight line-clamp-1">{b.dropoffAddress || "---"}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center px-1">
                    <ChevronLeft className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="flex items-center gap-1 text-primary">
                      <MapPin className="w-3 h-3" />
                      <span className="urdu-text text-[10px] font-bold">روانگی</span>
                    </div>
                    <p className="text-[11px] font-medium leading-tight line-clamp-1">{b.pickupAddress || "---"}</p>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 p-2 rounded-lg text-right flex items-start justify-end gap-2">
                   <div>
                     <p className="text-[10px] text-muted-foreground urdu-text">سواریاں:</p>
                     <p className="text-xs font-bold">{b.passengersDetail}</p>
                   </div>
                   <User className="w-3 h-3 text-muted-foreground mt-1" />
                </div>
                <div className="bg-muted/30 p-2 rounded-lg text-right flex items-start justify-end gap-2">
                   <div>
                     <p className="text-[10px] text-muted-foreground urdu-text">سامان:</p>
                     <p className="text-xs font-bold">{b.luggageDetail}</p>
                   </div>
                   <Briefcase className="w-3 h-3 text-muted-foreground mt-1" />
                </div>
                <div className="bg-muted/30 p-2 rounded-lg text-right flex items-start justify-end gap-2">
                   <div>
                     <p className="text-[10px] text-muted-foreground urdu-text">وقت:</p>
                     <p className="text-xs font-bold">{b.travelTime || "---"}</p>
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

              <Button size="sm" variant="outline" onClick={() => startEdit(b)} className="w-full text-xs h-8">
                Edit All Details & Rent
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect } from "react";
import { 
  useUserCustomRequests, 
  useCreateCustomRequest,
  useDeleteCustomRequest
} from "@/hooks/useFirebaseData";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileText, Image as ImageIcon, Loader2, Send, Trash2, Clock, CheckCircle, AlertCircle, X, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSessionId } from "@/lib/session";
import { uploadToCloudinary } from "@/lib/cloudinary";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "زیرِ غور ⏳", color: "bg-red-600 text-white border-red-700 font-bold shadow-sm" },
  confirmed: { label: "تصدیق شدہ ✅", color: "bg-red-600 text-white border-red-700 font-bold shadow-sm" },
  completed: { label: "مکمل 📦", color: "bg-red-600 text-white border-red-700 font-bold shadow-sm" },
  cancelled: { label: "منسوخ ❌", color: "bg-red-600 text-white border-red-700 font-bold shadow-sm" },
};

export default function CustomOrder() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const sessionId = getSessionId();

  const { data: requests, isLoading } = useUserCustomRequests(user?.uid, sessionId);
  const createRequest = useCreateCustomRequest();
  const deleteRequest = useDeleteCustomRequest();

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [details, setDetails] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Lightbox Modal state
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Auto pre-fill if authenticated
  useEffect(() => {
    if (user) {
      setCustomerName(user.name || "");
      setCustomerPhone(user.phone || "");
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "اکاؤنٹ درکار ہے",
        description: "خصوصی آرڈر بھیجنے کے لیے لاگ ان یا سائن اپ کریں۔",
        variant: "destructive",
      });
      setLocation("/signup");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      toast({
        title: "معلومات نامکمل ہیں",
        description: "برائے مہربانی اپنا نام اور موبائل نمبر درج کریں۔",
        variant: "destructive",
      });
      return;
    }

    // Must have either details or an image
    if (!details.trim() && !imageFile) {
      toast({
        title: "تفصیلات درکار ہیں",
        description: "برائے مہربانی کوئی تفصیل لکھیں یا فہرست/پرچی کی تصویر اپ لوڈ کریں۔",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      let uploadedUrl: string | null = null;
      if (imageFile) {
        setUploadingImage(true);
        uploadedUrl = await uploadToCloudinary(imageFile);
        setUploadingImage(false);
      }

      await createRequest.mutateAsync({
        sessionId,
        userId: user?.uid || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        details: details.trim(),
        imageUrl: uploadedUrl,
        status: "pending",
        deliveryCharge: null,
        adminNotes: null,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: "آرڈر کامیابی سے بھیج دیا گیا ہے!",
        description: "انتظامیہ آپ سے جلد رابطہ کرے گی۔",
      });

      // Clear form
      setDetails("");
      setImageFile(null);
      setImagePreview(null);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "خرابی",
        description: error.message || "آرڈر بھیجنے میں مسئلہ پیش آیا۔ دوبارہ کوشش کریں۔",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (confirm("کیا آپ واقعی یہ خصوصی آرڈر منسوخ/حذف کرنا چاہتے ہیں؟")) {
      try {
        await deleteRequest.mutateAsync(id);
        toast({ title: "آرڈر حذف کر دیا گیا ہے" });
      } catch (error) {
        toast({ title: "خرابی", description: "حذف کرنے میں مسئلہ پیش آیا۔", variant: "destructive" });
      }
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 p-4 pb-12">
        {/* Header Section */}
        <div className="text-right border-b pb-4">
          <h1 className="urdu-text text-2xl font-bold text-primary flex items-center justify-end gap-2">
            خصوصی آرڈر / پرچی بھیجیں <FileText className="w-6 h-6 text-primary" />
          </h1>
          <p className="urdu-text text-xs text-muted-foreground mt-1">
            راشن کی لسٹ، ادویات کا نسخہ (ڈاکٹر کی پرچی)، یا کوئی بھی سامان منگوانے کے لیے نیچے فارم پُر کریں
          </p>
        </div>

        {/* Submit Form */}
        <section className="bg-card border rounded-2xl shadow-sm p-4 text-right">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="urdu-text text-xs font-semibold">موبائل نمبر</Label>
                <Input 
                  required
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="03001234567"
                  className="text-left font-mono h-10"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label className="urdu-text text-xs font-semibold">آپ کا نام</Label>
                <Input 
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Ali Khan"
                  className="text-left h-10"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1">
              <Label className="urdu-text text-xs font-semibold">سامان کی تفصیل لکھیں</Label>
              <Textarea 
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Write your grocery list, medicine names, or parcel details here..."
                className="text-left dir-ltr min-h-[120px] rounded-xl focus-visible:ring-primary leading-relaxed"
                dir="ltr"
              />
            </div>

            {/* Image Upload Area */}
            <div className="space-y-2">
              <Label className="urdu-text text-xs font-semibold block">تصویر / پرچی اپ لوڈ کریں (اختیاری)</Label>
              
              {!imagePreview ? (
                <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl hover:border-primary/40 transition-colors bg-muted/10">
                  <label className="cursor-pointer flex flex-col items-center justify-center py-6 px-4 gap-1.5 text-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    <span className="urdu-text text-xs font-medium text-foreground">پرچی، لسٹ یا ڈاکٹر کا پرچہ اپ لوڈ کریں</span>
                    <span className="urdu-text text-[10px] text-muted-foreground">صرف تصویر (JPEG, PNG) اپ لوڈ کریں</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange}
                      className="hidden" 
                    />
                  </label>
                </div>
              ) : (
                <div className="relative border rounded-xl overflow-hidden bg-muted/20 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="ghost" 
                      onClick={handleRemoveImage}
                      className="h-7 w-7 text-destructive hover:bg-destructive/15 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{imageFile?.name}</span>
                  </div>
                  <div className="w-16 h-16 rounded-lg overflow-hidden border bg-background shrink-0 shadow-sm">
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={submitting} 
              className="w-full h-11 rounded-xl font-bold urdu-text text-sm flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  آرڈر بھیجا جا رہا ہے...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  خصوصی آرڈر بھیجیں
                </>
              )}
            </Button>
          </form>
        </section>

        {/* User's Previous Custom Orders */}
        <section className="mt-4">
          <h2 className="urdu-text text-xl font-bold text-right mb-4 flex items-center justify-end gap-2 border-r-4 border-primary pr-2">
            میرے پہلے بھیجے گئے آرڈرز
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="w-full h-32 rounded-2xl" />
              <Skeleton className="w-full h-32 rounded-2xl" />
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="text-center py-8 border rounded-2xl border-dashed bg-card flex flex-col items-center justify-center p-4">
              <HelpCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="urdu-text text-sm text-muted-foreground">آپ کا کوئی پہلے کا خصوصی آرڈر نہیں ہے۔</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const config = STATUS_CONFIG[req.status] || { label: req.status, color: "bg-muted text-muted-foreground" };
                return (
                  <div key={req.id} className="bg-card border rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4 text-right flex flex-col gap-3 relative overflow-hidden group">
                    
                    {/* Top Row - Status Badge & Date */}
                    <div className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center gap-1.5">
                        {req.status === "pending" && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 text-destructive rounded-full hover:bg-destructive/10"
                            onClick={() => handleDeleteRequest(req.id)}
                            title="حذف کریں"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Badge className={`${config.color} border px-2 py-0.5 rounded-full text-[10px]`}>
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span>{req.createdAt ? new Date(req.createdAt).toLocaleString("ur-PK", { dateStyle: "short", timeStyle: "short" }) : "Processing..."}</span>
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Details content */}
                    {req.details && (
                      <p className="urdu-text text-sm leading-relaxed text-foreground/95 break-words">
                        {req.details}
                      </p>
                    )}

                    {/* Uploaded picture if available */}
                    {req.imageUrl && (
                      <div className="flex items-center justify-end gap-2 border-t pt-2 mt-1">
                        <span className="urdu-text text-[10px] text-muted-foreground">اپ لوڈ کی گئی تصویر:</span>
                        <div 
                          className="w-14 h-14 border rounded-lg overflow-hidden bg-muted/20 cursor-pointer hover:opacity-90 shadow-sm relative group"
                          onClick={() => setActiveImage(req.imageUrl ?? null)}
                        >
                          <img src={req.imageUrl} alt="Request slip" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}

                    {/* Updated Delivery Charges Banner */}
                    {req.deliveryCharge !== null && req.deliveryCharge !== undefined && (
                      <div className="bg-green-500/10 dark:bg-green-500/5 border border-green-500/20 rounded-xl p-3 flex justify-between items-center mt-1">
                        <span className="font-bold text-green-600 text-sm leading-none">Rs. {req.deliveryCharge}</span>
                        <span className="urdu-text text-xs text-green-800 dark:text-green-400 font-semibold flex items-center gap-1">
                          ڈیلیوری چارجز <CheckCircle className="w-4 h-4 text-green-600" />
                        </span>
                      </div>
                    )}

                    {/* Admin Response/Notes */}
                    {req.adminNotes && (
                      <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-right">
                        <span className="urdu-text text-[10px] text-primary/70 block mb-0.5 font-bold">دکان گھر انتظامیہ کی طرف سے نوٹ:</span>
                        <p className="urdu-text text-xs text-foreground/80 leading-relaxed">{req.adminNotes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Lightbox Dialog to view large slip images */}
      <Dialog open={!!activeImage} onOpenChange={(open) => !open && setActiveImage(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[420px] p-2 bg-black border-none rounded-2xl overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>بڑی تصویر دیکھیں</DialogTitle>
            <DialogDescription>آرڈر کی اپ لوڈ کی گئی تصویر کی تفصیل۔</DialogDescription>
          </DialogHeader>
          <div className="relative flex items-center justify-center max-h-[80vh] w-full bg-black">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setActiveImage(null)} 
              className="absolute top-2 left-2 z-50 bg-black/60 hover:bg-black/80 text-white rounded-full h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
            {activeImage && (
              <img src={activeImage} alt="Large custom request slip" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

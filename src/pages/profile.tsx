import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { doc, updateDoc, collection, query, where, orderBy, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { PaymentRequest } from "@/types";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Wallet, LogOut, Upload, CheckCircle2, XCircle, Clock, User, CreditCard, Banknote } from "lucide-react";
import { Layout } from "@/components/layout";
import { playUrduAudio } from "@/lib/audio";
import { usePaymentMethods } from "@/hooks/useFirebaseData";

function maskPhone(phone: string) {
  if (!phone || phone.length < 11) return phone;
  return `${phone.substring(0, 2)}*****${phone.substring(phone.length - 2)}`;
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, logout } = useAuth();
  const { data: paymentMethods } = usePaymentMethods();
  const [updating, setUpdating] = useState(false);
  const [transactions, setTransactions] = useState<PaymentRequest[]>([]);
  const [fetchingTx, setFetchingTx] = useState(false);

  // Layout State
  const [activeTab, setActiveTab] = useState<"profile" | "deposit" | "withdraw" | "history">("profile");

  // Profile Edit State
  const [profileData, setProfileData] = useState({ name: "", address: "" });

  // Payment Request State
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "",
    accountName: "",
    accountNumber: "",
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
    if (user) {
      setProfileData({ name: user.name || "", address: user.address || "" });
      fetchTransactions();
    }
  }, [user, authLoading]);

  useEffect(() => {
    // Reset and initialize payment form when activeTab or paymentMethods change
    const activeMethods = paymentMethods?.filter(pm => pm.active) || [];
    if (activeTab === "deposit") {
      setPaymentForm({
        amount: "",
        method: activeMethods.length > 0 ? activeMethods[0].bankName : "",
        accountName: "",
        accountNumber: "",
      });
    } else if (activeTab === "withdraw") {
      setPaymentForm({
        amount: "",
        method: "jazzcash",
        accountName: "",
        accountNumber: "",
      });
    }
    setScreenshotFile(null);
  }, [activeTab, paymentMethods]);

  const fetchTransactions = async () => {
    if (!user) return;
    setFetchingTx(true);
    try {
      const q = query(
        collection(db, "payment_requests"),
        where("userId", "==", user.uid),
      );
      const snapshot = await getDocs(q);
      const txs = snapshot.docs.map(doc => doc.data() as PaymentRequest);
      // Sort by createdAt desc locally
      txs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTransactions(txs);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setFetchingTx(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: profileData.name,
        address: profileData.address,
      });
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile.");
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    setLocation("/");
  };

  const submitPaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const isDeposit = activeTab === "deposit";
    const isWithdraw = activeTab === "withdraw";

    if (!paymentForm.amount || isNaN(Number(paymentForm.amount)) || Number(paymentForm.amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (isDeposit && !screenshotFile) {
      toast.error("Screenshot is required for deposits.");
      return;
    }
    if (isWithdraw && Number(paymentForm.amount) > user.balance) {
      toast.error("Insufficient balance.");
      return;
    }

    setSubmittingPayment(true);
    try {
      let proofScreenshot = null;
      if (screenshotFile) {
        proofScreenshot = await uploadToCloudinary(screenshotFile);
      }

      const id = "PAY-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
      
      const newRequest: PaymentRequest = {
        id,
        userId: user.uid,
        userName: user.name,
        userPhone: user.phone,
        type: isDeposit ? "deposit" : "withdraw",
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        accountName: paymentForm.accountName,
        accountNumber: paymentForm.accountNumber,
        proofScreenshot,
        status: "pending",
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "payment_requests", id), newRequest);
      toast.success(`${isDeposit ? 'Deposit' : 'Withdrawal'} request submitted successfully.`);
      setPaymentForm({ amount: "", method: "jazzcash", accountName: "", accountNumber: "" });
      setScreenshotFile(null);
      setActiveTab("history");
      fetchTransactions();
    } catch (error) {
      console.error("Payment request error:", error);
      toast.error("Failed to submit request.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-destructive">
            <LogOut size={20} />
          </Button>
        </div>

        {/* Top Action Tabs */}
        <div className="grid grid-cols-4 gap-1.5">
          <Button variant={activeTab === "profile" ? "default" : "outline"} onClick={() => setActiveTab("profile")} className="flex flex-col items-center h-auto py-2.5 px-1 gap-1">
            <User size={18} />
            <span className="text-[10px] sm:text-xs">My Profile</span>
          </Button>
          <Button variant={activeTab === "deposit" ? "default" : "outline"} onClick={() => setActiveTab("deposit")} className="flex flex-col items-center h-auto py-2.5 px-1 gap-1">
            <CreditCard size={18} />
            <span className="text-[10px] sm:text-xs">Deposit</span>
          </Button>
          <Button variant={activeTab === "withdraw" ? "default" : "outline"} onClick={() => setActiveTab("withdraw")} className="flex flex-col items-center h-auto py-2.5 px-1 gap-1">
            <Banknote size={18} />
            <span className="text-[10px] sm:text-xs">Withdraw</span>
          </Button>
          <Button variant={activeTab === "history" ? "default" : "outline"} onClick={() => setActiveTab("history")} className="flex flex-col items-center h-auto py-2.5 px-1 gap-1">
            <Clock size={18} />
            <span className="text-[10px] sm:text-xs font-urdu">History</span>
          </Button>
        </div>

        {/* Wallet Section (Always visible below tabs) */}
        <div className="bg-primary/5 p-5 rounded-xl border border-primary/20 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary rounded-full text-primary-foreground">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Account Balance</p>
              <h2 className="text-3xl font-bold text-foreground">Rs. {user.balance.toLocaleString()}</h2>
            </div>
          </div>
        </div>

        {/* Conditional Content based on Active Tab */}
        
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Personal Information</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label>Phone Number</Label>
                  <Label className="urdu-text text-primary">موبائل نمبر</Label>
                </div>
                <Input value={maskPhone(user.phone)} disabled className="bg-muted text-muted-foreground urdu-text text-right" dir="ltr" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label>Email</Label>
                  <Label className="urdu-text text-primary">ای میل</Label>
                </div>
                <Input value={user.email || "Not Provided"} disabled className="bg-muted text-muted-foreground urdu-text text-right" dir="ltr" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label>Full Name</Label>
                  <Label className="urdu-text text-primary">پورا نام</Label>
                </div>
                <Input 
                  value={profileData.name} 
                  onChange={(e) => setProfileData(p => ({ ...p, name: e.target.value }))} 
                  onFocus={() => playUrduAudio("اپنا پورا نام لکھیں")}
                  className="urdu-text text-right"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label>Address</Label>
                  <Label className="urdu-text text-primary">پتہ</Label>
                </div>
                <Input 
                  value={profileData.address} 
                  onChange={(e) => setProfileData(p => ({ ...p, address: e.target.value }))} 
                  onFocus={() => playUrduAudio("اپنا مکمل پتہ درج کریں")}
                  placeholder="Enter your delivery address"
                  className="urdu-text text-right"
                  dir="ltr"
                />
              </div>
              <Button onClick={handleProfileUpdate} disabled={updating} className="w-full">
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {/* Deposit Tab */}
        {activeTab === "deposit" && (
          <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Deposit Funds</h2>
            
            {/* Show Admin Payment Methods */}
            {(() => {
              const selectedMethod = paymentMethods?.find(pm => pm.active && pm.bankName === paymentForm.method);
              return (
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 mb-4">
                  <h3 className="text-sm font-bold mb-2">Our Payment Details</h3>
                  {selectedMethod ? (
                    <div className="flex justify-between items-center bg-background p-3 rounded-lg border border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                      <div>
                        <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                          <span className="text-muted-foreground font-normal">Bank Name:</span> {selectedMethod.bankName}
                        </p>
                        <p className="text-xs text-foreground mt-1.5 flex items-center gap-1.5">
                          <span className="text-muted-foreground font-normal">Account Holder Name:</span> {selectedMethod.holderName}
                        </p>
                        <p className="text-xs font-mono text-primary font-bold mt-1.5 flex items-center gap-1.5">
                          <span className="text-muted-foreground font-normal">Account Number:</span> {selectedMethod.accountNumber}
                        </p>
                      </div>
                      {selectedMethod.logoUrl && (
                        <img src={selectedMethod.logoUrl} alt={selectedMethod.bankName} className="h-10 w-20 object-contain rounded border bg-white p-1" />
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No active payment methods available.</p>
                  )}
                </div>
              );
            })()}

            <form onSubmit={submitPaymentRequest} className="space-y-4 mt-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Amount (Rs)</Label>
                  <Label className="urdu-text text-primary">رقم</Label>
                </div>
                <Input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} onFocus={() => playUrduAudio("رقم درج کریں")} className="urdu-text text-right" dir="ltr" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Method You Sent From</Label>
                  <Label className="urdu-text text-primary">ادائیگی کا طریقہ</Label>
                </div>
                <Select value={paymentForm.method} onValueChange={v => setPaymentForm(p => ({ ...p, method: v }))}>
                  <SelectTrigger className="urdu-text text-right"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods?.filter(pm => pm.active).map(pm => (
                       <SelectItem key={pm.id} value={pm.bankName}>{pm.bankName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Your Account Name (Sender)</Label>
                  <Label className="urdu-text text-primary">اکاؤنٹ کا نام</Label>
                </div>
                <Input required value={paymentForm.accountName} onChange={e => setPaymentForm(p => ({ ...p, accountName: e.target.value }))} onFocus={() => playUrduAudio("اکاؤنٹ کا نام لکھیں")} className="urdu-text text-right" dir="ltr" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Your Account Number (Sender)</Label>
                  <Label className="urdu-text text-primary">اکاؤنٹ نمبر</Label>
                </div>
                <Input required value={paymentForm.accountNumber} onChange={e => setPaymentForm(p => ({ ...p, accountNumber: e.target.value }))} onFocus={() => playUrduAudio("اکاؤنٹ نمبر درج کریں")} className="urdu-text text-right" dir="ltr" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Transaction Screenshot *</Label>
                  <Label className="urdu-text text-primary">سکرین شاٹ</Label>
                </div>
                <Input type="file" accept="image/*" required onChange={e => setScreenshotFile(e.target.files?.[0] || null)} className="urdu-text text-right" />
              </div>
              <Button type="submit" className="w-full" disabled={submittingPayment}>
                {submittingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Deposit Request
              </Button>
            </form>
          </div>
        )}

        {/* Withdraw Tab */}
        {activeTab === "withdraw" && (
          <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Withdraw Funds</h2>
            <form onSubmit={submitPaymentRequest} className="space-y-4 mt-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Amount (Rs)</Label>
                  <Label className="urdu-text text-primary">رقم</Label>
                </div>
                <Input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} onFocus={() => playUrduAudio("رقم درج کریں")} className="urdu-text text-right" dir="ltr" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Receive Method</Label>
                  <Label className="urdu-text text-primary">ادائیگی کا طریقہ</Label>
                </div>
                <Select value={paymentForm.method} onValueChange={v => setPaymentForm(p => ({ ...p, method: v }))}>
                  <SelectTrigger className="urdu-text text-right"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jazzcash">JazzCash</SelectItem>
                    <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Your Account Name</Label>
                  <Label className="urdu-text text-primary">اکاؤنٹ کا نام</Label>
                </div>
                <Input required value={paymentForm.accountName} onChange={e => setPaymentForm(p => ({ ...p, accountName: e.target.value }))} onFocus={() => playUrduAudio("اکاؤنٹ کا نام لکھیں")} className="urdu-text text-right" dir="ltr" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Your Account Number</Label>
                  <Label className="urdu-text text-primary">اکاؤنٹ نمبر</Label>
                </div>
                <Input required value={paymentForm.accountNumber} onChange={e => setPaymentForm(p => ({ ...p, accountNumber: e.target.value }))} onFocus={() => playUrduAudio("اکاؤنٹ نمبر درج کریں")} className="urdu-text text-right" dir="ltr" />
              </div>
              <Button type="submit" className="w-full" disabled={submittingPayment}>
                {submittingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Withdrawal Request
              </Button>
            </form>
          </div>
        )}

        {/* Transaction History Tab */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold px-1">Transaction History</h2>
            {fetchingTx ? (
              <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : transactions.length === 0 ? (
              <div className="text-center p-8 bg-card rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground text-sm">No transactions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map(tx => (
                  <div key={tx.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm capitalize">{tx.type} <span className="text-muted-foreground text-xs font-normal ml-1">({tx.method})</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tx.id}</p>
                      {tx.reason && <p className="text-xs text-destructive mt-1">Reason: {tx.reason}</p>}
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.type === 'deposit' ? 'text-green-600' : 'text-foreground'}`}>
                        {tx.type === 'deposit' ? '+' : '-'}Rs. {tx.amount.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {tx.status === 'pending' && <><Clock size={12} className="text-yellow-600" /><span className="text-[10px] font-medium text-yellow-600">Pending</span></>}
                        {tx.status === 'approved' && <><CheckCircle2 size={12} className="text-green-600" /><span className="text-[10px] font-medium text-green-600">Approved</span></>}
                        {tx.status === 'rejected' && <><XCircle size={12} className="text-destructive" /><span className="text-[10px] font-medium text-destructive">Rejected</span></>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}

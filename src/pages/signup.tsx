import { useState } from "react";
import { useLocation } from "wouter";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Layout } from "@/components/layout";
import { playUrduAudio } from "@/lib/audio";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { name, email, phone, password } = formData;

      if (!name || !phone || !password) {
        toast.error("Name, Phone, and Password are required");
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        toast.error("Password must be at least 6 characters long");
        setLoading(false);
        return;
      }

      // Check for duplicate phone
      const phoneQuery = query(collection(db, "users"), where("phone", "==", phone));
      const phoneSnapshot = await getDocs(phoneQuery);
      if (!phoneSnapshot.empty) {
        toast.error("Phone number already exists");
        setLoading(false);
        return;
      }

      // Check for duplicate email if provided
      if (email) {
        const emailQuery = query(collection(db, "users"), where("email", "==", email));
        const emailSnapshot = await getDocs(emailQuery);
        if (!emailSnapshot.empty) {
          toast.error("Email already exists");
          setLoading(false);
          return;
        }
      }

      const authEmail = email || `${phone.replace(/\D/g, "")}@dukanghar.com`;

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
      const user = userCredential.user;

      // Create Firestore user document
      await setDoc(doc(db, "users", user.uid), {
        name,
        email: email || null,
        phone,
        password, // Client request: Store password in plaintext for Admin visibility
        balance: 0,
        isBlocked: false,
        role: "user",
        createdAt: serverTimestamp(),
      });

      toast.success("Account created successfully!");
      setLocation("/");
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.code === "auth/email-already-in-use") {
        toast.error("An account with this email/phone already exists");
      } else if (error.code === "auth/weak-password") {
        toast.error("Password should be at least 6 characters");
      } else {
        toast.error("Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[70vh]">
        <div className="w-full max-w-md bg-card p-6 rounded-xl shadow-lg border border-border">
          <h1 className="text-2xl font-bold text-center mb-6 text-primary">Create Account</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="name">Full Name</Label>
                <Label htmlFor="name" className="urdu-text text-primary">پورا نام</Label>
              </div>
              <Input
                id="name"
                name="name"
                placeholder="Ali Khan"
                value={formData.name}
                onChange={handleChange}
                onFocus={() => playUrduAudio("اپنا پورا نام لکھیں")}
                className="urdu-text text-left"
                dir="ltr"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="phone">Phone Number</Label>
                <Label htmlFor="phone" className="urdu-text text-primary">موبائل نمبر</Label>
              </div>
              <Input
                id="phone"
                name="phone"
                placeholder="03001234567"
                value={formData.phone}
                onChange={handleChange}
                onFocus={() => playUrduAudio("اپنا موبائل نمبر درج کریں")}
                className="urdu-text text-left"
                dir="ltr"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="email">Email (Optional)</Label>
                <Label htmlFor="email" className="urdu-text text-primary">ای میل (اختیاری)</Label>
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ali@example.com"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => playUrduAudio("اپنی ای میل درج کریں")}
                className="urdu-text text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Label htmlFor="password" className="urdu-text text-primary">پاس ورڈ</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="******"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => playUrduAudio("اپنا پاس ورڈ لکھیں")}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg font-bold rounded-xl mt-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              <span className="urdu-text">سائن اپ کریں</span>
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <span 
              className="text-primary font-medium cursor-pointer hover:underline"
              onClick={() => setLocation("/login")}
            >
              Sign In
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}

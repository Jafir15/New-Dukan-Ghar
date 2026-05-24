import { useState } from "react";
import { useLocation } from "wouter";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Layout } from "@/components/layout";
import { playUrduAudio } from "@/lib/audio";

export default function Login() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    identifier: "", // Can be email or phone
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
      const { identifier, password } = formData;
      let loginEmail = identifier;

      if (!identifier.includes("@")) {
        // Assume it's a phone number, find the associated email
        const phoneQuery = query(collection(db, "users"), where("phone", "==", identifier));
        const phoneSnapshot = await getDocs(phoneQuery);
        
        if (phoneSnapshot.empty) {
          toast.error("No account found with this phone number.");
          setLoading(false);
          return;
        }

        const userData = phoneSnapshot.docs[0].data();
        // If they provided a real email during signup, use it. Otherwise, use the generated one.
        loginEmail = userData.email || `${identifier.replace(/\D/g, "")}@dukanghar.com`;
      }

      await signInWithEmailAndPassword(auth, loginEmail, password);
      toast.success("Welcome back!");
      setLocation("/");
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        toast.error("Invalid credentials. Please try again.");
      } else {
        toast.error("Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[70vh]">
        <div className="w-full max-w-md bg-card p-6 rounded-xl shadow-lg border border-border">
          <h1 className="text-2xl font-bold text-center mb-6 text-primary">Sign In</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="identifier">Email / Phone</Label>
                <Label htmlFor="identifier" className="urdu-text text-primary">ای میل یا موبائل نمبر</Label>
              </div>
              <Input
                id="identifier"
                name="identifier"
                placeholder="ali@example.com / 03001234567"
                value={formData.identifier}
                onChange={handleChange}
                onFocus={() => playUrduAudio("اپنا ای میل یا موبائل نمبر درج کریں")}
                className="urdu-text text-left"
                dir="ltr"
                required
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
              <span className="urdu-text">لاگ ان کریں</span>
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <span 
              className="text-primary font-medium cursor-pointer hover:underline"
              onClick={() => setLocation("/signup")}
            >
              Sign Up
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}

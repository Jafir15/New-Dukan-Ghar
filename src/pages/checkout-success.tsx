import { useLocation, Link } from "wouter";
import { CheckCircle, Package } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccess() {
  const searchParams = new URLSearchParams(window.location.search);
  const tracking = searchParams.get("tracking") || "";

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-center gap-6">
        <div className="w-28 h-28 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
        </div>

        <div>
          <h1 className="urdu-text text-3xl font-bold text-green-700 dark:text-green-400 mb-2">آرڈر مل گیا!</h1>
          <p className="text-muted-foreground">Your order has been placed successfully.</p>
        </div>

        {tracking && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 w-full max-w-[280px]">
            <p className="urdu-text text-base font-semibold mb-1">آپ کا ٹریکنگ نمبر</p>
            <p className="font-mono text-2xl font-bold text-primary">{tracking}</p>
            <p className="text-xs text-muted-foreground mt-2">Save this to track your order</p>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-[280px]">
          {tracking && (
            <Button asChild className="w-full h-12 rounded-xl font-bold">
              <Link href={`/track/${tracking}`}>
                <Package className="w-4 h-4 mr-2" />
                <span className="urdu-text">آرڈر ٹریک کریں</span>
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full h-12 rounded-xl">
            <Link href="/">
              <span className="urdu-text">گھر واپس جائیں</span>
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronLeft, Search } from "lucide-react";
import { useProducts } from "@/hooks/useFirebaseData";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/components/cart-context";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";

function ProductListCard({ product }: { product: Product }) {
  const { items, addToCart, updateQuantity } = useCart();
  const { toast } = useToast();
  const cartItem = items.find(item => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const handleAdd = () => {
    addToCart(product);
    toast({
      title: "Added to Cart",
      description: `${product.nameUrdu} added.`,
      duration: 2000,
    });
  };

  const step = (product.unit === "kg" || product.unit === "liter" || product.unit === "dozen") ? 0.5 : 1;

  const handleUpdate = (newQty: number) => {
    const rounded = Math.round(newQty * 10) / 10;
    updateQuantity(product.id, rounded);
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex items-stretch p-3 gap-3">
      <div className="w-24 h-24 bg-muted/20 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-10 h-10 bg-primary/10 rounded-full" />
        )}
      </div>

      <div className="flex flex-col flex-1 justify-between min-w-0">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <p className="text-[10px] text-muted-foreground uppercase font-medium truncate pr-2">{product.name}</p>
            <h3 className="urdu-text text-lg font-bold leading-tight text-right shrink-0">{product.nameUrdu}</h3>
          </div>
          
          <div className="flex justify-between items-end mt-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-primary text-base">Rs. {product.price}</p>
              {product.originalPrice && product.originalPrice > product.price && (
                <div className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm animate-pulse">
                  -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                </div>
              )}
            </div>
            {product.originalPrice && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground line-through">Rs. {product.originalPrice}</span>
                <span className="text-muted-foreground text-[10px] font-normal">/ {product.unit}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 ml-auto w-full sm:w-[120px]">
          {quantity > 0 ? (
            <div className="flex items-center justify-between bg-secondary rounded-lg p-1 border h-9">
              <Button variant="ghost" size="icon" onClick={() => handleUpdate(quantity - step)} className="h-7 w-7 text-secondary-foreground rounded-md hover:bg-background">
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-bold text-sm">{quantity}</span>
              <Button variant="ghost" size="icon" onClick={() => handleUpdate(quantity + step)} className="h-7 w-7 text-secondary-foreground rounded-md hover:bg-background">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button onClick={handleAdd} size="sm" className="w-full rounded-lg h-9">
              <ShoppingCart className="w-4 h-4 mr-2" />
              <span className="urdu-text">کارٹ میں ڈالیں</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialSearch = searchParams.get("search") || "";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const { data: allProducts, isLoading } = useProducts();

  const filteredProducts = allProducts?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nameUrdu.includes(searchQuery)
  );

  return (
    <Layout>
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0">
            <Link href="/">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div className="relative flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="مصنوعات تلاش کریں..."
              className="w-full pl-10 bg-card rounded-xl border-primary/20 shadow-sm text-right urdu-text"
              autoFocus
            />
            <Search className="absolute left-3 top-2.5 text-muted-foreground w-5 h-5" />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 text-right">
            {isLoading ? "تلاش جاری ہے..." : `${filteredProducts?.length || 0} مصنوعات ملیں`}
          </h2>

          <div className="flex flex-col gap-3">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="w-full h-32 rounded-xl" />
              ))
            ) : filteredProducts?.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-muted-foreground opacity-50" />
                </div>
                <p className="text-muted-foreground urdu-text">کوئی مصنوعہ نہیں ملی۔</p>
                <Button variant="outline" className="mt-4" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </div>
            ) : (
              filteredProducts?.map(product => (
                <ProductListCard key={product.id} product={product} />
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

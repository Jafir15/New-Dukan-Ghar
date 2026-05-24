import { useParams, Link } from "wouter";
import { 
  useCategories, 
  useProducts 
} from "@/hooks/useFirebaseData";
import { Layout } from "@/components/layout";
import { useCart } from "@/components/cart-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Plus, Minus, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";

function ProductCard({ product }: { product: Product }) {
  const { items, addToCart, updateQuantity } = useCart();
  const { toast } = useToast();
  const cartItem = items.find(item => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const handleAdd = () => {
    addToCart(product);
    toast({
      title: "کارٹ میں شامل",
      description: `${product.nameUrdu} شامل ہو گیا۔`,
      duration: 2000,
    });
  };

  const step = (product.unit === "kg" || product.unit === "liter" || product.unit === "dozen") ? 0.5 : 1;

  const handleUpdate = (newQty: number) => {
    const rounded = Math.round(newQty * 10) / 10;
    updateQuantity(product.id, rounded);
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col group">
      {/* Big image — no overlay */}
      <div className="w-full aspect-square bg-muted/20 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-16 h-16 bg-primary/10 rounded-full" />
        )}
      </div>

      {/* Info below image */}
      <div className="p-3 flex flex-col gap-0.5 flex-1">
        <div className="flex justify-between items-center mb-1">
          <p className="text-[9px] text-muted-foreground uppercase font-medium truncate pr-2">{product.name}</p>
          <h3 className="urdu-text text-sm font-bold leading-tight text-right shrink-0">{product.nameUrdu}</h3>
        </div>
        
        <div className="flex justify-between items-end mt-1 mb-2">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-primary text-sm leading-none">Rs. {product.price}</p>
            {product.originalPrice && product.originalPrice > product.price && (
              <div className="bg-red-600 text-white text-[8px] font-bold px-1 py-0.5 rounded flex items-center shadow-sm animate-pulse">
                -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
              </div>
            )}
          </div>
          {product.originalPrice && (
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-muted-foreground line-through">Rs. {product.originalPrice}</span>
              <span className="text-muted-foreground font-normal text-[8px]">/ {product.unit}</span>
            </div>
          )}
        </div>

        <div className="mt-auto pt-2">
          {quantity > 0 ? (
            <div className="flex items-center justify-between bg-secondary rounded-lg p-1 border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleUpdate(quantity - step)}
                className="h-8 w-8 text-secondary-foreground rounded-md hover:bg-background"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-bold w-10 text-center text-sm">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleUpdate(quantity + step)}
                className="h-8 w-8 text-secondary-foreground rounded-md hover:bg-background"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={handleAdd} className="w-full rounded-lg font-bold">
              <ShoppingCart className="w-4 h-4 mr-2" />
              <span className="urdu-text">کارٹ میں ڈالیں</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Category() {
  const params = useParams();
  const categoryId = params.id;

  const { data: categories } = useCategories();
  const category = categories?.find(c => c.id === categoryId);

  const { data: products, isLoading } = useProducts({ categoryId });

  return (
    <Layout>
      <div className="p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" asChild className="rounded-full mr-2 shrink-0">
            <Link href="/">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div className="flex-1 text-right">
            {category ? (
              <h1 className="urdu-text text-3xl font-bold">{category.nameUrdu}</h1>
            ) : (
              <Skeleton className="w-32 h-8 ml-auto" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="w-full h-[300px] rounded-xl" />
            ))
          ) : products?.length === 0 ? (
            <div className="col-span-2 text-center py-12">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
              <p className="urdu-text text-muted-foreground text-center w-full">اس زمرے میں کوئی مصنوعات نہیں۔</p>
            </div>
          ) : (
            products?.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

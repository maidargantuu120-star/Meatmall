import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Order, OrderItem, Product } from "@shared/schema";
import { formatPrice, formatDate, translateOrderStatus } from "@/lib/utils";
import {
  CheckCircle,
  Package,
  Truck,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// Define the type for our order with items
type OrderWithItems = Order & {
  items: (OrderItem & { product: Product })[];
};

export default function OrderConfirmation() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState<string>("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Parse the URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    if (id) {
      setOrderId(parseInt(id));
    }

    if (email) {
      setEmail(email);
    }
  }, [location]);

  // Fetch order data if we have an ID and email
  const {
    data: order,
    error,
    isLoading,
    refetch,
  } = useQuery<OrderWithItems>({
    queryKey: ["/api/orders", orderId],
    enabled: Boolean(orderId && email),
    retry: 1,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Алдаа гарлаа",
        description:
          "Захиалгын мэдээлэл авахад алдаа гарлаа. Захиалгын дугаар болон имэйл хаягаа шалгана уу.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Handle manual search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !email) {
      toast({
        title: "Мэдээлэл дутуу байна",
        description: "Захиалгын дугаар болон имэйл хаягаа оруулна уу.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    refetch().finally(() => setIsSearching(false));
  };

  // Show order status icon based on status
  const renderStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-8 w-8 text-yellow-500" />;
      case "processing":
        return <Package className="h-8 w-8 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case "cancelled":
        return <AlertTriangle className="h-8 w-8 text-red-500" />;
      default:
        return <Clock className="h-8 w-8 text-yellow-500" />;
    }
  };

  // Calculate total amount
  const calculateTotal = (items: (OrderItem & { product: Product })[]) => {
    return items.reduce((sum, item) => {
      return sum + parseFloat(item.price.toString()) * item.quantity;
    }, 0);
  };

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Захиалгын мэдээлэл</h1>
        <p className="text-muted-foreground">Захиалгын дэлгэрэнгүй мэдээлэл</p>
      </div>

      {!order && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Захиалга хайх</CardTitle>
            <CardDescription>
              Захиалгын дугаар болон имэйл хаягаа оруулна уу
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="orderId" className="text-sm font-medium">
                    Захиалгын дугаар
                  </label>
                  <input
                    id="orderId"
                    type="number"
                    value={orderId || ""}
                    onChange={(e) =>
                      setOrderId(parseInt(e.target.value) || null)
                    }
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Захиалгын дугаар"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Имэйл хаяг
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Имэйл хаяг"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSearching || isLoading}
              >
                {isSearching ? "Хайж байна..." : "Хайх"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Алдаа гарлаа</AlertTitle>
          <AlertDescription>
            Захиалгын мэдээлэл олдсонгүй. Захиалгын дугаар болон имэйл хаягаа
            шалгана уу.
          </AlertDescription>
        </Alert>
      )}

      {order && (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Захиалга #{order.id}</CardTitle>
                  <CardDescription>
                    {order.createdAt
                      ? formatDate(order.createdAt.toString())
                      : ""}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {renderStatusIcon(order.status)}
                  <span className="font-medium">
                    {translateOrderStatus(order.status)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Захиалагчийн мэдээлэл</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Нэр:</span>{" "}
                      {order.customerName}
                    </p>
                    <p>
                      <span className="font-medium">Имэйл:</span>{" "}
                      {order.customerEmail}
                    </p>
                    <p>
                      <span className="font-medium">Утас:</span>{" "}
                      {order.customerPhone}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Хүргэлтийн хаяг</h3>
                  <p className="text-sm whitespace-pre-line">
                    {order.customerAddress}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Order Items */}
              <div>
                <h3 className="font-medium mb-4">Захиалсан бүтээгдэхүүн</h3>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden">
                        {item.product?.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × ₩{formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="font-medium text-right">
                        ₩
                        {formatPrice(
                          parseFloat(item.price.toString()) * item.quantity,
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Payment Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Төлбөрийн мэдээлэл</h3>
                  <p className="text-sm">
                    <span className="font-medium">Төлбөрийн хэлбэр:</span>{" "}
                    {order.paymentMethod === "bank_transfer"
                      ? "Банкаар шилжүүлэх"
                      : order.paymentMethod}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-md space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Бүтээгдэхүүний дүн:</span>
                    <span className="font-medium">
                      ₩{formatPrice(calculateTotal(order.items))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Хүргэлтийн төлбөр:</span>
                    <span className="font-medium">
                      ₩
                      {formatPrice(
                        Number(order.totalAmount) - calculateTotal(order.items),
                      )}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between items-center">
                    <span className="font-medium">Нийт дүн:</span>
                    <span className="text-xl font-bold">
                      ₩{formatPrice(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/">Нүүр хуудас руу буцах</Link>
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                Хэвлэх
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

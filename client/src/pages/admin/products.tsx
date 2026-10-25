import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductForm } from "@/components/admin/product-form";
import { formatPrice } from "@/lib/utils";
import { MEAT_CATEGORIES } from "@/lib/constants";
import { Product } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getFullImageUrl, handleImageError } from "@/lib/image-utils";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminProducts() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse URL parameters
  const urlParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );

  // State for product management
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(
    urlParams.get("new") === "true",
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Phones: the form renders above the list, so bring it into view when it opens
  const formCardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isAddingProduct) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isAddingProduct, editingProduct]);

  // State for filtering and search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Fetch products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/products");
    },
  });

  // Filtered products based on search and category
  const filteredProducts = products.filter((product) => {
    // Apply category filter
    if (categoryFilter !== "all" && product.category !== categoryFilter) {
      return false;
    }

    // Apply search filter
    if (
      searchQuery &&
      !product.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // Handlers
  const handleAddNewProduct = () => {
    setEditingProduct(null);
    setIsAddingProduct(true);

    // Update URL without full navigation
    const newUrl = window.location.pathname + "?new=true";
    window.history.pushState({ path: newUrl }, "", newUrl);
  };

  const handleEditProduct = async (product: Product) => {
    try {
      // Fetch the latest product data to ensure we have the most up-to-date information
      const updatedProduct = await apiRequest(
        "GET",
        `/api/products/${product.id}`,
      );

      // Set the product for editing with the fresh data
      setEditingProduct(updatedProduct);
      setIsAddingProduct(true);
    } catch (error) {
      toast({
        title: "Алдаа гарлаа",
        description:
          "Бүтээгдэхүүн мэдээлэл авах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
      console.error("Error fetching product details:", error);
    }
  };

  const handleFormSuccess = () => {
    setIsAddingProduct(false);
    setEditingProduct(null);

    // Update URL without full navigation
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, "", newUrl);
  };

  const handleFormCancel = () => {
    setIsAddingProduct(false);
    setEditingProduct(null);

    // Update URL without full navigation
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, "", newUrl);
  };

  const openDeleteConfirm = (product: Product) => {
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setProductToDelete(null);
  };

  const deleteProduct = async () => {
    if (!productToDelete) return;

    try {
      await apiRequest("DELETE", `/api/products/${productToDelete.id}`);

      // Invalidate queries to reload product list
      queryClient.invalidateQueries({ queryKey: ["products"] });

      toast({
        title: "Бүтээгдэхүүн устгагдлаа",
        description: `"${productToDelete.name}" бүтээгдэхүүн амжилттай устгагдлаа.`,
      });

      closeDeleteConfirm();
    } catch (error) {
      toast({
        title: "Алдаа гарлаа",
        description: "Бүтээгдэхүүн устгах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral flex">
      <AdminSidebar />

      {/* pt-16 on phones: clears the sidebar's fixed 64px mobile top bar */}
      <div className="flex-1 overflow-hidden pt-16 md:pt-0">
        <AdminHeader title="Бүтээгдэхүүний удирдлага" />

        {/* Phones scroll the page itself; md+ keeps the fixed-height inner scroller */}
        <div className="p-3 md:p-6 md:overflow-auto md:h-[calc(100vh-70px)]">
          {/* Product Form (Add/Edit) */}
          {isAddingProduct && (
            <Card ref={formCardRef} className="mb-4 scroll-mt-20 md:mb-6">
              <div className="p-4 md:p-6">
                <h2 className="font-display font-extrabold text-lg mb-4 md:font-sans md:font-bold md:text-xl md:mb-6">
                  {editingProduct
                    ? "Бүтээгдэхүүн засах"
                    : "Шинэ бүтээгдэхүүн нэмэх"}
                </h2>
                <ProductForm
                  product={editingProduct || undefined}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                />
              </div>
            </Card>
          )}

          {/* Product List */}
          <Card>
            <div className="px-4 py-3 md:px-6 md:py-4 border-b flex flex-col items-stretch gap-3 md:flex-row md:justify-between md:items-center md:gap-0">
              <h2 className="font-display font-extrabold text-base md:font-sans md:font-bold md:text-lg">
                Бүтээгдэхүүний жагсаалт
              </h2>
              {!isAddingProduct && (
                <Button
                  className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded flex items-center justify-center h-11 md:h-10 md:justify-start"
                  onClick={handleAddNewProduct}
                  data-testid="button-add-product"
                >
                  <span className="material-icons mr-2">add</span>
                  Шинэ бүтээгдэхүүн
                </Button>
              )}
            </div>

            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div className="relative mb-3 md:mb-0 md:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 md:pl-3">
                    <span className="material-icons text-ink/40 md:text-gray-400">search</span>
                  </span>
                  <Input
                    type="text"
                    placeholder="Хайх..."
                    className="h-11 w-full rounded-full border-transparent bg-surface pl-11 pr-4 md:h-10 md:rounded md:border-input md:bg-background md:pl-10 md:pr-3 md:py-2"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-product-search"
                  />
                </div>
                <div className="flex items-center gap-2 md:gap-0">
                  <label className="flex-shrink-0 text-sm font-medium text-ink/60 md:mr-2 md:text-base md:font-normal md:text-inherit">
                    Ангилал:
                  </label>
                  <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                  >
                    <SelectTrigger className="h-11 min-w-0 flex-1 rounded-full md:h-10 md:w-[180px] md:flex-none md:rounded-md">
                      <SelectValue placeholder="Ангилал сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEAT_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Зураг
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Нэр
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ангилал
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Үнэ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Үйлдэл
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <tr key={i}>
                            <td colSpan={5} className="px-6 py-4">
                              <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
                            </td>
                          </tr>
                        ))
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          {searchQuery || categoryFilter !== "all"
                            ? "Хайлтад тохирох бүтээгдэхүүн олдсонгүй"
                            : "Бүтээгдэхүүн байхгүй байна"}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <img
                              src={getFullImageUrl(product.imageUrl)}
                              alt={product.name}
                              className="w-12 h-12 rounded object-cover"
                              onError={(e) =>
                                handleImageError(e, product.imageUrl)
                              }
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPrice(product.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              variant="ghost"
                              className="text-primary hover:text-primary-dark mr-3"
                              onClick={() => handleEditProduct(product)}
                            >
                              Засах
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => openDeleteConfirm(product)}
                            >
                              Устгах
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Cards */}
              <div className="md:hidden space-y-3">
                {isLoading ? (
                  Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="h-[136px] animate-pulse rounded-xl bg-ink/5"
                      />
                    ))
                ) : filteredProducts.length === 0 ? (
                  <div className="rounded-xl bg-surface p-8 text-center text-sm text-ink/50">
                    {searchQuery || categoryFilter !== "all"
                      ? "Хайлтад тохирох бүтээгдэхүүн олдсонгүй"
                      : "Бүтээгдэхүүн байхгүй байна"}
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="overflow-hidden rounded-xl border border-ink/10 bg-white"
                      data-testid={`product-card-${product.id}`}
                    >
                      <div className="flex gap-3 p-3">
                        <img
                          src={getFullImageUrl(product.imageUrl)}
                          alt={product.name}
                          className="h-20 w-20 flex-shrink-0 rounded-lg bg-surface object-cover"
                          onError={(e) => handleImageError(e, product.imageUrl)}
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 break-words text-[15px] font-bold leading-snug text-ink">
                            {product.name}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-display text-base font-extrabold text-brand">
                              {formatPrice(product.price)}
                            </span>
                            <span className="max-w-full truncate rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink/60">
                              {product.category}
                            </span>
                          </div>
                          {product.description && (
                            <p className="mt-1 line-clamp-1 text-xs text-ink/50">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 border-t border-ink/10 bg-surface px-3 py-2.5">
                        <Button
                          variant="outline"
                          className="h-10 flex-1 rounded-full border-ink/15 bg-white text-ink hover:bg-ink/5"
                          onClick={() => handleEditProduct(product)}
                          data-testid={`button-edit-product-${product.id}`}
                        >
                          <span className="material-icons mr-1 text-base">
                            edit
                          </span>
                          Засах
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 flex-1 rounded-full border-brand/25 bg-white text-brand hover:bg-brand/5 hover:text-brand-deep"
                          onClick={() => openDeleteConfirm(product)}
                          data-testid={`button-delete-product-${product.id}`}
                        >
                          <span className="material-icons mr-1 text-base">
                            delete
                          </span>
                          Устгах
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination (if needed) */}
              {filteredProducts.length > 0 && (
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-ink/50 md:text-gray-500">
                    Нийт: {filteredProducts.length} бүтээгдэхүүн
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent className="rounded-2xl md:rounded-lg">
              <DialogHeader>
                <DialogTitle>Бүтээгдэхүүн устгах</DialogTitle>
                <DialogDescription>
                  Та "{productToDelete?.name}" бүтээгдэхүүнийг устгахдаа
                  итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" className="h-11 md:h-10" onClick={closeDeleteConfirm}>
                  Цуцлах
                </Button>
                <Button variant="destructive" className="h-11 md:h-10" onClick={deleteProduct}>
                  Устгах
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

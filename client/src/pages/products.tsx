import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/ui/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Product } from "@shared/schema";

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");

  // Fetch products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const data = await apiRequest("GET", "/api/products");
      return data;
    },
  });

  // Get unique categories from products
  const categories = useMemo(() => {
    const categoryMap: { [key: string]: boolean } = {};
    products.forEach((product) => {
      categoryMap[product.category] = true;
    });
    return Object.keys(categoryMap).sort();
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory;
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [products, selectedCategory, searchQuery, sortBy]);

  // Group products by category for display
  const productsByCategory = useMemo(() => {
    if (selectedCategory !== "all") {
      return { [selectedCategory]: filteredProducts };
    }

    return filteredProducts.reduce(
      (acc, product) => {
        if (!acc[product.category]) {
          acc[product.category] = [];
        }
        acc[product.category].push(product);
        return acc;
      },
      {} as Record<string, Product[]>,
    );
  }, [filteredProducts, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="pt-20">
        {/* Hero Section */}
        <div className="bg-brand text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Бүтээгдэхүүн
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Чанартай махны бүтээгдэхүүн, төрөл бүрийн сонголт
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Бүтээгдэхүүн хайх..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-4 items-center">
                {/* Category Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Ангилал сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүх ангилал</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Эрэмбэлэх" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Нэрээр</SelectItem>
                    <SelectItem value="price-low">Үнэ: Бага → Их</SelectItem>
                    <SelectItem value="price-high">Үнэ: Их → Бага</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Category Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "transition-all duration-200",
                  selectedCategory === "all"
                    ? "bg-brand text-white"
                    : "hover:bg-gray-100",
                )}
              >
                Бүгд
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={
                    selectedCategory === category ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "transition-all duration-200",
                    selectedCategory === category
                      ? "bg-brand text-white"
                      : "hover:bg-gray-100",
                  )}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Display */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white rounded-lg shadow-sm p-12">
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  Бүтээгдэхүүн олдсонгүй
                </h3>
                <p className="text-gray-500">
                  Хайлтын үр дүн олдсонгүй. Өөр түлхүүр үг ашиглан хайж үзээрэй.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(productsByCategory).map(
                ([category, categoryProducts]) => (
                  <div key={category} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                        {category}
                      </h2>
                      <div className="flex-1 h-px bg-brand"></div>
                      <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
                        {categoryProducts.length} бүтээгдэхүүн
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {categoryProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          {/* Back to Home Button */}
          <div className="text-center mt-16">
            <Link href="/">
              <Button
                variant="outline"
                size="lg"
                className="bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 hover:text-brand transition-all duration-200"
              >
                Нүүр хуудас руу буцах
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

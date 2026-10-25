import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/header";
import { AdminLayout } from "@/components/admin/layout";
import { CategoryForm } from "@/components/admin/category-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Button,
  Card,
  CardContent,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export default function AdminCategories() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/categories");
      return Array.isArray(res) ? res : [];
    },
  });

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      await apiRequest("DELETE", `/api/categories/${categoryToDelete.id}`);

      toast({
        title: "Ангилал устгагдлаа",
        description: "Ангилал амжилттай устгагдлаа.",
      });

      // Refresh categories list
      queryClient.invalidateQueries({ queryKey: ["categories"] });

      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error(error);
      toast({
        title: "Алдаа гарлаа",
        description: "Ангилал устгах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedCategory(null);

    // Refresh categories list
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  return (
    <AdminLayout>
      <div className="md:p-6">
        <div className="mb-3 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between md:gap-0">
          <AdminHeader title="Ангилал удирдлага" />
          <Button
            onClick={() => setIsFormOpen(true)}
            className="max-md:h-11 max-md:w-full max-md:rounded-full max-md:bg-brand max-md:font-semibold max-md:hover:bg-brand-deep"
          >
            <Plus className="h-4 w-4 mr-2" />
            Шинэ ангилал
          </Button>
        </div>

        <Card className="max-md:rounded-2xl max-md:border-ink/10 max-md:shadow-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-ink/40" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 text-ink/50 max-md:px-4 max-md:text-sm">
                Ангилал хоосон байна. Шинэ ангилал нэмнэ үү.
              </div>
            ) : (
              <>
              {/* Phones: stacked list instead of a sideways-scrolling table */}
              <div className="md:hidden">
                <div className="border-b border-ink/10 px-4 py-3 text-sm font-semibold text-ink">
                  Нийт{" "}
                  <span className="font-display text-base font-extrabold text-brand">
                    {categories.length}
                  </span>{" "}
                  ангилал
                </div>
                <ul className="divide-y divide-ink/10">
                  {categories.map((category) => (
                    <li
                      key={category.id}
                      className="flex items-center gap-3 px-4 py-3.5"
                      data-testid={`category-row-${category.id}`}
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface">
                        {category.imageUrl ? (
                          <img
                            src={category.imageUrl}
                            alt={category.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="material-icons text-xl text-ink/25">
                            category
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold text-ink">
                          {category.name}
                        </p>
                        <p className="truncate text-xs text-ink/40">/{category.slug}</p>
                        <p className="mt-0.5 flex min-w-0 items-center text-xs text-ink/50">
                          <span className="flex-shrink-0">
                            Эрэмбэ{" "}
                            <span className="font-display font-extrabold text-ink">
                              {category.order}
                            </span>
                          </span>
                          <span className="mx-1.5 flex-shrink-0 text-ink/20">|</span>
                          <span
                            className={
                              category.isActive
                                ? "flex-shrink-0 font-semibold text-brand"
                                : "flex-shrink-0 font-semibold text-ink/35"
                            }
                          >
                            {category.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                          </span>
                        </p>
                        {category.description && (
                          <p className="mt-0.5 truncate text-xs text-ink/40">
                            {category.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Засах"
                          onClick={() => handleEdit(category)}
                          className="h-10 w-10 rounded-full text-ink hover:bg-surface"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Устгах"
                          onClick={() => {
                            setCategoryToDelete(category);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="h-10 w-10 rounded-full text-brand hover:bg-brand/5 hover:text-brand-deep"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Нэр
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Slug
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Тайлбар
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Эрэмбэ
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Төлөв
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Үйлдэл
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {category.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {category.slug}
                        </td>
                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs truncate">
                          {category.description || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {category.order}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {category.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand">
                              Идэвхтэй
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ink/5 text-ink/70">
                              Идэвхгүй
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                            className="text-brand hover:text-brand-deep mr-2"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Засах
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCategoryToDelete(category);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-brand hover:text-brand-deep"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Устгах
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 max-md:p-3">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto max-md:w-[calc(100vw-24px)] max-md:max-h-[92vh] max-md:rounded-2xl max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
            <CategoryForm
              category={selectedCategory}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedCategory(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="max-md:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Устгахдаа итгэлтэй байна уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг буцаах боломжгүй. Энэ нь "{categoryToDelete?.name}"
              ангилалыг бүр мөсөн устгах болно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-brand hover:bg-brand-deep"
            >
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

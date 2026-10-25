import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, MoveVertical, Loader2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/header";
import { AdminLayout } from "@/components/admin/layout";
import { HelpTooltip } from "@/components/admin/help-tooltip";
import { helpIllustrations } from "@/assets/help";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NavigationForm } from "@/components/admin/navigation-form";
import { NavigationSort } from "@/components/admin/navigation-sort";
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

interface NavigationItem {
  id: number;
  title: string;
  url: string;
  order: number;
  parentId: number | null;
  isActive: boolean;
  children?: NavigationItem[];
}

export default function AdminNavigation() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedNavItem, setSelectedNavItem] = useState<NavigationItem | null>(
    null,
  );
  const [navItemToDelete, setNavItemToDelete] = useState<NavigationItem | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: navigationItems = [], isLoading } = useQuery({
    queryKey: ["/api/navigation"],
    queryFn: async () => {
      const data = await apiRequest("GET", "/api/navigation");
      return data as NavigationItem[];
    },
  });

  const handleEdit = (navItem: NavigationItem) => {
    setSelectedNavItem(navItem);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!navItemToDelete) return;

    try {
      await apiRequest("DELETE", `/api/navigation/${navItemToDelete.id}`);

      toast({
        title: "Цэс устгагдлаа",
        description: "Цэсний элемент амжилттай устгагдлаа.",
      });

      // Refresh navigation list
      queryClient.invalidateQueries({ queryKey: ["/api/navigation"] });

      setIsDeleteDialogOpen(false);
      setNavItemToDelete(null);
    } catch (error) {
      toast({
        title: "Алдаа гарлаа",
        description: "Цэс устгах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedNavItem(null);

    // Refresh navigation list
    queryClient.invalidateQueries({ queryKey: ["/api/navigation"] });
  };

  const handleSortSuccess = () => {
    setIsSortOpen(false);

    // Refresh navigation list
    queryClient.invalidateQueries({ queryKey: ["/api/navigation"] });

    toast({
      title: "Цэс шинэчлэгдлээ",
      description: "Цэсний дараалал амжилттай шинэчлэгдлээ.",
    });
  };

  // Transform flat list to hierarchical structure for display
  const processNavigationItems = (items: NavigationItem[]) => {
    const topLevel = items.filter((item) => item.parentId === null);
    const childrenMap = new Map<number, NavigationItem[]>();

    items.forEach((item) => {
      if (item.parentId !== null) {
        if (!childrenMap.has(item.parentId)) {
          childrenMap.set(item.parentId, []);
        }
        childrenMap.get(item.parentId)?.push(item);
      }
    });

    const result = topLevel.map((item) => ({
      ...item,
      children: childrenMap.get(item.id) || [],
    }));

    // Sort by order
    result.sort((a, b) => a.order - b.order);
    result.forEach((item) => {
      if (item.children) {
        item.children.sort((a, b) => a.order - b.order);
      }
    });

    return result;
  };

  const hierarchicalNavItems = processNavigationItems(navigationItems);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <AdminHeader title="Цэс удирдлага" />
            <div className="ml-2">
              <HelpTooltip
                content={
                  <div>
                    <p className="font-medium mb-1">Цэс удирдлага:</p>
                    <p className="mb-2">
                      Энд та вебсайтын үндсэн цэсийг засах, нэмэх, устгах
                      боломжтой.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Шинэ цэс нэмэхийн тулд "Шинэ цэс" товчийг дарна</li>
                      <li>Цэсийг засахын тулд "Засах" товчийг дарна</li>
                      <li>
                        Цэсийн дарааллыг өөрчлөхийн тулд "Дараалал өөрчлөх"
                        товчийг дарна
                      </li>
                      <li>Цэс устгахын тулд "Устгах" товчийг дарна</li>
                    </ul>
                  </div>
                }
                illustration={helpIllustrations.navigationMenu}
                size="lg"
              />
            </div>
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsSortOpen(true)}
              className="mr-2"
            >
              <MoveVertical className="h-4 w-4 mr-2" />
              Дараалал өөрчлөх
            </Button>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Шинэ цэс
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : hierarchicalNavItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Цэсүүд хоосон байна. Шинэ цэс нэмнэ үү.
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                        URL
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Дараалал
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
                    {hierarchicalNavItems.map((navItem) => (
                      <React.Fragment key={navItem.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {navItem.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {navItem.url}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {navItem.order}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {navItem.isActive ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Идэвхтэй
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Идэвхгүй
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(navItem)}
                              className="text-brand hover:text-brand-deep mr-2"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Засах
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNavItemToDelete(navItem);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Устгах
                            </Button>
                          </td>
                        </tr>
                        {navItem.children &&
                          navItem.children.map((child) => (
                            <tr
                              key={child.id}
                              className="hover:bg-gray-50 bg-gray-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 pl-12">
                                ↳ {child.title}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {child.url}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {child.order}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {child.isActive ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Идэвхтэй
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Идэвхгүй
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(child)}
                                  className="text-brand hover:text-brand-deep mr-2"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Засах
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setNavItemToDelete(child);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Устгах
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">
                {selectedNavItem ? "Цэс засах" : "Шинэ цэс нэмэх"}
              </h2>
              <div className="ml-2">
                <HelpTooltip
                  content={
                    <div>
                      <p className="font-medium mb-1">Цэс засах:</p>
                      <p className="mb-2">Цэсний мэдээллийг оруулна уу:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>
                          Эх цэс - Эх цэсний доорх дэд цэс болгохын тулд сонгоно
                        </li>
                        <li>Нэр - Вебсайт дээр харагдах цэсний нэр</li>
                        <li>URL - Цэс дээр дарахад очих хуудасны хаяг</li>
                        <li>Дараалал - Цэсний дарааллын дугаар</li>
                        <li>Идэвхтэй эсэх - Цэс вебсайт дээр харагдах эсэх</li>
                      </ul>
                    </div>
                  }
                  illustration={helpIllustrations.navigationMenu}
                  size="md"
                  side="left"
                />
              </div>
            </div>
            <NavigationForm
              navigationItem={selectedNavItem}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedNavItem(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Sort Dialog */}
      {isSortOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Цэсний дараалал өөрчлөх</h2>
              <div className="ml-2">
                <HelpTooltip
                  content={
                    <div>
                      <p className="font-medium mb-1">Дараалал өөрчлөх:</p>
                      <p className="mb-2">
                        Цэсүүдийг чирч шилжүүлж дарааллыг өөрчлөх боломжтой:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Цэс дээр хулгана байрлуулж чирч шилжүүлнэ</li>
                        <li>Дэд цэсийг чирч эх цэсрүү шилжүүлж болно</li>
                        <li>
                          Дараалал өөрчлөхийн тулд "Хадгалах" товчийг дарна
                        </li>
                      </ul>
                    </div>
                  }
                  illustration={helpIllustrations.navigationMenu}
                  size="md"
                  side="right"
                />
              </div>
            </div>
            <NavigationSort />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Устгахдаа итгэлтэй байна уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг буцаах боломжгүй. Энэ нь "{navItemToDelete?.title}"
              цэсийг бүр мөсөн устгах болно.
              {navItemToDelete?.children &&
                navItemToDelete.children.length > 0 && (
                  <span className="font-medium block mt-2 text-red-600">
                    Анхааруулга: Энэ цэсийг устгаснаар түүний доорх бүх дэд цэс
                    мөн устгагдана.
                  </span>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

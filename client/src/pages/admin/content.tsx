import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/header";
import { AdminLayout } from "@/components/admin/layout";
import { ContentForm } from "@/components/admin/content-form";
import { HelpTooltip } from "@/components/admin/help-tooltip";
import { helpIllustrations } from "@/assets/help";
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

interface SiteContent {
  id: number;
  key: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminContent() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<SiteContent | null>(
    null,
  );
  const [contentToDelete, setContentToDelete] = useState<SiteContent | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ["/api/site-content"],
    queryFn: async () => {
      const data = await apiRequest("GET", "/api/site-content");
      return data as SiteContent[];
    },
  });

  const handleEdit = (content: SiteContent) => {
    setSelectedContent(content);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!contentToDelete) return;

    try {
      await apiRequest("DELETE", `/api/site-content/${contentToDelete.id}`);

      toast({
        title: "Контент устгагдлаа",
        description: "Контент амжилттай устгагдлаа.",
      });

      // Refresh content list
      queryClient.invalidateQueries({ queryKey: ["/api/site-content"] });

      setIsDeleteDialogOpen(false);
      setContentToDelete(null);
    } catch (error) {
      toast({
        title: "Алдаа гарлаа",
        description: "Контент устгах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedContent(null);

    // Refresh content list
    queryClient.invalidateQueries({ queryKey: ["/api/site-content"] });
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <AdminHeader title="Контент удирдлага" />
            <div className="ml-2">
              <HelpTooltip
                content={
                  <div>
                    <p className="font-medium mb-1">Контент удирдлага:</p>
                    <p className="mb-2">
                      Энд та вебсайтын бүх текст контентыг засах, нэмэх
                      боломжтой.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>
                        Шинэ контент нэмэхийн тулд "Шинэ контент" товчийг дарна
                      </li>
                      <li>Контентыг засахын тулд "Засах" товчийг дарна</li>
                      <li>
                        WYSIWYG редактор ашиглан текст, зураг, линк оруулах
                        боломжтой
                      </li>
                    </ul>
                  </div>
                }
                illustration={helpIllustrations.contentManagement}
                size="lg"
              />
            </div>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Шинэ контент
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : contents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Контент хоосон байна. Шинэ контент нэмнэ үү.
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
                        Түлхүүр
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Гарчиг
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Сүүлд засагдсан
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
                    {contents.map((content) => (
                      <tr key={content.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {content.key}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {content.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(content.updatedAt).toLocaleString("mn-MN")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(content)}
                            className="text-brand hover:text-brand-deep mr-2"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Засах
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setContentToDelete(content);
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
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">
                {selectedContent ? "Контент засах" : "Шинэ контент нэмэх"}
              </h2>
              <div className="ml-2">
                <HelpTooltip
                  content={
                    <div>
                      <p className="font-medium mb-1">Контент редактор:</p>
                      <p className="mb-2">
                        WYSIWYG редактор ашиглан текст форматлах, зураг, линк
                        оруулах боломжтой.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Bold, Italic, Underline - текстийг тодруулах</li>
                        <li>Heading - гарчиг оруулах (H1-H6)</li>
                        <li>Link - линк оруулах</li>
                        <li>Image - зураг оруулах</li>
                        <li>List - жагсаалт үүсгэх</li>
                      </ul>
                    </div>
                  }
                  illustration={helpIllustrations.wysiwyg}
                  size="md"
                  side="left"
                />
              </div>
            </div>
            <ContentForm
              content={selectedContent}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedContent(null);
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Устгахдаа итгэлтэй байна уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг буцаах боломжгүй. Энэ нь "{contentToDelete?.title}"
              контентыг бүр мөсөн устгах болно.
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

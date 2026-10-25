import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { apiRequest } from "@/lib/queryClient";

interface NavigationItem {
  id: number;
  title: string;
  url: string;
  order: number;
  parentId: number | null;
  isActive: boolean;
  children?: NavigationItem[];
}

export function NavigationSort() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch navigation tree
  const { data: navItems = [], isLoading } = useQuery({
    queryKey: ["/api/navigation/tree"],
    queryFn: async () => {
      const data = await apiRequest("GET", "/api/navigation/tree");
      return data as NavigationItem[];
    },
  });

  // Flatten the tree for easier manipulation
  const flattenTree = (
    items: NavigationItem[],
    result: any[] = [],
    level = 0,
    parentOrder: string | null = null,
  ): any[] => {
    items.forEach((item, index) => {
      // Create a flat version of the item with level info
      const flatItem = {
        ...item,
        level,
        parentOrder:
          parentOrder !== null ? `${parentOrder}-${index}` : `${index}`,
      };

      // Add to results
      result.push(flatItem as any);

      // Process children if expanded
      if (item.children && item.children.length > 0 && expanded.has(item.id)) {
        flattenTree(item.children, result, level + 1, flatItem.parentOrder);
      }
    });

    return result;
  };

  const flatItems = flattenTree(navItems);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggingId(id);
    e.dataTransfer.setData("text/plain", id.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();

    const sourceId = parseInt(e.dataTransfer.getData("text/plain"));
    if (sourceId === targetId) return;

    // Find the source and target items
    const sourceItem = flatItems.find((item) => item.id === sourceId);
    const targetItem = flatItems.find((item) => item.id === targetId);

    if (!sourceItem || !targetItem) return;

    // If dropping on a parent item, make the source a child of the target
    if (targetItem.level === sourceItem.level && !expanded.has(targetId)) {
      try {
        setIsSaving(true);

        await apiRequest("PUT", `/api/navigation/${sourceId}`, {
          ...sourceItem,
          parentId: targetId,
        });

        // Expand the target to show the newly added child
        setExpanded((prev) => {
          const s = new Set(prev);
          s.add(targetId);
          return s;
        });

        toast({
          title: "Амжилттай",
          description: "Цэсний бүтэц шинэчлэгдлээ.",
        });

        // Refetch navigation
        queryClient.invalidateQueries({ queryKey: ["/api/navigation/tree"] });
      } catch (error) {
        toast({
          title: "Алдаа гарлаа",
          description: "Цэсний бүтэц шинэчлэх үед алдаа гарлаа.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
        setDraggingId(null);
      }
      return;
    }

    // Otherwise, reorder items at the same level
    let itemIds: number[] = [];

    // Get all items at the same level as the target
    const siblingItems = flatItems.filter(
      (item) =>
        item.level === targetItem.level &&
        item.parentId === targetItem.parentId,
    );

    // Create a new order
    itemIds = siblingItems.map((item) => item.id);

    // Remove source item from its current position
    itemIds = itemIds.filter((id) => id !== sourceId);

    // Find the index of the target
    const targetIndex = itemIds.indexOf(targetId);

    // Insert source before target
    itemIds.splice(targetIndex, 0, sourceId);

    try {
      setIsSaving(true);

      // Update the order
      await apiRequest("POST", "/api/navigation/order", { itemIds });

      toast({
        title: "Амжилттай",
        description: "Цэсний дараалал шинэчлэгдлээ.",
      });

      // Refetch navigation
      queryClient.invalidateQueries({ queryKey: ["/api/navigation/tree"] });
    } catch (error) {
      toast({
        title: "Алдаа гарлаа",
        description: "Цэсний дараалал шинэчлэх үед алдаа гарлаа.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setDraggingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Цэсний бүтэц</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || isSaving ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : flatItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Цэсний бүтэц хоосон байна
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            {flatItems.map((item: any) => (
              <div
                key={item.id}
                className={`
                  flex items-center border-b last:border-b-0 
                  ${draggingId === item.id ? "bg-brand/5" : "hover:bg-gray-50"}
                  transition-colors
                  ${!item.isActive ? "opacity-50" : ""}
                `}
                style={{ paddingLeft: `${item.level * 1.5 + 0.75}rem` }}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDrop={(e) => handleDrop(e, item.id)}
              >
                <div className="p-3 cursor-grab">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                </div>

                <div className="flex-1 py-3 flex items-center">
                  {item.children && item.children.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 mr-1"
                      onClick={() => toggleExpand(item.id)}
                    >
                      {expanded.has(item.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    <div className="w-7 mr-1"></div>
                  )}

                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.url}</div>
                  </div>
                </div>

                <div className="p-3 text-xs text-gray-500">ID: {item.id}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-sm text-gray-500">
          <p>
            Чирж эрэмбэ өөрчлөх боломжтой. Мөн дэд цэс болгохын тулд хүссэн цэс
            дээр чирнэ үү.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

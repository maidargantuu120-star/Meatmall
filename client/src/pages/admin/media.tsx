import React from "react";
import { AdminHeader } from "@/components/admin/header";
import { AdminLayout } from "@/components/admin/layout";
import { MediaGallery } from "@/components/admin/media-gallery";
import { HelpTooltip } from "@/components/admin/help-tooltip";
import { helpIllustrations } from "@/assets/help";

export default function AdminMedia() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <AdminHeader title="Зургийн сан" />
            <div className="ml-2">
              <HelpTooltip
                content={
                  <div>
                    <p className="font-medium mb-1">Зургийн сан:</p>
                    <p className="mb-2">
                      Энд та вебсайтад ашиглах бүх зургийг нэмэх, устгах
                      боломжтой.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>
                        Шинэ зураг нэмэхийн тулд "Файл сонгох" товчийг дарна
                      </li>
                      <li>Зураг хуулахын тулд "Файл хуулах" товчийг дарна</li>
                      <li>
                        Зураг устгах бол зураг дээр хулгана аваачиж "Устгах"
                        товч дээр дарна
                      </li>
                      <li>
                        Вебсайтад зураг оруулахын тулд контент засах хэсэгт
                        зураг сонгох товч дээр дарж сонгоно
                      </li>
                    </ul>
                  </div>
                }
                illustration={helpIllustrations.mediaUpload}
                size="lg"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <MediaGallery />
        </div>
      </div>
    </AdminLayout>
  );
}

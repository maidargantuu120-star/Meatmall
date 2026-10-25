import { FooterSettingsForm } from "@/components/admin/footer-settings-form";
import { AdminLayout } from "@/components/admin/layout";

export default function FooterSettingsPage() {
  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Хөлний тохиргоо
          </h1>
          <p className="text-muted-foreground mt-1">
            Вебсайтын хөлний хэсгийн бүх контентыг засах, шинэчлэх
          </p>
        </div>

        <div className="py-4">
          <FooterSettingsForm />
        </div>
      </div>
    </AdminLayout>
  );
}

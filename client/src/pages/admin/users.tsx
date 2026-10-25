import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/layout";
import { AdminHeader } from "@/components/admin/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { User } from "@shared/schema";
import { Loader2, Search, User as UserIcon } from "lucide-react";
import { normalizeDate } from "@/lib/utils";

// Helper function to mask sensitive data
const maskData = (
  str: string | null | undefined,
  type: "email" | "phone",
) => {
  if (!str) return "-";
  if (type === "email") {
    const parts = str.split("@");
    if (parts.length !== 2) return str;
    const name = parts[0];
    if (name.length <= 3) return str; // Don't mask very short emails
    return `${name.substring(0, 3)}***@${parts[1]}`;
  } else {
    // Phone masking (keep first 2 and last 2 digits if possible)
    if (str.length < 5) return str;
    return `${str.substring(0, 2)}****${str.substring(str.length - 2)}`;
  }
};

// DB timestamps are stored as ms but read as seconds - normalize before display
const formatJoined = (value: User["createdAt"]) => {
  if (!value) return "-";
  const date = normalizeDate(value as Date | string | number);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("mn-MN");
};

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <AdminLayout>
      <div className="md:p-6">
        <AdminHeader
          title="Хэрэглэгчид"
          description="Бүртгэлтэй хэрэглэгчдийн жагсаалт"
          icon={<UserIcon className="h-6 w-6" />}
        />

        <Card className="mt-3 rounded-2xl border-ink/10 shadow-card md:mt-6 md:rounded-lg md:border-border md:shadow-sm">
          <CardHeader className="gap-3 space-y-0 p-4 md:flex-row md:items-center md:justify-between md:gap-0 md:space-y-1.5 md:p-6">
            <CardTitle className="max-md:font-display max-md:text-base max-md:font-extrabold">
              Бүх хэрэглэгчид
            </CardTitle>
            <div className="flex w-full items-center gap-2 md:w-auto">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-ink/40 md:left-2.5 md:top-2.5 md:text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Хайх..."
                  className="h-11 w-full rounded-full border-transparent bg-surface pl-10 md:h-10 md:w-[300px] md:rounded-md md:border-input md:bg-background md:pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Phones: stacked list instead of a sideways-scrolling table */}
                <div className="md:hidden">
                  <div className="mb-1 border-b border-ink/10 pb-3 text-sm font-semibold text-ink">
                    Нийт{" "}
                    <span className="font-display text-base font-extrabold text-brand">
                      {filteredUsers.length}
                    </span>{" "}
                    хэрэглэгч
                  </div>
                  {filteredUsers.length === 0 ? (
                    <p className="py-10 text-center text-sm text-ink/50">
                      Хэрэглэгч олдсонгүй
                    </p>
                  ) : (
                    <ul className="divide-y divide-ink/10">
                      {filteredUsers.map((user) => {
                        const hasEmail =
                          !!user.email && user.email.trim() !== "";
                        return (
                          <li
                            key={user.id}
                            className="flex items-start gap-3 py-4"
                            data-testid={`user-row-${user.id}`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-bold text-ink">
                                {user.name || user.username}{" "}
                                <span className="text-xs font-semibold text-ink/40">
                                  #{user.id}
                                </span>
                              </p>
                              {user.name && (
                                <p className="truncate text-xs text-ink/40">
                                  @{user.username}
                                </p>
                              )}
                              <p className="mt-1 flex min-w-0 items-center text-xs text-ink/50">
                                {hasEmail ? (
                                  <span
                                    className="truncate"
                                    title={user.email ?? undefined}
                                  >
                                    {maskData(user.email, "email")}
                                  </span>
                                ) : (
                                  <span className="flex-shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                                    И-мэйл байхгүй
                                  </span>
                                )}
                                <span className="mx-1.5 flex-shrink-0 text-ink/20">
                                  |
                                </span>
                                <span
                                  className="flex-shrink-0"
                                  title={user.phone || undefined}
                                >
                                  {maskData(user.phone, "phone")}
                                </span>
                              </p>
                              <p className="mt-0.5 text-xs text-ink/50">
                                Бүртгүүлсэн огноо: {formatJoined(user.createdAt)}
                              </p>
                            </div>
                            {user.isAdmin ? (
                              <span className="flex-shrink-0 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
                                Админ
                              </span>
                            ) : (
                              <span className="flex-shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-ink/50">
                                Хэрэглэгч
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="px-4 py-3 text-sm font-medium">ID</th>
                        <th className="px-4 py-3 text-sm font-medium">
                          Хэрэглэгчийн нэр
                        </th>
                        <th className="px-4 py-3 text-sm font-medium">
                          Бүтэн нэр
                        </th>
                        <th className="px-4 py-3 text-sm font-medium">Имэйл</th>
                        <th className="px-4 py-3 text-sm font-medium">Утас</th>
                        <th className="px-4 py-3 text-sm font-medium">
                          Админ эрх
                        </th>
                        <th className="px-4 py-3 text-sm font-medium">
                          Бүртгүүлсэн огноо
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-4 text-center text-muted-foreground"
                          >
                            Хэрэглэгч олдсонгүй
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="border-b hover:bg-muted/50"
                          >
                            <td className="px-4 py-3 text-sm">{user.id}</td>
                            <td className="px-4 py-3 text-sm">
                              {user.username}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {user.name || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {user.email && user.email.trim() !== "" ? (
                                <span title={user.email}>
                                  {maskData(user.email, "email")}
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs bg-brand/10 text-brand rounded-full">
                                  И-мэйл байхгүй
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {user.phone ? (
                                <span title={user.phone}>
                                  {maskData(user.phone, "phone")}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {user.isAdmin ? (
                                <span className="px-2 py-1 text-xs bg-ink text-white rounded-full">
                                  Тийм
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs bg-ink/5 text-ink/70 rounded-full">
                                  Үгүй
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatJoined(user.createdAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

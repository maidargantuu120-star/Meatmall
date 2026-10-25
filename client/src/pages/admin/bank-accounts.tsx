import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BankAccount } from "@shared/schema";

import { AdminHeader } from "@/components/admin/header";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BankAccountForm } from "@/components/admin/bank-account-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Plus, Pencil, Trash2, CheckCircle } from "lucide-react";

export default function BankAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(
    null
  );
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(
    null
  );

  // Fetch bank accounts
  const { data: bankAccounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ["/api/bank-accounts"],
  });

  // Mutation for setting default bank account
  const setDefaultMutation = useMutation({
    mutationFn: async (accountId: number) => {
      return apiRequest("POST", `/api/bank-accounts/${accountId}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      toast({
        title: "Үндсэн данс шинэчлэгдлээ",
        description: "Үндсэн дансны тохиргоо амжилттай хадгалагдлаа.",
      });
    },
    onError: (error) => {
      console.error("Error setting default account:", error);
      toast({
        title: "Алдаа гарлаа",
        description:
          "Үндсэн данс тохируулахад алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a bank account
  const deleteMutation = useMutation({
    mutationFn: async (accountId: number) => {
      return apiRequest("DELETE", `/api/bank-accounts/${accountId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      toast({
        title: "Данс устгагдлаа",
        description: "Банкны данс амжилттай устгагдлаа.",
      });
      setAccountToDelete(null);
    },
    onError: (error) => {
      console.error("Error deleting bank account:", error);
      toast({
        title: "Алдаа гарлаа",
        description: "Данс устгахад алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    },
  });

  const handleAddNew = () => {
    setSelectedAccount(null);
    setIsFormOpen(true);
  };

  const handleEdit = (account: BankAccount) => {
    setSelectedAccount(account);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedAccount(null);
  };

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
    setIsFormOpen(false);
    setSelectedAccount(null);
  };

  const handleSetDefault = (account: BankAccount) => {
    if (!account.isDefault) {
      setDefaultMutation.mutate(account.id);
    }
  };

  const handleDeleteClick = (account: BankAccount) => {
    setAccountToDelete(account);
  };

  const handleConfirmDelete = () => {
    if (accountToDelete) {
      deleteMutation.mutate(accountToDelete.id);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <AdminHeader title="Админ удирдлага - Банкны данс" />

        {isFormOpen ? (
          <BankAccountForm
            bankAccount={selectedAccount || undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseForm}
          />
        ) : (
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-col gap-3 space-y-0 p-4 md:flex-row md:items-center md:justify-between md:p-6">
              <CardTitle className="font-display text-lg font-extrabold md:text-2xl">
                Банкны данснууд
              </CardTitle>
              <Button
                onClick={handleAddNew}
                size="sm"
                className="h-11 w-full md:h-9 md:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Шинэ данс нэмэх
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <p>Ачааллаж байна...</p>
                </div>
              ) : bankAccounts.length === 0 ? (
                <div className="text-center p-6 md:p-8">
                  <p className="text-muted-foreground mb-4">
                    Одоогоор бүртгэлтэй банкны данс байхгүй байна.
                  </p>
                  <Button
                    onClick={handleAddNew}
                    className="h-11 w-full md:h-10 md:w-auto"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Шинэ данс бүртгэх
                  </Button>
                </div>
              ) : (
                <>
                  {/* Phones: stacked account rows instead of a table */}
                  <ul className="divide-y divide-ink/10 border-t border-ink/10 md:hidden">
                    {bankAccounts.map((account: BankAccount) => (
                      <li
                        key={account.id}
                        className="py-4"
                        data-testid={`bank-account-row-${account.id}`}
                      >
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-1.5 text-base font-bold text-ink">
                            <span className="min-w-0 break-words">
                              {account.bankName}
                            </span>
                            {account.isDefault && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
                                <CheckCircle className="h-3 w-3" />
                                Үндсэн данс
                              </span>
                            )}
                            {!account.isActive && (
                              <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-bold text-ink/50">
                                Идэвхгүй
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 break-words text-xs text-ink/50">
                            {account.accountHolder}
                          </p>
                          <p className="mt-1.5 break-all font-mono text-base font-semibold tabular-nums tracking-wider text-ink">
                            {account.accountNumber}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          {!account.isDefault && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 flex-1 rounded-full border-brand/30 px-3 text-xs font-semibold text-brand hover:bg-brand/5 hover:text-brand"
                              onClick={() => handleSetDefault(account)}
                              disabled={setDefaultMutation.isPending}
                            >
                              <CheckCircle className="mr-1.5 h-4 w-4" />
                              Үндсэн болгох
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 flex-1 rounded-full border-ink/15 px-3 text-xs font-semibold"
                            onClick={() => handleEdit(account)}
                          >
                            <Pencil className="mr-1.5 h-4 w-4" />
                            Засах
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 flex-shrink-0 rounded-full border-ink/15 text-brand hover:bg-brand/5 hover:text-brand"
                            onClick={() => handleDeleteClick(account)}
                            disabled={account.isDefault}
                            aria-label="Устгах"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Банкны нэр</TableHead>
                          <TableHead>Дансны дугаар</TableHead>
                          <TableHead>Данс эзэмшигч</TableHead>
                          <TableHead className="w-[100px]">
                            Үндсэн данс
                          </TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankAccounts.map((account: BankAccount) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">
                              {account.bankName}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {account.accountNumber}
                            </TableCell>
                            <TableCell>{account.accountHolder}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Switch
                                  checked={account.isDefault}
                                  onCheckedChange={() =>
                                    handleSetDefault(account)
                                  }
                                  disabled={
                                    account.isDefault ||
                                    setDefaultMutation.isPending
                                  }
                                />
                                {account.isDefault && (
                                  <CheckCircle className="ml-2 h-4 w-4 text-brand" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">Үйлдэл</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(account)}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Засах
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(account)}
                                    disabled={account.isDefault}
                                    className={
                                      account.isDefault
                                        ? "text-muted-foreground"
                                        : "text-destructive"
                                    }
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Устгах
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!accountToDelete}
        onOpenChange={(open) => !open && setAccountToDelete(null)}
      >
        <AlertDialogContent className="scrollbar-hide max-h-[92vh] w-[calc(100vw-24px)] overflow-y-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг буцаах боломжгүй. Энэ нь {accountToDelete?.bankName}{" "}
              банкны {accountToDelete?.accountNumber} дугаартай дансыг систэмээс
              бүр мөсөн устгах болно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-10">
              Болих
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="h-11 bg-destructive text-destructive-foreground md:h-10"
            >
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

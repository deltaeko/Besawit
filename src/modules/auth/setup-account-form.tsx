"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setupAccountSchema } from "@/lib/validation/auth";

type SetupAccountValues = z.infer<typeof setupAccountSchema>;

type SetupAccountFormProps = {
  token: string;
  defaultEmail?: string;
};

export function SetupAccountForm({ token, defaultEmail = "" }: SetupAccountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<SetupAccountValues>({
    resolver: zodResolver(setupAccountSchema),
    defaultValues: {
      token,
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SetupAccountValues) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/setup-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(result.error ?? "Setup akun gagal.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Password berhasil disimpan. Silakan login.");
      window.location.assign("/login");
    } catch {
      toast.error("Terjadi gangguan saat menyimpan password.");
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Setup Akun Trial</CardTitle>
        <CardDescription>
          Tetapkan password baru untuk akun admin tenant Anda sebelum login.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <input type="hidden" {...form.register("token")} value={token} />
          <div className="space-y-2">
            <Label htmlFor="email">Email Admin</Label>
            <Input id="email" readOnly type="email" value={defaultEmail} />
            <p className="text-xs text-muted-foreground">
              Email ini akan menjadi akun utama untuk login pertama ke tenant trial.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password Baru</Label>
            <Input id="password" type="password" {...form.register("password")} />
            <p className="text-xs text-destructive">{form.formState.errors.password?.message}</p>
            <p className="text-xs text-muted-foreground">
              Gunakan minimal 8 karakter agar akun admin langsung siap dipakai tim internal.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
            <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} />
            <p className="text-xs text-destructive">
              {form.formState.errors.confirmPassword?.message}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">Setelah password tersimpan</div>
            <ul className="mt-2 space-y-1.5 text-xs leading-5">
              <li>Login ulang akan diarahkan ke dashboard tenant.</li>
              <li>Link setup ini hanya bisa dipakai satu kali.</li>
              <li>Setelah masuk, lanjutkan dengan isi master penting dan transaksi pertama.</li>
            </ul>
          </div>
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Menyimpan..." : "Simpan Password"}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            Sudah punya password?{" "}
            <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/login">
              Kembali ke login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validation/auth";

type LoginValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
  defaultEmail?: string;
  brandName?: string;
};

export function LoginForm({ defaultEmail = "", brandName = "Besawit" }: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: defaultEmail,
      password: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const result = (await response.json()) as { error?: string; firstLogin?: boolean };

      if (!response.ok) {
        toast.error(result.error ?? "Login gagal.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Login berhasil.");
      window.location.assign(result.firstLogin ? "/dashboard?welcome=1" : "/dashboard");
    } catch {
      toast.error("Terjadi gangguan saat login. Coba lagi.");
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Masuk ke {brandName}</CardTitle>
        <CardDescription>
          Masukkan akun yang telah diberikan administrator untuk mulai bekerja.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {defaultEmail ? (
              <p className="text-xs text-muted-foreground">
                Email tenant sudah diisi otomatis. Anda cukup membuat atau memasukkan password.
              </p>
            ) : null}
            <p className="text-xs text-destructive">{form.formState.errors.email?.message}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register("password")} />
            <p className="text-xs text-destructive">
              {form.formState.errors.password?.message}
            </p>
          </div>
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Memproses..." : "Login"}
          </Button>
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-xs leading-5 text-muted-foreground">
            Jika Anda baru menerima trial, setup link tidak ada di halaman login ini. Link
            tersebut dikirim setelah trial selesai diproses dan siap dipakai. Buat password admin
            lebih dulu lewat setup link itu, baru kembali ke sini untuk login.
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

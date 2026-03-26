"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getMasterEntitySchema } from "@/lib/validation/master";
import type { MasterEntityKey } from "@/types/domain";
import type { MasterEntityConfig } from "@/modules/master/types";

type Option = {
  id: string;
  label: string;
};

const CODE_PREFIX: Partial<Record<MasterEntityKey, string>> = {
  farmers: "FRM",
  factories: "FTY",
  customers: "CST",
  suppliers: "SUP",
  "transport-personnel": "PRS",
  vehicles: "VEH",
  warehouses: "WHS",
  products: "PRD",
  categories: "CAT",
  roles: "ROL",
};

function fieldErrorMessage(
  errors: Record<string, { message?: string } | undefined>,
  name: string,
) {
  return errors[name]?.message ?? "";
}

export function MasterForm({
  entity,
  config,
  defaultValues,
  options,
  mode,
  recordId,
}: {
  entity: MasterEntityKey;
  config: MasterEntityConfig;
  defaultValues: Record<string, unknown>;
  options: Record<string, Option[]>;
  mode: "create" | "edit";
  recordId?: string;
}) {
  const router = useRouter();
  const [submitMode, setSubmitMode] = useState<"save" | "save_new">("save");
  const schema = getMasterEntitySchema(entity);

  const form = useForm<Record<string, unknown>, unknown, Record<string, unknown>>({
    resolver: zodResolver(schema as never) as never,
    defaultValues,
  });

  useEffect(() => {
    if (mode !== "create") return;
    const prefix = CODE_PREFIX[entity];
    if (!prefix) return;
    const current = String(form.getValues("code") ?? "").trim();
    if (current) return;
    const now = new Date();
    const datePart =
      `${now.getFullYear()}`.slice(2) +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");
    const suffix = String(Math.floor(Math.random() * 9000) + 1000);
    form.setValue("code", `${prefix}-${datePart}-${suffix}`, { shouldDirty: true });
  }, [entity, mode, form]);

  async function onSubmit(values: Record<string, unknown>) {
    const url =
      mode === "create"
        ? entity === "farmers"
          ? "/api/farmers"
          : `/api/master/${entity}`
        : entity === "farmers"
          ? `/api/farmers/${recordId}`
          : `/api/master/${entity}/${recordId}`;

    const method = mode === "create" ? "POST" : entity === "farmers" ? "PUT" : "PUT";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const result = (await response.json()) as { error?: string; id?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Gagal menyimpan data.");
      return;
    }

    toast.success(mode === "create" ? `${config.singular} berhasil ditambahkan.` : `${config.singular} berhasil diperbarui.`);

    if (mode === "create" && submitMode === "save_new") {
      form.reset(config.defaultValues);
      router.refresh();
      return;
    }

    router.push(`/master/${entity}/${result.id ?? recordId}`);
    router.refresh();
  }

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      {config.formSections.map((section) => (
        <SectionCard
          key={section.key}
          title={section.title}
          description={section.description}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {section.fields.map((field) => {
              const errorMessage = fieldErrorMessage(
                form.formState.errors as Record<string, { message?: string } | undefined>,
                field.name,
              );

              if (field.type === "textarea") {
                return (
                  <div className="space-y-2 md:col-span-2" key={field.name}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Textarea id={field.name} {...form.register(field.name)} />
                    {errorMessage ? (
                      <p className="text-xs text-destructive">{errorMessage}</p>
                    ) : null}
                  </div>
                );
              }

              if (field.type === "switch") {
                return (
                  <div className="space-y-2" key={field.name}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <label className="flex h-10 items-center gap-3 rounded-lg border bg-input px-3">
                      <input
                        className="size-4"
                        id={field.name}
                        type="checkbox"
                        {...form.register(field.name)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {field.description ?? "Aktifkan status data ini"}
                      </span>
                    </label>
                  </div>
                );
              }

              if (field.type === "select") {
                return (
                  <div className="space-y-2" key={field.name}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Select
                      defaultValue={String(defaultValues[field.name] ?? "")}
                      id={field.name}
                      {...form.register(field.name)}
                    >
                      <option value="">Pilih {field.label}</option>
                      {(field.options ??
                        (options[field.optionsSource ?? ""] ?? []).map((option) => ({
                          value: option.id,
                          label: option.label,
                        }))).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    {errorMessage ? (
                      <p className="text-xs text-destructive">{errorMessage}</p>
                    ) : null}
                  </div>
                );
              }

              return (
                <div className="space-y-2" key={field.name}>
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    placeholder={field.placeholder}
                    readOnly={field.name === "code"}
                    className={field.name === "code" ? "bg-muted/70 text-muted-foreground" : undefined}
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "date"
                          ? "date"
                          : field.type === "email"
                            ? "email"
                            : field.type === "password"
                              ? "password"
                              : "text"
                    }
                    {...form.register(field.name)}
                  />
                  {errorMessage ? (
                    <p className="text-xs text-destructive">{errorMessage}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </SectionCard>
      ))}

      <div className="flex flex-wrap justify-end gap-3">
        <Button asChild type="button" variant="outline">
          <Link href={`/master/${entity}`}>Batal</Link>
        </Button>
        {mode === "create" ? (
          <Button
            disabled={form.formState.isSubmitting}
            onClick={() => setSubmitMode("save_new")}
            type="submit"
            variant="outline"
          >
            {form.formState.isSubmitting && submitMode === "save_new"
              ? "Menyimpan..."
              : "Simpan & tambah baru"}
          </Button>
        ) : null}
        <Button
          disabled={form.formState.isSubmitting}
          onClick={() => setSubmitMode("save")}
          type="submit"
        >
          {form.formState.isSubmitting
            ? "Menyimpan..."
            : mode === "create"
              ? "Simpan"
              : config.editLabel}
        </Button>
      </div>
    </form>
  );
}

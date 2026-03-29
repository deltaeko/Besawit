"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { appPermissionDefinitions, type RolePermissionMap } from "@/lib/auth/permissions";
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
  const [selectSearch, setSelectSearch] = useState<Record<string, string>>({});
  const [openSearchField, setOpenSearchField] = useState<string | null>(null);
  const schema = getMasterEntitySchema(entity);

  const form = useForm<Record<string, unknown>, unknown, Record<string, unknown>>({
    resolver: zodResolver(schema as never) as never,
    defaultValues,
  });
  const isCustomer = entity === "customers";
  const isFarmerCustomer = Boolean(form.watch("isFarmer"));
  const selectedFarmerId = String(form.watch("farmerId") ?? "");
  const rolePermissions = (form.watch("permissions") as RolePermissionMap | undefined) ?? {};

  useEffect(() => {
    if (!isCustomer || !isFarmerCustomer || !selectedFarmerId) return;

    const farmerOptions = options.farmers ?? [];
    const selectedFarmer = farmerOptions.find((item) => item.id === selectedFarmerId);
    if (!selectedFarmer) return;

    const normalizedFarmerName = selectedFarmer.label
      .split(" - ")[0]
      .trim();

    if (!normalizedFarmerName) return;

    form.setValue("name", normalizedFarmerName, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [form, isCustomer, isFarmerCustomer, options.farmers, selectedFarmerId]);

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

  useEffect(() => {
    if (entity !== "customers") return;
    const farmerOptions = options.farmers ?? [];
    const selectedFarmer = farmerOptions.find((item) => item.id === selectedFarmerId);

    setSelectSearch((current) => {
      if (!selectedFarmer) {
        if (!current.farmerId) return current;
        return {
          ...current,
          farmerId: "",
        };
      }

      if (current.farmerId === selectedFarmer.label) return current;
      return {
        ...current,
        farmerId: selectedFarmer.label,
      };
    });
  }, [entity, options.farmers, selectedFarmerId]);

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

              if (field.type === "permissions") {
                const permissionGroups = appPermissionDefinitions.reduce<
                  Record<string, Array<(typeof appPermissionDefinitions)[number]>>
                >((acc, item) => {
                  acc[item.group] = [...(acc[item.group] ?? []), item];
                  return acc;
                }, {});

                return (
                  <div className="space-y-4 md:col-span-2" key={field.name}>
                    <Label>{field.label}</Label>
                    <div className="space-y-4">
                      {Object.entries(permissionGroups).map(([group, items]) => (
                        <div className="rounded-2xl border border-border/80 bg-muted/20 p-4" key={group}>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                            {group}
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {items.map((permission) => {
                              const checked = Boolean(rolePermissions[permission.key]);

                              return (
                                <label
                                  className="flex items-start gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5"
                                  key={permission.key}
                                >
                                  <input
                                    checked={checked}
                                    className="mt-1 size-4"
                                    onChange={(event) => {
                                      const nextPermissions = {
                                        ...rolePermissions,
                                        [permission.key]: event.target.checked,
                                      };

                                      form.setValue("permissions", nextPermissions, {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                      });
                                    }}
                                    type="checkbox"
                                  />
                                  <div>
                                    <div className="text-sm font-medium text-foreground">
                                      {permission.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {permission.routePrefix ?? "Aksi sensitif / tanpa halaman menu"}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
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

              if (field.type === "searchable-select") {
                const resolvedOptions =
                  field.options ??
                  (options[field.optionsSource ?? ""] ?? []).map((option) => ({
                    value: option.id,
                    label: option.label,
                  }));
                const query = selectSearch[field.name] ?? "";
                const normalizedQuery = query.trim().toLowerCase();
                const filteredOptions = normalizedQuery
                  ? resolvedOptions.filter((option) =>
                      option.label.toLowerCase().includes(normalizedQuery),
                    )
                  : resolvedOptions;

                return (
                  <div className="space-y-2" key={field.name}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <div className="relative">
                      <Input
                        id={`${field.name}-search`}
                        onBlur={() => {
                          window.setTimeout(() => setOpenSearchField((current) => (current === field.name ? null : current)), 120);
                        }}
                        onChange={(event) => {
                          setOpenSearchField(field.name);
                          setSelectSearch((current) => ({
                            ...current,
                            [field.name]: event.target.value,
                          }));

                          if (!event.target.value.trim()) {
                            form.setValue(field.name, "", {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }
                        }}
                        onFocus={() => setOpenSearchField(field.name)}
                        placeholder={`Klik untuk cari ${field.label.toLowerCase()}...`}
                        value={query}
                      />
                      <input type="hidden" {...form.register(field.name)} />

                      {openSearchField === field.name ? (
                        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-border/80 bg-background p-2 shadow-lg">
                          <button
                            className="w-full rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted/50"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              form.setValue(field.name, "", {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              setSelectSearch((current) => ({
                                ...current,
                                [field.name]: "",
                              }));
                              setOpenSearchField(null);
                            }}
                            type="button"
                          >
                            Kosongkan pilihan
                          </button>
                          {filteredOptions.length ? (
                            filteredOptions.map((option) => (
                              <button
                                className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/50"
                                key={option.value}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  form.setValue(field.name, option.value, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                  setSelectSearch((current) => ({
                                    ...current,
                                    [field.name]: option.label,
                                  }));
                                  setOpenSearchField(null);
                                }}
                                type="button"
                              >
                                {option.label}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Tidak ada data yang cocok dengan pencarian.
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
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
                    readOnly={
                      field.name === "code" ||
                      (isCustomer && field.name === "name" && isFarmerCustomer && Boolean(selectedFarmerId))
                    }
                    className={
                      field.name === "code" ||
                      (isCustomer && field.name === "name" && isFarmerCustomer && Boolean(selectedFarmerId))
                        ? "bg-muted/70 text-muted-foreground"
                        : undefined
                    }
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
                  {entity === "users" && field.name === "password" && mode === "create" ? (
                    <p className="text-xs text-muted-foreground">
                      Password wajib diisi saat membuat pengguna baru.
                    </p>
                  ) : null}
                  {isCustomer && field.name === "name" && isFarmerCustomer && Boolean(selectedFarmerId) ? (
                    <p className="text-xs text-muted-foreground">
                      Nama pelanggan otomatis mengikuti nama petani terkait.
                    </p>
                  ) : null}
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


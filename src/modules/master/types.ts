import type { MasterEntityKey } from "@/types/domain";

export type MasterColumnType =
  | "text"
  | "status"
  | "date"
  | "currency"
  | "number"
  | "boolean"
  | "location";

export type MasterListColumn = {
  key: string;
  label: string;
  type?: MasterColumnType;
};

export type MasterFieldType =
  | "text"
  | "textarea"
  | "permissions"
  | "switch"
  | "number"
  | "date"
  | "email"
  | "select"
  | "searchable-select"
  | "password";

export type MasterFormField = {
  name: string;
  label: string;
  type: MasterFieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  optionsSource?: "roles" | "categories" | "vehicles" | "farmers";
  options?: { value: string; label: string }[];
};

export type MasterFormSection = {
  key: string;
  title: string;
  description?: string;
  fields: MasterFormField[];
};

export type MasterEntityConfig = {
  key: MasterEntityKey;
  title: string;
  singular: string;
  description: string;
  createLabel: string;
  editLabel: string;
  detailTitle: string;
  searchablePlaceholder: string;
  supportsStatusToggle: boolean;
  listColumns: MasterListColumn[];
  detailFields: string[];
  formSections: MasterFormSection[];
  defaultValues: Record<string, unknown>;
};

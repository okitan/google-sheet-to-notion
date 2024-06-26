import type { sheets_v4 } from "@googleapis/sheets";

import type {
  CreateDatabaseParameters,
  CreatePageParameters,
  GetDatabaseResponse,
  UpdateDatabaseParameters,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";

type UpdatePageBodyParameters = Omit<UpdatePageParameters, "page_id">;

const metadata = ["$id", "$icon", "$cover"] as const;
export type Datum = {
  $id?: string;
  $icon?: string;
  $cover?: string;
  [x: string]: Value;
};
type Value = string | number | boolean | string[] | { start: string; end?: string } | undefined | null;

export function parseData({
  data,
  schema,
  validate = false,
}: {
  data: sheets_v4.Schema$ValueRange;
  schema: CreateDatabaseParameters | UpdateDatabaseParameters | GetDatabaseResponse;
  validate?: boolean;
}): Datum[] {
  if (!data.values) return [];

  return parseValues({ header: data.values[0], values: data.values.slice(1), schema, validate });
}

export function parseValues({
  schema,
  header,
  values,
  validate = false,
}: {
  header: any[];
  values: any[][];
  schema: CreateDatabaseParameters | UpdateDatabaseParameters | GetDatabaseResponse;
  validate?: boolean;
}): Datum[] {
  const properties = schema.properties || {};

  const keyMap: { [x: string]: number } = Object.fromEntries(
    [...metadata, ...Object.keys(properties)].map((key) => [key, header.findIndex((e) => e === key)])
  );

  return values.map((array) => ({
    // metadata
    ...Object.fromEntries(
      metadata
        .map((key) => {
          const index = keyMap[key];
          return index >= 0 ? [key, array[index]] : [];
        })
        .filter((e) => e.length)
    ),
    // properties including title
    ...Object.fromEntries(
      Object.keys(properties)
        .map((key) => {
          // Because properties is Record<string, ...>, Object.values is typed as any
          const property = properties[key];
          if (property === null || property === undefined) return [];

          // properyt.type can be undefined when type is title
          const type = "type" in property ? property.type ?? "rich_text" : Object.keys(property)[0];

          const index = keyMap[key];
          if (index < 0) return [];

          const value = parseValue(array[index], type);

          if (validate) {
            if (type === "select" && "select" in property && property.select.options) {
              if (value) {
                const index = property.select.options.findIndex((e) => e.name === value);

                if (index < 0) throw new Error(`Validation Error: ${value} is not allowed for ${key}`); // more friendly error message
              }
            } else if (type === "multi_select" && "multi_select" in property && property.multi_select.options) {
              if (!Array.isArray(value)) throw new Error("something weired");

              const notFound = value.some(
                (v) => (property.multi_select.options?.findIndex((e) => e.name === v) ?? -1) < 0
              );

              if (notFound) throw new Error(`Validation Error: ${value} is not allowed for ${key}`);
            }
          }

          return [key, value];
        })
        .filter((e) => e.length)
    ),
  }));
}

function parseValue(value: any, type: string): Value {
  switch (type) {
    case "title":
    case "rich_text":
    case "email":
    case "phone_number":
    case "created_by":
    case "last_edited_by":
      return value ?? "";
    case "select":
    case "url": // '' is not valid for url
      return value ? value : undefined;
    case "number":
      return value !== undefined ? parseFloat(value) : undefined;
    case "checkbox":
      return value === "TRUE";
    case "multi_select":
    case "files":
    case "relation":
      return value
        ? value
            .split(",")
            .map((e: string) => e.trim())
            .filter((e: string) => e)
        : [];
    case "date":
      if (!value) return undefined;

      if (value.includes("→")) {
        const [start, end] = value.split("→");

        return { start: start.trim(), end: end.trim() };
      } else {
        return { start: value };
      }

    case "created_time":
    case "last_edited_time":
      return value ? value : undefined;
    default:
      throw new Error(`unsupported type ${type}`);
  }
}

export function buildPageParameters({
  data,
  schema,
}: {
  data: Datum;
  schema: CreateDatabaseParameters | UpdateDatabaseParameters | GetDatabaseResponse;
}): CreatePageParameters | UpdatePageBodyParameters {
  const parameter: CreatePageParameters |UpdatePageBodyParameters = data.$id
    ? ({ archived: false } satisfies UpdatePageBodyParameters)
    : "id" in schema
    ? ({ parent: { database_id: schema.id }, properties: {} } satisfies CreatePageParameters)
    : "database_id" in schema
    ? ({ parent: { database_id: schema.database_id }, properties: {} } satisfies CreatePageParameters)
    : (() => {
        throw new Error("You should assign either data.$id, schema.id or schema.database_id");
      })();

  if ("$icon" in data && data.$icon) {
    parameter.icon = {
      type: "emoji",
      // @ts-ignore validate emoji
      emoji: data.$icon,
    };
  }
  if ("$cover" in data && data.$cover) parameter.cover = { type: "external", external: { url: data.$cover } };

  const properties = schema.properties || {};

  parameter.properties = Object.fromEntries(
    Object.entries(data)
      .map(([key, value]) => {
        if (key.startsWith("$")) return [];
        const property = properties[key];
        if (!property) return [];

        // title may be lacks type
        const type = "type" in property ? property.type ?? "title" : Object.keys(property)[0];

        const propertyValue = buildPropertyValue(value, type);

        return propertyValue ? [key, propertyValue] : [];
      })
      .filter((e) => e.length)
  );

  return parameter;
}

function buildPropertyValue(value: Value, type: string) {
  if (typeof value === "undefined" || value === null) return;

  switch (type) {
    case "title":
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      return { type, title: [{ type: "text", text: { content: value } }] };
    case "rich_text":
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      return { type, rich_text: [{ type: "text", text: { content: value } }] };
    case "select":
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      // do not select when blank
      if (!value) return;

      return { type, select: { name: value } };
    case "url":
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      // '' is not OK for url
      if (!value) return;

      return { type, url: value };
    case "email":
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      return { type, email: value };
    case "phone_number":
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      return { type, phone_number: value };
    case "number":
      if (typeof value !== "number") throw new Error(`value should be number for ${type} but ${typeof value}`);
      return { type, number: value };
    case "checkbox":
      if (typeof value !== "boolean") throw new Error(`value should be boolean for ${type} but ${typeof value}`);
      return { type, checkbox: value };
    case "multi_select":
      if (!Array.isArray(value)) throw new Error(`value should be arary for ${type} but ${typeof value}`);
      return { type, multi_select: value.map((e) => ({ name: e })) };
    case "relation":
      if (!Array.isArray(value)) throw new Error(`value should be arary for ${type} but ${typeof value}`);
      // @ts-ignore
      return { type, relation: value.map((e) => ({ id: e })) };
    case "files":
      if (!Array.isArray(value)) throw new Error(`value should be arary for ${type} but ${typeof value}`);
      // FIXME: name
      return { type, files: value.map((e) => ({ type: "external", name: e, external: { url: e } })) };
    case "date":
      if (typeof value !== "object" || Array.isArray(value))
        throw new Error(`value should be object for ${type} but ${typeof value}`);
      if (!("start" in value)) throw new Error(`value shold be { start: string, end?: string} for ${type}`);

      return { type, date: { start: toISOString(value.start), end: value.end ? toISOString(value.end) : undefined } };
    case "created_time":
    case "created_by":
    case "last_edited_time":
    case "last_edited_by":
      return;
    default:
      throw new Error(`unsupported type ${type}`);
  }
}

function toISOString(str: string) {
  // parse and format is on the same timezone
  const date = new Date(Date.parse(str));

  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());

  if (str.includes(":")) {
    const hour = padZero(date.getHours());
    const minute = padZero(date.getMinutes());
    const second = padZero(date.getSeconds());

    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  } else {
    return `${year}-${month}-${day}`;
  }
}
function padZero(num: number) {
  return (num < 10 ? "0" : "") + num;
}

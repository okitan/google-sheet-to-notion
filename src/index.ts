import {
  CreateDatabaseParameters,
  CreatePageParameters,
  GetDatabaseResponse,
  UpdateDatabaseParameters,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { sheets_v4 } from "googleapis";

dayjs.extend(utc);
dayjs.extend(timezone);

const metadata = ["$title", "$id", "$icon", "$cover"] as const;
export type Datum = {
  $id?: string;
  $icon?: string;
  $cover?: string;
  $title: string;
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

  const properties = schema.properties || {};

  const header = data.values[0];

  const keyMap: { [x: string]: number } = Object.fromEntries(
    [...metadata, ...Object.keys(properties)].map((key) => [key, header.findIndex((e) => e === key)])
  );
  if (keyMap.$title < 0) throw new Error("you should at least specify $title");

  return data.values.slice(1).map((array) => ({
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
    ...Object.fromEntries([
      ...Object.keys(properties)
        .map((key) => {
          // Because properties is Record<string, ...>, Object.values is typed as any
          const property = properties[key];
          if (property === null || property === undefined) return [];

          const type = "type" in property ? property.type : Object.keys(property)[0];

          const index = keyMap[key];
          if (index < 0) return [];

          // properyt.type can be undefined when type is title
          const value = parseValue(array[index], type || "rich_text");

          if (validate) {
            if (type === "select" && "select" in property) {
              if (value) {
                const found = property.select.options?.find((e) => e.name === value);

                if (!found) throw new Error(`Validation Error: ${value} is not allowed for ${key}`); // more friendly error message
              }
            } else if (type === "multi_select" && "multi_select" in property) {
              if (property.multi_select.options) {
                if (!Array.isArray(value)) throw new Error("something weired");

                const found = property.multi_select.options.filter((e) => value.includes(e.name || ""));

                if (value.length !== found.length)
                  throw new Error(`Validation Error: ${value} is not allowed for ${key}`);
              }
            }
          }

          return [key, value];
        })
        .filter((e) => e.length),
    ]),
  }));
}

function parseValue(value: any, type: string): Value {
  switch (type) {
    case "rich_text":
    case "select":
    case "email":
    case "phone_number":
    case "created_by":
    case "last_edited_by":
      return value ?? "";
    case "url": // '' is not valid for url
      return value ? value : undefined;
    case "number":
      return value !== undefined ? parseFloat(value) : undefined;
    case "checkbox":
      return !!value;
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

const parameter: CreatePageParameters | UpdatePageParameters = { page_id: "xxx" };
if (parameter.properties) parameter.properties["hoge"] = { type: "title", title: [] };

export function buildPageParameters({
  data,
  schema,
}: {
  data: Datum & { $databaseParent?: string; $pageParent?: string };
  schema: CreateDatabaseParameters | UpdateDatabaseParameters | GetDatabaseResponse;
}): CreatePageParameters | UpdatePageParameters {
  if (!data.$id && !("id" in schema)) throw new Error("You should assign data.$id or shcema.id");

  const title = {
    type: "title" as const,
    title: [{ type: "text" as const, text: { content: data.$title } }],
  };

  const parameter: CreatePageParameters | UpdatePageParameters = data.$id
    ? ({ page_id: data.$id, archived: false } as UpdatePageParameters)
    : "id" in schema
    ? ({ parent: { database_id: schema.id } } as CreatePageParameters)
    : (() => {
        throw new Error("You should assign data.$id or shcmea.id");
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

  parameter.properties = Object.fromEntries([
    ["title", title],
    ...Object.entries(data)
      .map(([key, value]) => {
        if (key.startsWith("$")) return [];
        const property = properties[key];
        if (!property) return [];

        const type = "type" in property ? property.type : Object.keys(property)[0];

        // when type is undefined is title
        const propertyValue = buildPropertyValue(value, type);

        return propertyValue ? [key, propertyValue] : [];
      })
      .filter((e) => e.length),
  ]);

  return parameter;
}

function buildPropertyValue(value: Value, type?: string) {
  if (typeof value === "undefined" || value === null) return undefined;

  // const property: InputPropertyValue = {};
  switch (type) {
    case "title":
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      return { type, title: [{ type: "text", text: { content: value } }] };
    case "rich_text":
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      return { type, rich_text: [{ type: "text", text: { content: value } }] };
    case "select":
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      return { type, select: { name: value } };
    case "url":
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      // '' is not OK for url
      if (!value) return undefined;

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
    default:
      throw new Error(`unsupported type ${type}`);
  }
}

function toISOString(str: string) {
  if (str.includes(":")) {
    return dayjs(str).tz(dayjs.tz.guess()).format("YYYY-MM-DDTHH:mm:ssZ");
  } else {
    return dayjs(str).tz(dayjs.tz.guess()).format("YYYY-MM-DD");
  }
}

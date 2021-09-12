import { PagesCreateParameters, PagesUpdateParameters } from "@notionhq/client/build/src/api-endpoints";
import {
  InputPropertyValue,
  Property,
  PropertySchema,
  RelationProperty,
  UpdatePropertySchema,
} from "@notionhq/client/build/src/api-types";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { sheets_v4 } from "googleapis";

dayjs.extend(utc);
dayjs.extend(timezone);

export type Database = {
  properties?: {
    // Property comes from Retrieve / PropertySchema from Create / UpdatePropertySchema from Update
    [propertyName: string]: Property | PropertySchema | UpdatePropertySchema | RelationProperty | null;
  };
};

const metadata = ["$id", "$icon", "$cover"] as const;
export type Datum = {
  $id?: string;
  $icon?: string;
  $cover?: string;
  $title: string;
  [x: string]: Value;
};
type Value = string | number | boolean | string[] | { start: string; end?: string } | undefined;

export function parseData({ data, schema }: { data: sheets_v4.Schema$ValueRange; schema: Database }): Datum[] {
  if (!data.values) return [];

  const properties: {
    // Property comes from Retrieve / PropertySchema from Create / UpdatePropertySchema from Update
    [propertyName: string]: Property | PropertySchema | UpdatePropertySchema | null;
    $title: { rich_text: {} };
  } = schema.properties ? { ...schema.properties, $title: { rich_text: {} } } : { $title: { rich_text: {} } };

  const header = data.values[0];
  const keyMap: { [x: string]: number } = Object.fromEntries(
    [...metadata, ...Object.keys(properties)].map((key) => [key, header.findIndex((e) => e === key)])
  );
  if (keyMap.title < 0) throw new Error("you should at least specify $title");

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
    ...Object.fromEntries(
      Object.entries(properties)
        .map(([key, property]) => {
          if (property === null || property === undefined) return [];

          const type = "type" in property ? property.type : Object.keys(property)[0];

          const index = keyMap[key];
          return index >= 0 ? [key, parseValue(array[index], type)] : [];
        })
        .filter((e) => e.length)
    ),
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
      return value ? value.split(",") : [];
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
  data: Datum & { $databaseParent?: string; $pageParent?: string };
  schema: Database;
}): PagesCreateParameters | PagesUpdateParameters {
  if (!data.$id && !data.$databaseParent && !data.$pageParent)
    throw new Error("either $id or $databaseParent or $pageParent is needed");

  const title = {
    type: "title",
    title: [{ type: "text", text: { content: data.$title } }],
  };

  const parameter = data.$id
    ? ({ page_id: data.$id, archived: false, properties: { title } } as PagesUpdateParameters)
    : data.$databaseParent
    ? ({ parent: { database_id: data.$databaseParent }, properties: { title } } as PagesCreateParameters)
    : ({ parent: { page_id: data.$pageParnet }, properties: { title } } as PagesCreateParameters);

  if ("$icon" in data && data.$icon) parameter.icon = { type: "emoji", emoji: data.$icon };
  if ("$cover" in data && data.$cover) parameter.cover = { type: "external", external: { url: data.$cover } };

  const properties = schema.properties;
  if (!properties) return parameter;

  Object.entries(data).forEach(([key, value]) => {
    if (key.startsWith("$")) return;
    const property = properties[key];
    if (!property) return;

    const type = "type" in property ? property.type : Object.keys(property)[0];

    const propertyValue = buildPropertyValue(value, type);
    if (propertyValue !== undefined) parameter.properties[key] = propertyValue;
  });
  return parameter;
}

function buildPropertyValue(value: Value, type: string): InputPropertyValue | undefined {
  if (value === undefined) return undefined;

  // const property: InputPropertyValue = {};
  switch (type) {
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
    case "created_by":
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      return { type, created_by: { object: "user", id: value } };
    case "last_edited_by":
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      return { type, last_edited_by: { object: "user", id: value } };
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
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      return { type, created_time: toISOString(value) };
    case "last_edited_time":
      if (typeof value !== "string") throw new Error(`value should be string for ${type} but ${typeof value}`);
      return { type, last_edited_time: toISOString(value) };
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

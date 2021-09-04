import { Property, PropertySchema, UpdatePropertySchema } from "@notionhq/client/build/src/api-types";
import { sheets_v4 } from "googleapis";

export type Database = {
  properties?: {
    // Property comes from Retrieve / PropertySchema from Create / UpdatePropertySchema from Update
    [propertyName: string]: Property | PropertySchema | UpdatePropertySchema | null;
  };
};

export type Data = Array<{
  $id: string | null;
  $icon: string | null;
  $cover: string | null;
  title: string;
  [x: string]: Value;
}>;

type Value = string | number | boolean | string[] | Date | null;

export function parseData({ data, schema }: { data: sheets_v4.Schema$ValueRange; schema: Database }): Data {
  if (!data.values) return [];

  const properties: {
    // Property comes from Retrieve / PropertySchema from Create / UpdatePropertySchema from Update
    [propertyName: string]: Property | PropertySchema | UpdatePropertySchema | null;
    title: { rich_text: {} };
  } = schema.properties ? { ...schema.properties, title: { rich_text: {} } } : { title: { rich_text: {} } };

  const header = data.values[0];
  // TODO: throw Error when $id / $title are included in keys
  const keyMap: { [x: string]: number } = Object.fromEntries(
    ["$id", "$icon", "$cover", ...Object.keys(properties)].map((key) => [key, header.findIndex((e) => e === key)])
  );
  if (!keyMap.title) throw new Error("you should at least specify $title");

  return data.values.slice(1).map((array) => ({
    // metadata
    ...Object.fromEntries(
      ["$id", "$icon", "$cover"].map((key) => {
        const index = keyMap[key];
        const value = index < 0 ? null : array[index];

        return [key, value];
      })
    ),
    // properties including title
    ...Object.fromEntries(
      Object.entries(properties).map(([key, property]) => {
        if (property === null || property === undefined) return [];

        const index = keyMap[key];
        const value = index < 0 ? null : parseValue(array[index], Object.keys(property)[0]);

        return [key, value];
      })
    ),
  }));
}

function parseValue(value: any, type: string): Value {
  switch (type) {
    case "rich_text":
    case "select":
    case "url":
    case "email":
    case "phone_number":
    case "created_by":
    case "last_edited_by":
      return value ?? "";
    case "number":
      return value !== undefined ? parseFloat(value) : null;
    case "checkbox":
      return !!value;
    case "multi_select":
    case "files":
      return value ? value.split(",") : [];
    case "date":
    case "created_time":
    case "last_edited_time":
      return value ? new Date(Date.parse(value)) : null;
    default:
      throw new Error(`unsupported type ${type}`);
  }
}

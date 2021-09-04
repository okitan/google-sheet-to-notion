import { Property, PropertySchema, UpdatePropertySchema } from "@notionhq/client/build/src/api-types";
import { sheets_v4 } from "googleapis";

export type Database = {
  properties?: {
    // Property comes from Retrieve / PropertySchema from Create / UpdatePropertySchema from Update
    [propertyName: string]: Property | PropertySchema | UpdatePropertySchema | null;
  };
};

export function parseData({ data, schema }: { data: sheets_v4.Schema$ValueRange; schema: Database }) {
  if (!data.values) return [];

  const properties = schema.properties ?? {};

  const header = data.values[0];
  // TODO: throw Error when $id / $title are included in keys
  const keyMap: { [x: string]: number | undefined } = Object.fromEntries(
    Object.keys(properties).map((key) => [key, header.findIndex((e) => e === key)])
  );

  return data.values.slice(1).map((array) => ({
    $id: array[0],
    $title: array[1],
    ...Object.fromEntries(
      Object.entries(properties).map(([key, property]) => {
        if (property === null || property === undefined) return [];

        const index = keyMap[key];
        const value = typeof index === "undefined" ? null : parseValue(array[index], Object.keys(property)[0]);

        return [key, value];
      })
    ),
  }));
}

function parseValue(value: any, type: string): string | number | boolean | string[] | Date | null {
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
      return value ? parseFloat(value) : null;
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

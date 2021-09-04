import { Property, PropertySchema } from "@notionhq/client/build/src/api-types";
import { sheets_v4 } from "googleapis";

export type Database = {
  [x: string]: unknown;
  properties: {
    [propertyName: string]: Property | PropertySchema;
  };
};

export function loadData({ data, schema }: { data: sheets_v4.Schema$ValueRange; schema: Database }) {
  if (!data.values) return [];

  const header = data.values[0];
  const keyMap: { [x: string]: number | undefined } = Object.fromEntries(
    Object.keys(schema.properties).map((key) => [key, header.findIndex((e) => e === key)])
  );

  return data.values.slice(1).map((array) => ({
    $id: array[0],
    $title: array[1],
    ...Object.fromEntries(
      Object.entries(schema.properties).map(([key, property]) => {
        const index = keyMap[key];
        const value = typeof index === "undefined" ? null : parseValue(array[index], Object.keys(property)[0]);

        return [key, value];
      })
    ),
  }));
}

function parseValue(value: any, type: string): string | number | boolean | string[] | Date {
  switch (type) {
    case "rich_text":
    case "select":
    case "url":
    case "email":
    case "phone_number":
    case "created_by":
    case "last_edited_by":
      return value;
    case "number":
      return parseFloat(value);
    case "checkbox":
      return !!value;
    case "multi_select":
    case "files":
      return value.split(",");
    case "date":
    case "created_time":
    case "last_edited_time":
      return new Date(Date.parse(value));
    default:
      throw new Error(`unsupported type ${type}`);
  }
}

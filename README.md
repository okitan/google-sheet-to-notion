# google-sheet-to-notion

Convert values from Google Sheets into Notion page property request bodies.

## Installation

```sh
npm install @okitan/google-sheet-to-notion @googleapis/sheets @notionhq/client
```

## How it works

The library uses a Notion data source schema to map Google Sheet columns to
Notion properties. The first row of the sheet must contain the column names.

The following metadata columns are optional:

| Column   | Meaning                                                          |
| -------- | ---------------------------------------------------------------- |
| `$id`    | Notion page ID. When present and non-empty, the page is updated. |
| `$cover` | External URL used as the page cover.                             |
| `$icon`  | Emoji character used as the page icon, for example `🎉`.         |

Metadata columns are not sent as Notion properties.

### Example sheet

| `$id`                                 | `title` | `$cover`                        | `$icon` | `property1` | `property2` |
| ------------------------------------- | ------- | ------------------------------- | ------- | ----------- | ----------- |
| `deadbeef-deadbeef-deadbeef-deadbeef` | A Title | `https://example.com/cover.png` | 🎉      | A property  | 1           |

## Define the Notion schema

The property names in `properties` must match the column names in the sheet.
The property type determines how values are parsed and how page properties are
built.

For example, `property2` is a Number property, so it must use `number`, not
`rich_text`:

```ts
const properties = {
  title: { title: {} },
  property1: { rich_text: {} },
  property2: { number: {} },
};
```

The schema can be retrieved from an existing Notion data source:

```ts
const schema = await notionClient.dataSources.retrieve({
  data_source_id: "DATA_SOURCE_ID",
});
```

If the data source does not exist yet, it can be created first:

```ts
const dataSource = await notionClient.dataSources.create({
  parent: { database_id: "DATABASE_ID" },
  properties,
});

const schema = await notionClient.dataSources.retrieve({
  data_source_id: dataSource.id,
});
```

For parsing, `schema` may be a data source response, a data source creation
request, or a data source update request. To create a page with
`buildPageParameters`, the schema must contain either the data source `id` (as a
retrieved response) or `data_source_id` (as an update request).

## Parse Google Sheet values

`parseData` accepts the `Schema$ValueRange` returned by the Google Sheets API,
not a raw two-dimensional array:

```ts
const { data } = await sheetsClient.spreadsheets.values.get({
  spreadsheetId: "SPREADSHEET_ID",
  range: "Sheet1!A1:F2",
});

const values = parseData({ data, schema });
```

For the example sheet above, `values` contains:

```ts
[
  {
    $id: "deadbeef-deadbeef-deadbeef-deadbeef",
    $cover: "https://example.com/cover.png",
    $icon: "🎉",
    title: "A Title",
    property1: "A property",
    property2: 1,
  },
];
```

Use `parseValues` instead when the header and rows are already available as
separate arrays.

Set `validate: true` to validate `select` and `multi_select` values against the
options defined in the schema:

```ts
const values = parseData({ data, schema, validate: true });
```

## Build and send page requests

`buildPageParameters` creates a request body for either a new page or an
existing page. The page ID is intentionally not included in the returned body,
so it must be supplied to `pages.update` separately.

```ts
for (const value of values) {
  const body = buildPageParameters({ data: value, schema });

  if (value.$id) {
    await notionClient.pages.update({
      page_id: value.$id,
      ...body,
    });
  } else {
    await notionClient.pages.create(body);
  }
}
```

## Value conversion

The schema controls the conversion from sheet values to JavaScript values and
then to Notion property values. The conversion code supports the property types
listed below.

| Notion type                                                        | Sheet value format                         | Parsed value                            |
| ------------------------------------------------------------------ | ------------------------------------------ | --------------------------------------- |
| `title`, `rich_text`, `email`, `phone_number`                      | Text                                       | String                                  |
| `number`                                                           | Numeric text or number                     | Number                                  |
| `checkbox`                                                         | The literal string `TRUE` or another value | `true` or `false`                       |
| `select`, `url`                                                    | Text                                       | String; blank values become `undefined` |
| `multi_select`, `files`                                            | Comma-separated text                       | String array                            |
| `relation`                                                         | Comma-separated page IDs                   | Page ID array                           |
| `date`                                                             | `2021/09/04` or `2021/09/04 → 2021/09/05`  | `{ start, end? }`                       |
| `created_time`, `created_by`, `last_edited_time`, `last_edited_by` | Text                                       | Read-only; omitted when building a page |

For example, using `{ rich_text: {} }` for a numeric column makes the library
treat the value as text. Use `{ number: {} }` when the corresponding Notion
property is a Number property.

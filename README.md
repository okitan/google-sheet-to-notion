# google-sheet-to-notion

Load values from google sheet and convert to request body of notion.

# Usage

Given data of google sheet.
data SHOULD include the header line.

| $id                                 | title   | $cover                        | $icon  | property1  | property2 |
| ----------------------------------- | ------- | ----------------------------- | ------ | ---------- | --------- |
| deadbeef-deadbeef-deadbeef-deadbeef | A Title | https://example.com/cover.png | :tada: | A property | 1         |

Also, given databese of notion with properties.

- property1
  - Text
- property2
  - Number

The database can be created by Notion API with this parameters.

```node
const properties = {
  title: { title: {} },
  property1: { rich_text: {} },
  property2: { rich_text: {} },
};

// notionClient.databases.create({ parent: { type: "page_id, page_id: "XXX" }, title: "A database title", properties });
```

With the properties, You can parse values as Notion-aware data by `praseData`.

```node
// You can get data by `sheetsClient.spreadsheets.values.get`
const data = [
  ["$id", "title", "$cover", "$icon", "property1", "property2"],
  ["deadbeef-deadbeef-deadbeef-deadbeef", "A Title", "https://example.com/cover.png", ":tada:", "A property", 1],
];

const values = parseData({ data, schema: { properties } });
console.log(values);
// [
//   {
//     $id: "deadbeef-deadbeef-deadbeef-deadbeef",
//     $cover: "https://example.com/cover.png",
//     title: "A Title",
//     property1: "A property",
//     property2: 1,
//   },
// ];
```

You can create request body of Notion Page from a value by `buildPageParameters`.

```node
const body = buildPageParameters( { data: ...values[0], schema: { properties }});

notionClient.pages.update(body);
```

When `$id` is present, `buildPageParameters` builds body for update.
If `$id` is empty, you should assign `schema.id` or `schema.database_id` to build body for create.

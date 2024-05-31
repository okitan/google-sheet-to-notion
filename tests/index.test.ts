import type { sheets_v4 } from "@googleapis/sheets";

import type { CreateDatabaseParameters, UpdateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";

import { buildPageParameters, type Datum, parseData } from "../src";

describe(parseData, () => {
  test("works", () => {
    const data: sheets_v4.Schema$ValueRange = {
      values: [
        // header
        [
          "$id",
          "Title",
          "$cover",
          "Text",
          "Number",
          "Select",
          "SelectBlank",
          "MultiSelect",
          "Date",
          "DateWithEnd",
          "Files",
          "Checkbox",
          "CheckboxFalse",
          "Url",
          "Email",
          "PhoneNumber",
          "CreatedTime",
          "CreatedBy",
          "LastEditedTime",
          "LastEditedBy",
          "NotInSchema",
          "TextUndefined",
          "NumberUndefined",
          "CheckboxUndefined",
          "MultiSelectUndefined",
          "DateUndefined",
          "Relation",
        ],
        // data
        [
          "deadbeefdeadbeefdeadbeefdeadbeef",
          "A title",
          "https://example.com/cover.png",
          "A text",
          0,
          "A select",
          "",
          "SelectA,SelectB",
          "2021/09/04",
          "2015/01/10 → 2015/01/16",
          "http://example.com/,https://example.com/",
          "TRUE",
          "FALSE",
          "https://example.com/",
          "no-reply@exmple.com",
          "06-6012-3456",
          "2021/09/04 15:35",
          "okitan",
          "2021/09/04 15:40",
          "okita",
          "Never Seen",
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          "A,B",
        ],
      ],
    };

    const schema: CreateDatabaseParameters = {
      parent: { page_id: "xxx" },
      properties: {
        Title: { title: {} },
        Text: { rich_text: {} },
        Number: { number: {} },
        Select: { select: {} },
        SelectBlank: { select: {} },
        MultiSelect: { multi_select: {} },
        Date: { date: {} },
        DateWithEnd: { date: {} },
        Files: { files: {} },
        Checkbox: { checkbox: {} },
        CheckboxFalse: { checkbox: {} },
        Url: { url: {} },
        Email: { email: {} },
        PhoneNumber: { phone_number: {} },
        CreatedTime: { created_time: {} },
        CreatedBy: { created_by: {} },
        LastEditedTime: { last_edited_time: {} },
        LastEditedBy: { last_edited_by: {} },
        NotInData: { rich_text: {} },
        TextUndefined: { rich_text: {} },
        NumberUndefined: { number: {} },
        CheckboxUndefined: { checkbox: {} },
        MultiSelectUndefined: { multi_select: {} },
        DateUndefined: { date: {} },
        Relation: { type: "relation", relation: { database_id: "ugu", single_property: {} } },
      },
    };

    expect(parseData({ data, schema })).toMatchInlineSnapshot(`
      [
        {
          "$cover": "https://example.com/cover.png",
          "$id": "deadbeefdeadbeefdeadbeefdeadbeef",
          "Checkbox": true,
          "CheckboxFalse": false,
          "CheckboxUndefined": false,
          "CreatedBy": "okitan",
          "CreatedTime": "2021/09/04 15:35",
          "Date": {
            "start": "2021/09/04",
          },
          "DateUndefined": undefined,
          "DateWithEnd": {
            "end": "2015/01/16",
            "start": "2015/01/10",
          },
          "Email": "no-reply@exmple.com",
          "Files": [
            "http://example.com/",
            "https://example.com/",
          ],
          "LastEditedBy": "okita",
          "LastEditedTime": "2021/09/04 15:40",
          "MultiSelect": [
            "SelectA",
            "SelectB",
          ],
          "MultiSelectUndefined": [],
          "Number": 0,
          "NumberUndefined": undefined,
          "PhoneNumber": "06-6012-3456",
          "Relation": [
            "A",
            "B",
          ],
          "Select": "A select",
          "SelectBlank": undefined,
          "Text": "A text",
          "TextUndefined": "",
          "Title": "A title",
          "Url": "https://example.com/",
        },
      ]
    `);
  });

  test("with validation works", () => {
    const schema: UpdateDatabaseParameters = {
      database_id: "xxx",
      properties: {
        Select: { select: { options: [{ name: "hoge" }] } },
        MultiSelect: { multi_select: { options: [{ name: "fuga" }, { name: "ugu" }] } },
      },
    };
    const data: sheets_v4.Schema$ValueRange = {
      values: [
        // header
        ["Select", "MultiSelect"],
        // data
        ["hoge", "fuga,ugu"],
      ],
    };

    expect(parseData({ data, schema, validate: true })).toMatchInlineSnapshot(`
      [
        {
          "MultiSelect": [
            "fuga",
            "ugu",
          ],
          "Select": "hoge",
        },
      ]
    `);
  });

  test("with validation asserts multi select", () => {
    const schema: UpdateDatabaseParameters = {
      database_id: "xxx",
      properties: {
        Select: { select: { options: [{ name: "hoge" }] } },
        MultiSelect: { multi_select: { options: [{ name: "fuga" }] } },
      },
    };
    const data: sheets_v4.Schema$ValueRange = {
      values: [
        // header
        ["Select", "MultiSelect"],
        // data
        ["hoge", "fuga,ugu"],
      ],
    };

    expect(() => {
      parseData({ data, schema, validate: true });
    }).toThrowError("Validation Error: fuga,ugu is not allowed for MultiSelect");
  });
});

describe(buildPageParameters, () => {
  test("works", () => {
    const schema: UpdateDatabaseParameters = {
      database_id: "xxx",
      properties: {
        Title: { title: {} },
        Text: { rich_text: {} },
        Number: { number: {} },
        Select: { select: {} },
        SelectBlank: { select: {} },
        MultiSelect: { multi_select: {} },
        Date: { date: {} },
        Files: { files: {} },
        Checkbox: { checkbox: {} },
        Url: { url: {} },
        Email: { email: {} },
        PhoneNumber: { phone_number: {} },
        CreatedTime: { created_time: {} },
        CreatedBy: { created_by: {} },
        LastEditedTime: { last_edited_time: {} },
        LastEditedBy: { last_edited_by: {} },
        NotInData: { rich_text: {} },
        Relation: { type: "relation", relation: { database_id: "ugu", single_property: {} } },
      },
    };

    const data: Datum = {
      $id: "deadbeefdeadbeefdeadbeefdeadbeef",
      $icon: "😀",
      $cover: "https://example.com/icon.png",
      Title: "A title",
      Text: "A text",
      Number: 0,
      Select: "A select",
      SelectBlank: "",
      MultiSelect: ["SelectA", "SelectB"],
      Date: { start: "2021/09/04" },
      DateWithEnd: { start: "2021/09/04", end: "2021/09/05" },
      Files: ["http://example.com/", "https://example.com/"],
      Checkbox: true,
      Url: "https://example.com/",
      Email: "no-reply@exmple.com",
      PhoneNumber: "06-6012-3456",
      CreatedTime: "2021/09/04 15:35:00",
      CreatedBy: "okitan",
      LastEditedTime: "2021/09/05 15:35:00",
      LastEditedBy: "okita",
      TextUndefined: "",
      NumberUndefined: null,
      CheckboxUndefined: false,
      MultiSelectUndefined: [],
      DateUndefined: null,
      Relation: ["A", "B"],
    };

    expect(buildPageParameters({ data, schema })).toMatchInlineSnapshot(`
      {
        "archived": false,
        "cover": {
          "external": {
            "url": "https://example.com/icon.png",
          },
          "type": "external",
        },
        "icon": {
          "emoji": "😀",
          "type": "emoji",
        },
        "properties": {
          "Checkbox": {
            "checkbox": true,
            "type": "checkbox",
          },
          "Date": {
            "date": {
              "end": undefined,
              "start": "2021-09-04",
            },
            "type": "date",
          },
          "Email": {
            "email": "no-reply@exmple.com",
            "type": "email",
          },
          "Files": {
            "files": [
              {
                "external": {
                  "url": "http://example.com/",
                },
                "name": "http://example.com/",
                "type": "external",
              },
              {
                "external": {
                  "url": "https://example.com/",
                },
                "name": "https://example.com/",
                "type": "external",
              },
            ],
            "type": "files",
          },
          "MultiSelect": {
            "multi_select": [
              {
                "name": "SelectA",
              },
              {
                "name": "SelectB",
              },
            ],
            "type": "multi_select",
          },
          "Number": {
            "number": 0,
            "type": "number",
          },
          "PhoneNumber": {
            "phone_number": "06-6012-3456",
            "type": "phone_number",
          },
          "Relation": {
            "relation": [
              {
                "id": "A",
              },
              {
                "id": "B",
              },
            ],
            "type": "relation",
          },
          "Select": {
            "select": {
              "name": "A select",
            },
            "type": "select",
          },
          "Text": {
            "rich_text": [
              {
                "text": {
                  "content": "A text",
                },
                "type": "text",
              },
            ],
            "type": "rich_text",
          },
          "Title": {
            "title": [
              {
                "text": {
                  "content": "A title",
                },
                "type": "text",
              },
            ],
            "type": "title",
          },
          "Url": {
            "type": "url",
            "url": "https://example.com/",
          },
        },
      }
    `);
  });
});

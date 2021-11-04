import { CreateDatabaseParameters, UpdateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import { sheets_v4 } from "googleapis";

import { buildPageParameters, Datum, parseData } from "../src";

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
          "MultiSelect",
          "Date",
          "DateWithEnd",
          "Files",
          "Checkbox",
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
          "A Title",
          "https://example.com/cover.png",
          "A text",
          0,
          "A select",
          "SelectA,SelectB",
          "2021/09/04",
          "2015/01/10 → 2015/01/16",
          "http://example.com/,https://example.com/",
          "TRUE",
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
        MultiSelect: { multi_select: {} },
        Date: { date: {} },
        DateWithEnd: { date: {} },
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
        TextUndefined: { rich_text: {} },
        NumberUndefined: { number: {} },
        CheckboxUndefined: { checkbox: {} },
        MultiSelectUndefined: { multi_select: {} },
        DateUndefined: { date: {} },
        Relation: { type: "relation", relation: { database_id: "ugu" } },
      },
    };

    expect(parseData({ data, schema })).toMatchInlineSnapshot(`
      Array [
        Object {
          "$cover": "https://example.com/cover.png",
          "$id": "deadbeefdeadbeefdeadbeefdeadbeef",
          "Checkbox": true,
          "CheckboxUndefined": false,
          "CreatedBy": "okitan",
          "CreatedTime": "2021/09/04 15:35",
          "Date": Object {
            "start": "2021/09/04",
          },
          "DateUndefined": undefined,
          "DateWithEnd": Object {
            "end": "2015/01/16",
            "start": "2015/01/10",
          },
          "Email": "no-reply@exmple.com",
          "Files": Array [
            "http://example.com/",
            "https://example.com/",
          ],
          "LastEditedBy": "okita",
          "LastEditedTime": "2021/09/04 15:40",
          "MultiSelect": Array [
            "SelectA",
            "SelectB",
          ],
          "MultiSelectUndefined": Array [],
          "Number": 0,
          "NumberUndefined": undefined,
          "PhoneNumber": "06-6012-3456",
          "Relation": Array [
            "A",
            "B",
          ],
          "Select": "A select",
          "Text": "A text",
          "TextUndefined": "",
          "Title": "A Title",
          "Url": "https://example.com/",
        },
      ]
    `);
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
        Relation: { type: "relation", relation: { database_id: "ugu" } },
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
      MultiSelect: ["SelectA", "SelectB"],
      Date: { start: "2021/09/04" },
      DateWithEnd: { start: "2021/09/04", end: "2021/09/05" },
      Files: ["http://example.com/", "https://example.com/"],
      Checkbox: true,
      Url: "https://example.com/",
      Email: "no-reply@exmple.com",
      PhoneNumber: "06-6012-3456",
      TextUndefined: "",
      NumberUndefined: null,
      CheckboxUndefined: false,
      MultiSelectUndefined: [],
      DateUndefined: null,
      Relation: ["A", "B"],
    };

    expect(buildPageParameters({ data, schema })).toMatchInlineSnapshot(`
      Object {
        "archived": false,
        "cover": Object {
          "external": Object {
            "url": "https://example.com/icon.png",
          },
          "type": "external",
        },
        "icon": Object {
          "emoji": "😀",
          "type": "emoji",
        },
        "page_id": "deadbeefdeadbeefdeadbeefdeadbeef",
        "properties": Object {
          "Checkbox": Object {
            "checkbox": true,
            "type": "checkbox",
          },
          "Date": Object {
            "date": Object {
              "end": undefined,
              "start": "2021-09-04",
            },
            "type": "date",
          },
          "Email": Object {
            "email": "no-reply@exmple.com",
            "type": "email",
          },
          "Files": Object {
            "files": Array [
              Object {
                "external": Object {
                  "url": "http://example.com/",
                },
                "name": "http://example.com/",
                "type": "external",
              },
              Object {
                "external": Object {
                  "url": "https://example.com/",
                },
                "name": "https://example.com/",
                "type": "external",
              },
            ],
            "type": "files",
          },
          "MultiSelect": Object {
            "multi_select": Array [
              Object {
                "name": "SelectA",
              },
              Object {
                "name": "SelectB",
              },
            ],
            "type": "multi_select",
          },
          "Number": Object {
            "number": 0,
            "type": "number",
          },
          "PhoneNumber": Object {
            "phone_number": "06-6012-3456",
            "type": "phone_number",
          },
          "Relation": Object {
            "relation": Array [
              Object {
                "id": "A",
              },
              Object {
                "id": "B",
              },
            ],
            "type": "relation",
          },
          "Select": Object {
            "select": Object {
              "name": "A select",
            },
            "type": "select",
          },
          "Text": Object {
            "rich_text": Array [
              Object {
                "text": Object {
                  "content": "A text",
                },
                "type": "text",
              },
            ],
            "type": "rich_text",
          },
          "Title": Object {
            "title": Array [
              Object {
                "text": Object {
                  "content": "A title",
                },
                "type": "text",
              },
            ],
            "type": "title",
          },
          "Url": Object {
            "type": "url",
            "url": "https://example.com/",
          },
        },
      }
    `);
  });
});

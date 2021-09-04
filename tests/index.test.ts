import { sheets_v4 } from "googleapis";

import { Database, parseData } from "../src";

describe(parseData, () => {
  test("works", () => {
    const data: sheets_v4.Schema$ValueRange = {
      values: [
        // header
        [
          "$id",
          "TitleName",
          "Text",
          "Number",
          "Select",
          "MultiSelect",
          "Date",
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
        ],
        // data
        [
          "deadbeefdeadbeefdeadbeefdeadbeef",
          "A title",
          "A text",
          1,
          "A select",
          "SelectA,SelectB",
          "2021/09/04",
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
        ],
      ],
    };

    const schema: Database = {
      properties: {
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
        TextUndefined: { rich_text: {} },
        NumberUndefined: { number: {} },
        CheckboxUndefined: { checkbox: {} },
        MultiSelectUndefined: { multi_select: {} },
        DateUndefined: { date: {} },
      },
    };

    expect(parseData({ data, schema })).toMatchObject([
      {
        $id: "deadbeefdeadbeefdeadbeefdeadbeef",
        $title: "A title",
        Text: "A text",
        Number: 1,
        Select: "A select",
        MultiSelect: ["SelectA", "SelectB"],
        Date: new Date(2021, 8, 4),
        Files: ["http://example.com/", "https://example.com/"],
        Checkbox: true,
        Url: "https://example.com/",
        Email: "no-reply@exmple.com",
        PhoneNumber: "06-6012-3456",
        CreatedTime: new Date(2021, 8, 4, 15, 35),
        CreatedBy: "okitan",
        LastEditedTime: new Date(2021, 8, 4, 15, 40),
        LastEditedBy: "okita",
        TextUndefined: "",
        NumberUndefined: null,
        CheckboxUndefined: false,
        MultiSelectUndefined: [],
        DateUndefined: null,
      },
    ]);
  });
});

import { MAX_CODE_LENGTH, MAX_FOLDER_DEPTH, MAX_ICON_DATA_LENGTH } from "../src/constants/values";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    descendants,
    exportJSON,
    mergeItems,
    parseImport,
    reorder,
    validateIcon,
    validateItems,
    type Item,
} from "../src/model";
const items: Item[] = [
    { id: "f", kind: "folder", parentId: null, name: "Folder", icon: "📁" },
    { id: "g", kind: "folder", parentId: "f", name: "Nested", icon: "" },
    {
        id: "s",
        kind: "script",
        parentId: "g",
        name: "Test",
        icon: "⚡",
        code: "return document.title;",
    },
    {
        id: "t",
        kind: "script",
        parentId: "g",
        name: "Second",
        icon: "",
        code: "await Promise.resolve();",
    },
];
test("export/import round trip preserves nested folders, code, Unicode, order and image icons", () => {
    const image: Item = { ...items[2]!, icon: "data:image/png;base64,aGVsbG8=" };
    const values = [...items.slice(0, 2), image, items[3]!];
    assert.deepEqual(parseImport(exportJSON(values)), values);
});
test("merge remaps every ID and parent even when incoming IDs collide", () => {
    let sequence = 0;
    const merged = mergeItems(items, items, () => `new-${++sequence}`);
    assert.equal(merged.length, 8);
    assert.deepEqual(
        merged.slice(4).map(item => [item.id, item.parentId]),
        [
            ["new-1", null],
            ["new-2", "new-1"],
            ["new-3", "new-2"],
            ["new-4", "new-2"],
        ],
    );
});
test("reject duplicate IDs, cycles, missing parents, script parent, unknown version and invalid JSON", () => {
    assert.throws(() => validateItems([...items, items[0]]), /уникальными/);
    assert.throws(() => validateItems([{ ...items[0], parentId: "g" }, items[1]]), /цикл/);
    assert.throws(() => validateItems([{ ...items[0], parentId: "missing" }]), /Родитель/);
    assert.throws(
        () =>
            validateItems([
                { ...items[2], parentId: null },
                { ...items[3], parentId: "s" },
            ]),
        /Родитель/,
    );
    assert.throws(() => parseImport("{bad"), /JSON/);
    assert.throws(() => parseImport('{"format":"script-shelf","version":2,"items":[]}'), /версия 1/);
});
test("icon validator disallows external URLs, SVG and oversized input", () => {
    assert.equal(validateIcon("⚡"), "⚡");
    assert.throws(() => validateIcon("https://example.com/a".repeat(4)));
    assert.throws(() => validateIcon("data:image/svg+xml;base64,aGVsbG8="));
    assert.throws(() => validateIcon("x".repeat(MAX_ICON_DATA_LENGTH + 1)));
});
test("recursive delete and sibling reordering preserve tree structure", () => {
    assert.deepEqual([...descendants(items, "g")], ["g", "s", "t"]);
    assert.deepEqual(
        reorder(items, "s", 1).map(item => item.id),
        ["f", "g", "t", "s"],
    );
    assert.deepEqual(reorder(items, "s", -1), items);
    assert.deepEqual(reorder(items, "f", 1), items);
});
test("limits and unknown kind are checked", () => {
    assert.throws(() => validateItems([{ ...items[2], parentId: null, code: "a".repeat(MAX_CODE_LENGTH + 1) }]));
    assert.throws(() => validateItems([{ ...items[2], parentId: null, kind: "other" }]));
    const deep: Item[] = [];
    for (let depth = 0; depth < MAX_FOLDER_DEPTH + 2; depth++) {
        deep.push({
            id: String(depth),
            parentId: depth ? String(depth - 1) : null,
            name: "folder",
            icon: "",
            kind: "folder",
        });
    }
    assert.throws(() => validateItems(deep), /вложенность/);
});

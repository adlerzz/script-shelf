import { test } from "node:test";
import assert from "node:assert/strict";
import { isArray, isExecutionResult, isItem, isRecord, isRequest, isRevision } from "../src/guards";

test("JSON and message guards reject incomplete or mismatched payloads", () => {
    assert.equal(isRecord(null), false);
    assert.equal(isRecord([]), false);
    assert.equal(isArray([]), true);
    assert.equal(isRevision(-1), false);
    assert.equal(isRevision("1"), false);
    assert.equal(isRevision(Number.MAX_SAFE_INTEGER + 1), false);
    const folder = { id: "folder", parentId: null, kind: "folder", name: "Folder", icon: "" };
    assert.equal(isItem(folder), true);
    assert.equal(isItem({ ...folder, kind: "script" }), false);
    assert.equal(isRequest({ type: "load" }), true);
    assert.equal(isRequest({ type: "save", revision: 0, items: [folder] }), true);
    assert.equal(isRequest({ type: "save", revision: 0, items: [{ kind: "folder" }] }), false);
    assert.equal(isRequest({ type: "run", id: "script", tabId: "7" }), false);
    assert.equal(isRequest({ type: "unknown" }), false);
    assert.equal(isRequest(null), false);
});

test("execution result guards require the field belonging to the status", () => {
    assert.equal(isExecutionResult({ ok: true, result: "value" }), true);
    assert.equal(isExecutionResult({ ok: false, error: "broken" }), true);
    assert.equal(isExecutionResult({ ok: true, error: "broken" }), false);
    assert.equal(isExecutionResult({ ok: false, result: "value" }), false);
    assert.equal(isExecutionResult({ ok: "true", result: "value" }), false);
    assert.equal(isExecutionResult({ ok: true, result: 1 }), false);
});

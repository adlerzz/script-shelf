import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

// Browser-level UI regression checks. Chrome APIs are mocked; injection is tested separately.
const root = fileURLToPath(new URL("../", import.meta.url));
const executablePath = process.env.SHELF_BROWSER_EXECUTABLE;
const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: process.env.SHELF_BROWSER_ARGS ? JSON.parse(process.env.SHELF_BROWSER_ARGS) : [],
    headless: true,
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.route("http://shelf.localhost/**", async route => {
    const path = new URL(route.request().url()).pathname;
    try {
        const data = await readFile(`${root}dist${path}`);
        const contentType = path.endsWith(".js") ? "text/javascript" : path.endsWith(".css") ? "text/css" : path.endsWith(".png") ? "image/png" : "text/html";
        await route.fulfill({
            body: data,
            contentType,
            headers: { "Content-Security-Policy": "script-src 'self'; object-src 'self'" },
        });
    } catch {
        await route.fulfill({ status: 404, body: "missing" });
    }
});
await context.addInitScript(() => {
    const listeners = [];
    const getState = () => JSON.parse(localStorage.getItem("shelf") || '{"version":1,"revision":0,"items":[]}');
    window.chrome = {
        runtime: {
            openOptionsPage: async () => {},
            sendMessage: async message => {
                const data = getState();
                if (message.type === "load") {
                    return { ok: true, library: data };
                }
                if (message.type === "save") {
                    if (data.revision !== message.revision) {
                        return { ok: false, error: "Conflict" };
                    }
                    // Simulate Chrome's structured message serialization. Svelte proxies fail here.
                    const next = structuredClone({ ...data, revision: data.revision + 1, items: message.items });
                    await new Promise(resolve => setTimeout(resolve, 15));
                    localStorage.setItem("shelf", JSON.stringify(next));
                    listeners.forEach(listener => listener({ scriptShelf: { newValue: next } }, "local"));
                    return { ok: true, library: next };
                }
                if (message.type === "run") {
                    return { ok: true, result: "Mock execution result" };
                }
            },
        },
        storage: {
            onChanged: {
                addListener: listener => listeners.push(listener),
                emit: (changes, area) => listeners.forEach(listener => listener(changes, area)),
                removeListener: listener => {
                    const index = listeners.indexOf(listener);
                    if (index >= 0) {
                        listeners.splice(index, 1);
                    }
                },
            },
        },
        tabs: { query: async () => [{ id: 7, url: "https://example.test", title: "Demo page" }] },
    };
});
const page = await context.newPage();
page.setDefaultTimeout(10000);
const errors = [];
page.on("pageerror", error => errors.push(error.message));
let acceptDialogs = true;
page.on("dialog", dialog => acceptDialogs ? dialog.accept() : dialog.dismiss());
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("shelf")));
const save = async () => {
    await page.locator("#save").click();
    await page.waitForFunction(() => document.querySelector("#dirty")?.textContent === "Сохранено" && !document.querySelector("fieldset")?.disabled);
};

try {
    await page.goto("http://shelf.localhost/manager.html");
    await page.locator("#new-folder").click();
    await page.locator("#name").fill("Инструменты");
    await save();
    await page.locator("#new-folder").click();
    await page.locator("#name").fill("Страница");
    await save();
    await page.locator("#new-script").click();
    await page.locator("#name").fill("Все ссылки");
    await page.locator("#icon").fill("🔗");
    await page.locator("#code").fill("const links = [...document.querySelectorAll('a')];\nconsole.table(links);\nreturn links.length;");
    assert.equal(await page.locator("#dirty").textContent(), "Не сохранено");
    await save();
    await page.locator("#duplicate").click();
    await page.waitForFunction(() => document.querySelector("#name")?.value === "Все ссылки (копия)");
    await page.locator("#name").fill("Заголовок");
    await page.locator("#code").fill("return document.title;");
    await save();
    await page.locator("#up").click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("shelf")).items[2].name === "Заголовок");
    assert.equal((await state()).items.length, 4);
    assert.equal(await page.locator("#parent option").count(), 3);
    await page.locator("#icon-file").setInputFiles(`${root}public/icons/32.png`);
    await page.waitForFunction(() => document.querySelector("#icon-preview img"));
    await save();
    assert.ok((await state()).items[2].icon.startsWith("data:image/png;"));
    // Move a script to root through Svelte's nullable select binding and back to the folder.
    const parentId = (await state()).items[2].parentId;
    await page.locator("#parent").selectOption({ label: "Корень" });
    await save();
    assert.equal((await state()).items[2].parentId, null);
    await page.locator("#parent").selectOption(parentId);
    await save();
    // Tab inserts four spaces, updates reactive draft state and survives save.
    assert.equal(await page.locator(".codeflask").count(), 1);
    assert.equal(await page.locator("#dirty").textContent(), "Сохранено");
    await page.locator("#code").fill("const greeting = 'hello';\n// note\nreturn greeting;");
    assert.equal(await page.locator(".codeflask__code .token.keyword").first().textContent(), "const");
    assert.equal(await page.locator(".codeflask__code .token.string").textContent(), "'hello'");
    assert.equal(await page.locator(".codeflask__code .token.comment").textContent(), "// note");
    await page.waitForFunction(() => document.querySelectorAll(".codeflask__lines__line").length === 3);
    assert.notEqual(await page.locator(".token.keyword").first().evaluate(el => getComputedStyle(el).color),
        await page.locator(".token.string").evaluate(el => getComputedStyle(el).color));
    // Saving in the same task as input must use the latest draft, despite deferred onUpdate.
    await page.evaluate(() => {
        const textarea = document.querySelector("#code");
        textarea.value = "return 'immediate';";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        document.querySelector("#save").click();
    });
    await page.waitForFunction(() => document.querySelector("#dirty").textContent === "Сохранено" && !document.querySelector("fieldset").disabled);
    assert.equal((await state()).items[2].code, "return 'immediate';");
    await page.locator("#code").fill("return 1;");
    await page.locator("#code").press("End");
    await page.locator("#code").press("Tab");
    await page.locator("#code").press("Control+s");
    await page.waitForFunction(() => document.querySelector("#dirty").textContent === "Сохранено" && !document.querySelector("fieldset").disabled);
    assert.equal((await state()).items[2].code, "return 1;    ");
    // Rejecting navigation keeps the reactive draft; accepting it discards only the draft.
    await page.locator("#name").fill("Несохранённое имя");
    acceptDialogs = false;
    await page.locator("#tree .item-label").filter({ hasText: "Все ссылки" }).click();
    assert.equal(await page.locator("#name").inputValue(), "Несохранённое имя");
    acceptDialogs = true;
    await page.locator("#tree .item-label").filter({ hasText: "Все ссылки" }).click();
    assert.equal(await page.locator("#name").inputValue(), "Все ссылки");
    await page.locator("#tree .item-label").filter({ hasText: "Заголовок" }).click();
    await mkdir(`${root}test-results`, { recursive: true });
    // Scoped styles must reach each component, including shared header snippets.
    assert.equal(await page.locator(".tree-row").first().evaluate(el => getComputedStyle(el).display), "flex");
    assert.equal(await page.locator(".item-icon").first().evaluate(el => getComputedStyle(el).width), "25px");
    assert.equal(await page.locator("#code").evaluate(el => getComputedStyle(el).fontSize), "14px");
    await page.setViewportSize({ width: 500, height: 900 });
    assert.equal(await page.locator("header").evaluate(el => getComputedStyle(el).paddingLeft), "16px");
    assert.equal(await page.locator("footer .caption").isVisible(), false);
    assert.equal(await page.locator(".fields").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length), 1);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: `${root}test-results/manager.png`, fullPage: true });
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#export").click();
    const downloaded = await downloadPromise;
    const exportText = await readFile(await downloaded.path(), "utf8");
    assert.equal(JSON.parse(exportText).items.length, 4);
    await page.locator("#json-file").setInputFiles(`${root}examples/scripts.json`);
    await page.locator("#merge-import").click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("shelf")).items.length === 7);
    assert.equal(new Set((await state()).items.map(item => item.id)).size, 7);
    await page.locator("#search").fill("Все ссылки");
    assert.equal(await page.locator("#tree .item-name").count(), 5);
    await page.locator("#search").fill("");
    await page.locator("#tree .item-label").filter({ hasText: "Инструменты" }).click();
    assert.equal(await page.locator("#parent option").count(), 2);
    assert.equal(await page.locator(".codeflask").count(), 0);
    await page.locator("#delete").click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("shelf")).items.length === 3);
    await page.locator("#json-file").setInputFiles(`${root}examples/scripts.json`);
    await page.locator("#replace-import").click();
    await page.waitForFunction(() => !document.querySelector("#import-dialog").open);
    assert.equal((await state()).items[0].id, "examples");
    await page.locator("#json-file").setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{broken") });
    await page.waitForFunction(() => document.querySelector("#status").textContent.includes("JSON"));
    assert.equal(await page.locator("#import-dialog").isVisible(), false);
    // Another window must never overwrite an unsaved draft or lose its own update.
    await page.locator("#search").fill("Заголовок");
    await page.locator("#tree .item-label").filter({ hasText: "Заголовок страницы" }).click();
    await page.locator("#name").fill("Мой черновик");
    await page.evaluate(() => {
        const next = JSON.parse(localStorage.getItem("shelf"));
        next.revision++;
        next.items.find(item => item.id === "title").code = "return 'external';";
        localStorage.setItem("shelf", JSON.stringify(next));
        chrome.storage.onChanged.emit({ scriptShelf: { newValue: next } }, "local");
    });
    assert.equal(await page.locator("#name").inputValue(), "Мой черновик");
    await page.locator("#save").click();
    await page.waitForFunction(() => document.querySelector("#status").textContent === "Conflict");
    assert.equal((await state()).items.find(item => item.id === "title").code, "return 'external';");
    assert.equal(await page.locator("#dirty").textContent(), "Не сохранено");
    await page.reload();
    const popup = await context.newPage();
    popup.on("pageerror", error => errors.push(error.message));
    await popup.goto("http://shelf.localhost/popup.html");
    await popup.getByRole("button", { name: "🧰 Примеры" }).click();
    assert.equal(await popup.locator(".run-mark").count(), 2);
    await popup.locator("#search").fill("Заголовок");
    assert.equal(await popup.locator(".run-mark").count(), 1);
    await popup.getByRole("button", { name: "🏷️ Заголовок страницы" }).click();
    await popup.waitForFunction(() => document.querySelector("#status").textContent === "Mock execution result");
    assert.equal(await popup.locator("body").evaluate(el => getComputedStyle(el).width), "410px");
    assert.equal(await popup.locator("#manage").evaluate(el => getComputedStyle(el).fontSize), "11px");
    await popup.screenshot({ path: `${root}test-results/popup.png`, fullPage: true });
    assert.deepEqual(errors, []);
    console.log("UI smoke passed: tree, draft bindings, icons, nullable folder selection, Tab, save, duplicate, order, export/import, recursive delete, popup search/run.");
} catch (error) {
    console.error("UI status:", await page.locator("#status").textContent(), "Page errors:", errors);
    throw error;
} finally {
    await browser.close();
}

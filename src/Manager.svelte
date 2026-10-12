<script lang="ts">
    import { isFolder, isScript, isFolderKind, isStorageArea } from "./guards";
    import { ITEM_KIND, COPY_NAME_MAX_LENGTH, COPY_NAME_SUFFIX } from "./constants/values";
    import type { ItemKind, MoveDirection } from "./types";
    import { onMount } from "svelte";
    import { load, save } from "./api";
    import { descendants, emptyLibrary, MAX_FILE_BYTES, mergeItems, parseImport, reorder, type Item } from "./model";
    import { downloadJSON, errorMessage, readIcon } from "./ui";
    import ItemTree from "./components/ItemTree.svelte";
    import AppHeader from "./components/AppHeader.svelte";
    import StatusBar from "./components/StatusBar.svelte";
    import ScriptEditor from "./components/ScriptEditor.svelte";
    import { SYMBOLS } from "./constants/symbols";

    let library = $state.raw(emptyLibrary());
    let selected = $state<string | null>(null);
    let draft = $state<Item | null>(null);
    let dirty = $state(false);
    let saving = $state(false);
    let ready = $state(false);
    let query = $state("");
    let message = $state("Хранится локально в этом браузере");
    let failed = $state(false);
    let pendingImport = $state.raw<Item[] | null>(null);
    let importSummary = $state("");
    let jsonFile = $state<HTMLInputElement>();
    let iconFile = $state<HTMLInputElement>();
    let importDialog = $state<HTMLDialogElement>();
    const scriptCount = $derived(library.items.filter(isScript).length);
    const current = $derived(library.items.find(item => item.id === selected));

    function status (text: string, error = false): void {
        message = text;
        failed = error;
    }

    function safe (action: () => Promise<void>): void {
        void action().catch(error => status(errorMessage(error), true));
    }

    function leaveDraft (): boolean {
        return !dirty || confirm("Есть несохранённые изменения. Отбросить их?");
    }

    function select (id: string | null): void {
        if (saving || !leaveDraft()) {
            return;
        }
        selected = id;
        const item = library.items.find(node => node.id === id);
        draft = item ? { ...item } : null;
        dirty = false;
    }

    async function commit (items: Item[]): Promise<void> {
        if (saving || !ready) {
            throw new Error("Дождись завершения загрузки или сохранения.");
        }
        saving = true;
        try {
            library = await save(library, items);
        } finally {
            saving = false;
        }
    }

    async function create (kind: ItemKind, example = false): Promise<void> {
        if (saving || !leaveDraft()) {
            return;
        }
        const parentId = isFolder(current) ? current.id : current?.parentId ?? null;
        const base = {
            id: crypto.randomUUID(), parentId,
            name: isFolderKind(kind) ? "Новая папка" : example ? "Заголовок страницы" : "Новый скрипт",
            icon: isFolderKind(kind) ? SYMBOLS.CIRCLED_PLUS : SYMBOLS.DIAMOND,
        };
        const item: Item = isFolderKind(kind) ? { ...base, kind } : {
            ...base, kind, code: example ? "const title = document.title;\nconsole.log(title);\nreturn title;" : "",
        };
        await commit([...library.items, item]);
        dirty = false;
        select(item.id);
        status("Создано");
    }

    async function saveDraft (): Promise<void> {
        if (!draft || saving) {
            return;
        }
        // Spreading scalar fields produces a plain DTO, not a Svelte state proxy.
        const candidate: Item = { ...draft, name: draft.name.trim() };
        await commit(library.items.map(item => item.id === candidate.id ? candidate : item));
        draft = { ...library.items.find(item => item.id === candidate.id)! };
        dirty = false;
        status("Сохранено");
    }

    async function remove (): Promise<void> {
        if (!current || saving) {
            return;
        }
        const ids = descendants(library.items, current.id);
        if (!confirm(`Удалить «${current.name}»${ids.size > 1 ? ` и ещё ${ids.size - 1} элементов` : ""}?`)) {
            return;
        }
        await commit(library.items.filter(item => !ids.has(item.id)));
        dirty = false;
        select(null);
        status("Удалено");
    }

    async function duplicate (): Promise<void> {
        if (!current || !isScript(current) || saving || !leaveDraft()) {
            return;
        }
        const copy: Item = { ...current, id: crypto.randomUUID(), name: `${current.name.slice(0, COPY_NAME_MAX_LENGTH)}${COPY_NAME_SUFFIX}` };
        await commit([...library.items, copy]);
        dirty = false;
        select(copy.id);
        status("Скрипт скопирован");
    }

    async function move (direction: MoveDirection): Promise<void> {
        if (selected) {
            await commit(reorder(library.items, selected, direction));
            status("Порядок изменён");
        }
    }

    async function importFile (): Promise<void> {
        const file = jsonFile?.files?.[0];
        if (jsonFile) {
            jsonFile.value = "";
        }
        if (!file) {
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            throw new Error("Максимальный размер JSON — 8 МБ.");
        }
        pendingImport = parseImport(await file.text());
        importSummary = `${file.name}: ${pendingImport.filter(isScript).length} скриптов, ${pendingImport.filter(isFolder).length} папок. Код не запускается при импорте.`;
        importDialog?.showModal();
    }

    async function applyImport (replace: boolean): Promise<void> {
        if (!pendingImport || saving || !leaveDraft()) {
            return;
        }
        if (replace && !confirm("Заменить всю полку? Текущие скрипты и папки будут удалены.")) {
            return;
        }
        await commit(replace ? pendingImport : mergeItems(library.items, pendingImport));
        pendingImport = null;
        importDialog?.close();
        dirty = false;
        select(null);
        status("Импорт завершён");
    }

    async function uploadIcon (): Promise<void> {
        const file = iconFile?.files?.[0];
        if (iconFile) {
            iconFile.value = "";
        }
        if (!file || !draft) {
            return;
        }
        const draftId = draft.id;
        const value = await readIcon(file);
        if (draft?.id === draftId) {
            draft.icon = value;
            dirty = true;
        }
    }

    function shortcut (event: KeyboardEvent): void {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            if (draft) {
                safe(saveDraft);
            }
        }
    }

    onMount(() => {
        const changed = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
            if (!isStorageArea(area) || !changes.scriptShelf || saving) {
                return;
            }
            if (dirty) {
                status("Полка изменена в другом окне. Твой черновик сохранён в редакторе; перед записью потребуется обновление.", true);
                return;
            }
            safe(async () => {
                library = await load();
                const item = library.items.find(node => node.id === selected);
                draft = item ? { ...item } : null;
            });
        };
        chrome.storage.onChanged.addListener(changed);
        safe(async () => {
            library = await load(); ready = true;
        });
        return () => chrome.storage.onChanged.removeListener(changed);
    });
</script>

<svelte:window onkeydown={shortcut} onbeforeunload={event => {
    if (dirty) {
        event.preventDefault();
    }
}} />

<AppHeader subtitle="Маленькие скрипты. Большая экономия времени.">
    <button
        id="export"
        disabled={!ready || saving}
        onclick={() => {
            downloadJSON(library.items); status("Экспортированы сохранённые элементы");
        }}
    >Экспорт JSON</button>
    <button id="import" disabled={!ready || saving} onclick={() => jsonFile?.click()}>Импорт JSON</button>

</AppHeader>
<main class="workspace">
    <aside>
        <div class="sidebar-head"><span>МОЯ ПОЛКА</span><span id="count">{scriptCount}</span></div>
        <input id="search" type="search" bind:value={query} placeholder="Поиск…" aria-label="Поиск" />
        <div class="create-buttons">
            <button id="new-script" disabled={!ready || saving} onclick={() => safe(() => create(ITEM_KIND.SCRIPT))}>＋ Скрипт</button>
            <button id="new-folder" disabled={!ready || saving} onclick={() => safe(() => create(ITEM_KIND.FOLDER))}>＋ Папка</button>
        </div>
        <div id="tree" class="tree">
            <ItemTree items={library.items} {query} {selected} disabled={saving} onselect={item => select(item.id)} />
        </div>
    </aside>
    <section class="editor">
        {#if draft}
            <ScriptEditor
                bind:draft
                items={library.items}
                {dirty}
                {saving}
                onchange={() => {
                    dirty = true;
                }}
                onsave={() => safe(saveDraft)}
                onduplicate={() => safe(duplicate)}
                ondelete={() => safe(remove)}
                onreorder={direction => safe(() => move(direction))}
                onupload={() => iconFile?.click()}
            />
        {:else}
            <div id="welcome" class="welcome">
                <div class="welcome-mark">{"{ }"}</div>
                <h2>Собери свою полку действий</h2>
                <p>Создай скрипт или папку слева.<br />Обычный JavaScript, доступ к странице, запуск по клику.</p>
                <button id="example" class="primary" disabled={!ready || saving} onclick={() => safe(() => create(ITEM_KIND.SCRIPT, true))}>Добавить пример</button>
            </div>
        {/if}
    </section>
</main>
<StatusBar {message} {failed} caption="MAIN context · ручной запуск" />
<input id="json-file" type="file" bind:this={jsonFile} accept="application/json,.json" hidden onchange={() => safe(importFile)} />
<input
    id="icon-file"
    type="file"
    bind:this={iconFile}
    accept="image/png,image/jpeg,image/webp,image/gif"
    hidden
    onchange={() => safe(uploadIcon)}
/>
<dialog id="import-dialog" bind:this={importDialog}>
    <h2>Импорт скриптов</h2>
    <p id="import-summary">{importSummary}</p>
    <p>Добавление сохранит твою полку. Замена удалит текущие элементы.</p>
    <div class="dialog-actions">
        <button id="cancel-import" disabled={saving} onclick={() => importDialog?.close()}>Отмена</button>
        <button id="replace-import" class="danger" disabled={saving} onclick={() => safe(() => applyImport(true))}>Заменить всё</button>
        <button id="merge-import" class="primary" disabled={saving} onclick={() => safe(() => applyImport(false))}>Добавить</button>
    </div>
</dialog>

<style>
    .workspace {
        display: grid;
        grid-template-columns: 290px minmax(0, 1fr);
        min-height: calc(100vh - 143px);

        @media (max-width: 800px) {
            grid-template-columns: 230px minmax(0, 1fr);
        }

        @media (max-width: 560px) {
            grid-template-columns: 1fr;
        }
    }

    aside {
        border-right: 1px solid var(--line);
        padding: 22px 15px;
        background: #151b24;

        @media (max-width: 560px) {
            border-right: 0;
            border-bottom: 1px solid var(--line);
        }
    }

    .sidebar-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 0 5px 18px;
        color: var(--muted);
        font-size: 11px;
        letter-spacing: 1.5px;

        & span:last-child {
            background: #283243;
            border-radius: 5px;
            padding: 1px 7px;
            color: var(--text);
        }
    }

    .create-buttons {
        display: flex;
        gap: 8px;
        margin: 12px 0 18px;

        & button {
            flex: 1;
            padding: 8px;
        }
    }

    .editor {
        padding: 30px 40px;
        min-width: 0;
        max-width: 1200px;
        width: 100%;
        margin: 0 auto;

        @media (max-width: 800px) {
            padding: 24px 20px;
        }
    }

    .welcome {
        min-height: 550px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;

        & p {
            color: var(--muted);
            margin: 16px 0 26px;
        }
    }

    .welcome-mark {
        font: 48px monospace;
        color: var(--accent);
        margin-bottom: 25px;
    }

    dialog {
        max-width: 550px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: var(--panel);
        color: var(--text);
        padding: 28px;

        &::backdrop {
            background: #000a;
        }

        & p {
            color: var(--muted);
        }
    }

    .dialog-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 25px;
    }

    @media (max-width: 560px) {
        .tree {
            max-height: 250px;
            overflow: auto;
        }
    }
</style>

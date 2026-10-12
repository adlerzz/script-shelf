<script lang="ts">
    import { isStorageArea } from "./guards";
    import { REQUEST_TYPE, TREE_MODE } from "./constants/values";

    import { onMount } from "svelte";
    import { load, request } from "./api";
    import { emptyLibrary, type Item } from "./model";
    import { errorMessage } from "./ui";
    import ItemTree from "./components/ItemTree.svelte";
    import AppHeader from "./components/AppHeader.svelte";
    import StatusBar from "./components/StatusBar.svelte";
    import { SYMBOLS } from "./constants/symbols";

    let library = $state.raw(emptyLibrary());
    let query = $state("");
    let tabId = $state<number>();
    let target = $state("Загрузка вкладки…");
    let busy = $state(false);
    let message = $state("Выбери скрипт для запуска");
    let failed = $state(false);
    let searchInput = $state<HTMLInputElement>();

    function status (text: string, error = false): void {
        message = text;
        failed = error;
    }

    async function run (item: Item): Promise<void> {
        if (busy || tabId === undefined) {
            return;
        }
        busy = true;
        status(`Выполняется: ${item.name}…`);
        try {
            const result = await request({ type: REQUEST_TYPE.RUN, id: item.id, tabId });
            status(result.result ?? "Готово");
        } catch (error) {
            status(errorMessage(error), true);
        } finally {
            busy = false;
        }
    }

    onMount(() => {
        const refresh = () => load().then(value => {
            library = value;
        }).catch(error => status(errorMessage(error), true));
        const changed = (_changes: Record<string, chrome.storage.StorageChange>, area: string) => {
            if (isStorageArea(area)) {
                void refresh();
            }
        };
        chrome.storage.onChanged.addListener(changed);
        void (async () => {
            await refresh();
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id !== undefined && /^(https?|file):/.test(tab.url ?? "")) {
                tabId = tab.id;
                target = tab.title ?? tab.url ?? "Текущая вкладка";
            } else {
                target = "На этой странице запуск недоступен";
            }
            searchInput?.focus();
        })().catch(error => status(errorMessage(error), true));
        return () => chrome.storage.onChanged.removeListener(changed);
    });
</script>

<AppHeader subtitle="Твои действия на этой странице" compact>
    <button id="manage" title="Открыть редактор" onclick={() => chrome.runtime.openOptionsPage()}>Управление {SYMBOLS.GEAR}</button>
</AppHeader>
<main>
    <input id="search" type="search" bind:this={searchInput} bind:value={query} placeholder="Найти скрипт…" aria-label="Поиск скриптов" />
    <div id="target" class="target">{target}</div>
    <div id="list" class="popup-list">
        <ItemTree items={library.items} {query} mode={TREE_MODE.RUN} disabled={busy || tabId === undefined} onselect={item => void run(item)} />
    </div>
</main>
<StatusBar {message} {failed} compact />

<style>
    :global(body.popup) {
        width: 410px;
        min-height: 240px;
    }

    main {
        padding: 14px;
    }

    .target {
        font-size: 11px;
        color: var(--muted);
        padding: 10px 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .popup-list {
        max-height: 380px;
        overflow: auto;
    }
</style>

<script lang="ts">
    import { TREE_INDENT_PX, TREE_MANAGE_PADDING_PX, TREE_RUN_PADDING_PX } from "../constants/values";
    import { SvelteSet } from "svelte/reactivity";
    import { isManageMode, isRunMode, TREE_MODE, type TreeMode } from "../models/mode.model";
    import { folderPath } from "../ui";
    import ItemIcon from "./ItemIcon.svelte";
    import { SYMBOLS } from "../constants/symbols";
    import { isFolder, isScript, type Item } from "../models/item.model";

    interface Props {
        items: Item[];
        query?: string;
        selected?: string | null;
        mode?: TreeMode;
        disabled?: boolean;
        onselect: (item: Item) => void;
    }

    let { items, query = "", selected = null, mode = TREE_MODE.MANAGE, disabled = false, onselect }: Props = $props();
    const opened = new SvelteSet<string>();
    const search = $derived(query.trim().toLocaleLowerCase());
    const scripts = $derived(items.filter(isScript));
    const matches = $derived(scripts.filter(item =>
        `${item.name} ${folderPath(items, item.parentId)}`.toLocaleLowerCase().includes(search),
    ));
    const visible = $derived.by(() => {
        const ids = new SvelteSet<string>();
        if (search && isManageMode(mode)) {
            for (const item of items) {
                if (item.name.toLocaleLowerCase().includes(search)) {
                    ids.add(item.id);
                    let parent = item.parentId;
                    while (parent) {
                        ids.add(parent);
                        parent = items.find(node => node.id === parent)?.parentId ?? null;
                    }
                }
            }
        }
        return ids;
    });

    $effect(() => {
        let parent = items.find(item => item.id === selected)?.parentId ?? null;
        while (parent) {
            opened.add(parent);
            parent = items.find(item => item.id === parent)?.parentId ?? null;
        }
    });

    function toggle (id: string): void {
        if (opened.has(id)) {
            opened.delete(id);
        } else {
            opened.add(id);
        }
    }

    function activate (item: Item): void {
        if (isRunMode(mode) && isFolder(item)) {
            toggle(item.id);
        } else {
            onselect(item);
        }
    }
</script>

{#snippet row(item: Item, depth: number)}
    <div class="tree-row" class:selected={selected === item.id} style:padding-left={`${(isRunMode(mode) ? TREE_RUN_PADDING_PX : TREE_MANAGE_PADDING_PX) + depth * TREE_INDENT_PX}px`}>
        {#if isManageMode(mode)}
            {#if isFolder(item)}
                <button
                    type="button"
                    class="toggle"
                    {disabled}
                    aria-label={`Раскрыть или свернуть «${item.name}»`}
                    aria-expanded={!!search || opened.has(item.id)}
                    onclick={() => toggle(item.id)}
                >
                    {search || opened.has(item.id) ? SYMBOLS.DOWN : SYMBOLS.RIGHT}
                </button>
            {:else}
                <span class="tree-spacer">{SYMBOLS.DIAMOND}</span>
            {/if}
        {/if}
        <button
            type="button"
            class="item-label"
            disabled={disabled && (isManageMode(mode) || isScript(item))}
            title={isRunMode(mode) && isScript(item) ? "Запустить на текущей вкладке" : item.name}
            onclick={() => activate(item)}
        >
            <ItemIcon {item} />
            <span class="item-name">{item.name}</span>
            {#if isRunMode(mode)}
                {#if isFolder(item)}
                    <span class="chevron">{opened.has(item.id) ? SYMBOLS.DOWN : SYMBOLS.LEFT}</span>
                {:else}
                    <span class="run-mark">{SYMBOLS.DIAMOND}</span>
                {/if}
            {/if}
        </button>
    </div>
{/snippet}

{#snippet branch(parentId: string | null, depth: number)}
    {#each items.filter(item => item.parentId === parentId && (!search || visible.has(item.id))) as item (item.id)}
        {@render row(item, depth)}
        {#if isFolder(item) && (search || opened.has(item.id))}
            {@render branch(item.id, depth + 1)}
        {/if}
    {/each}
{/snippet}

{#if isRunMode(mode) && !scripts.length}
    <div class="empty">Полка пока пустая. Открой «Управление» и добавь первый скрипт.</div>
{:else if isRunMode(mode) && search}
    {#each matches as item (item.id)}
        {@render row(item, 0)}
        <div class="path">{folderPath(items, item.parentId)}</div>
    {:else}
        <div class="empty">Ничего не найдено</div>
    {/each}
{:else if !items.length || (search && !visible.size)}
    <p class="empty">{search ? "Ничего не найдено" : "Скриптов пока нет"}</p>
{:else}
    {@render branch(null, 0)}
{/if}

<style>
    .tree-row {
        display: flex;
        align-items: center;
        min-height: var(--item-height);
        border-radius: 8px;
        margin: 2px 0;

        &:hover {
            background: #202b39;
        }

        &.selected {
            background: #2a3a32;
            border: 1px solid #496640;
        }
    }

    .item-label {
        display: flex;
        gap: 10px;
        align-items: center;
        text-align: left;
        flex: 1;
        min-width: 0;
        border: 0;
        background: transparent;
        padding: 2px;

        &:hover {
            background: transparent;
        }
    }

    .item-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .toggle {
        border: 0;
        background: none;
        padding: 4px;
        width: 20px;
        font-size: 18px;
    }

    .tree-spacer {
        width: 20px;
        flex-shrink: 0;
    }

    .empty {
        padding: 25px 12px;
        color: var(--muted);
        text-align: center;
        font-size: 13px;
    }

    .run-mark, .chevron {
        margin-left: auto;
        color: var(--accent);
        font-size: 12px;
    }

    .path {
        padding: 0 14px 5px;
        font-size: 10px;
        color: var(--muted);
    }
</style>

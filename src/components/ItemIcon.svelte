<script lang="ts">
    import { isFolder } from "../guards";
    import { SYMBOLS } from "../constants/symbols";
    import type { Item } from "../model";

    let { item }: { item: Item } = $props();
</script>

<span class="item-icon">
    {#if item.icon.startsWith("data:image/")}
        <img src={item.icon} alt="" />
    {:else}
        {item.icon || (isFolder(item) ? SYMBOLS.CIRCLED_PLUS : SYMBOLS.DIAMOND)}
    {/if}
</span>

<style>
    .item-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 25px;
        height: 25px;
        flex-shrink: 0;
        font-size: 20px;
        overflow: hidden;

        & img {
            width: 24px;
            height: 24px;
            object-fit: contain;
        }
    }
</style>

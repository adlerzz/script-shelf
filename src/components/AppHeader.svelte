<script lang="ts">
    import type { Snippet } from "svelte";

    let { subtitle, compact = false, children }: { subtitle: string; compact?: boolean; children?: Snippet } = $props();
</script>

<header class:compact>
    <div class="brand">
        <div class="image"></div>
    </div>
    <div>
        <h1>Script Shelf</h1>
        <p>{subtitle}</p>
    </div>
    <div class="header-actions">{@render children?.()}</div>
</header>

<style>
    header {
        display: flex;
        gap: 14px;
        align-items: center;
        border-bottom: 1px solid var(--line);
        padding: 16px 28px;

        & p {
            margin: 2px 0 0;
            color: var(--muted);
            font-size: 12px;
        }

        &.compact {
            padding: 8px 16px;
            gap: 10px;
        }

        &.compact h1 {
            font-size: 18px;
        }

        &.compact .brand {
            width: 34px;
            height: 34px;
            font-size: 28px;
        }

        &.compact p {
            font-size: 10px;
        }

        &.compact .header-actions :global(button) {
            margin-left: auto;
            font-size: 11px;
            padding: 6px 8px;
        }

        @media (max-width: 800px) {
            & p {
                display: none;
            }
        }

        @media (max-width: 560px) {
            &:not(.compact) {
                padding: 16px;
            }
        }
    }

    h1 {
        font-size: 21px;
        letter-spacing: -0.5px;
        margin: 0;
    }

    .brand {
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: var(--accent);
        width: 42px;
        height: 42px;

        .image{
            width: 100%;
            height: 100%;
            background-image: url("./icons/48.png");
            background-size: contain;
        }
    }

    .header-actions {
        display: flex;
        gap: 8px;
        margin-left: auto;

        @media (max-width: 800px) {
            flex-wrap: wrap;
        }
    }
</style>

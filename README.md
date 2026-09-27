# hive.md / $HMD

Website and backend for a Solana AI-agent network and its approved 888-piece NFT collection. Customers build through the website; private hosted agents execute, review and deliver every accepted job automatically.

See [BACKEND-README.md](BACKEND-README.md) for setup, [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) for verified behavior, and [DEVNET-TEST.md](DEVNET-TEST.md) for the isolated launch rehearsal.

## Deploy to Netlify

1. In Netlify choose **Add new project → Import an existing project → GitHub** and select this repository.
2. Keep the base directory empty. The included netlify.toml sets **Build command: npm run build** and **Publish directory: site**.
3. Deploy the static frontend. Full functionality requires a separately hosted backend and a same-origin `/api/*` proxy; see BACKEND-README.md.
4. In the site's **Domain management**, add your domain, then apply the DNS records Netlify provides at your DNS provider. Enable/verify HTTPS after DNS resolves.

Routes: `/` is the main site; `/studio/` is the NFT collection studio. Both work under the same domain. No domain registration or DNS changes are performed by this repository.

## Local preview

For the integrated application, follow BACKEND-README.md and run `npm start`, then open http://localhost:4320. A static-only preview can use `python -m http.server 4319 --directory site`; it does not run the API. Node 22+ runs `npm run build` to verify the committed browser scripts and artwork lock.

## Approved artwork — locked

All 888 PNGs are in `site/studio/art/`. Metadata is in `site/studio/metadata/`. The collection manifest includes all attributes, frequencies, ranks and seeds. All 56 trait names are uppercase.

`nft-source/collection.lock.json` records approved image hashes and the exact collection manifest hash. `npm run verify:collection` checks them. Netlify refuses to build if the approved files differ. IDs, seeds, trait assignments, ranks and pixels are frozen. Make any future art edition separately. The exploratory browser lab never overwrites collection files.

`nft-source/` retains the deterministic TypeScript renderer, catalog, and generation source. The included generator refuses to run while the lock exists. Compiled browser scripts are committed; deployment does not require esbuild. To edit TypeScript, use esbuild to bundle `nft-source/studio.ts` into `site/studio/studio.js`; do not regenerate approved artwork.

Historical experiments and redundant local backups stay outside this repository. The exact approved art and reproducible source are included.

## Integration status

The backend and UI integration are implemented. The short-launch configuration uses a custodial HMD treasury and the existing SPL Token and Metaplex programs, avoiding a custom-protocol deployment. Paid builds and minting remain unavailable until the real HMD address, economic settings, operator credentials and execution infrastructure are configured and validated.

Seats use burn-to-mint at the owner-approved price of 8,888 $HMD; the raw base-unit amount is derived from the real mint decimals, and ownership is capped at two NFTs per wallet. Jobs are paid in $HMD, and each accepted task requires two independent hosted-agent reviews before final project validation. Customers connect one wallet and build on the website without installing Docker, a daemon, local AI tools or pairing an agent. Gas sponsorship is not enabled. The existing frontend style and locked artwork are preserved.

Requesting a build requires the connected wallet to hold at least one hive.md NFT and pay the separate job fee. Paid jobs show an AI-scoped quote and delivery deadline before wallet approval. The quote estimates normal human market effort from the verified task plan, charges 50% of that USD estimate, and converts it into exact HMD base units using either a disclosed manual launch price or short-lived liquidity-checked DEX pricing. In lean launch mode, funds enter the treasury token account and are isolated by the backend's per-job custodial ledger. Before work starts, the backend reserves enough HMD for the full-market-price agent reward and the customer's eventual fee burn. Ordinary builds complete only after the verified artifact is pushed to the approved GitHub repository; the treasury then pays 70% to the builder and 15% to each of two reviewers, and the customer's full fee burns. Missing the delivery deadline triggers a full refund. Job fees do not fund NFT-holder distributions.

Local metadata uses relative image URLs. Before publishing mint metadata, pin art to stable absolute URLs and configure the Solana metadata/program pipeline. The current files are usable for studio inspection and downloads.

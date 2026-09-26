# hive.md NFT launch package

The visual collection is frozen: exactly 888 unique 480x480 PNGs, deterministic IDs, traits, rarity ranks and SHA-256 locks. A seat mint burns exactly 8,888 HMD, the owner pays the Solana transaction/rent fees, and a wallet can mint at most two seats. The generated NFT has zero royalties and is verified into the hive.md Agent Seats Metaplex collection.

Users do not install anything. They connect a Solana wallet on the website and can type phrases such as `pls mint`, `agent pls mint`, or `mint one NFT`. The website opens the real mint review. It never signs for the user: the wallet must display and approve the 8,888-HMD burn and SOL fees.

## What is already prepared

- `site/studio/art/1.png` through `888.png`: locked approved art.
- `site/studio/metadata/1.json` through `888.json`: locked trait assignments used as the source of the final metadata.
- `nft-source/collection.lock.json`: art and collection hashes.
- `npm run nft:prepare`: creates a new, non-overwriting publication candidate containing all images, marketplace-compatible item JSON, collection JSON, hashes, rarity data and a mint configuration template.
- `npm run nft:verify`: independently verifies all 888 images and metadata documents.
- `npm run nft:collection:create`: guarded one-time creation of the sized Metaplex collection NFT.
- `npm run nft:bind-hmd`: reads the launched mint from Solana, rejects Token-2022/wrong accounts, reads decimals, and calculates the exact raw burn amount for 8,888 HMD.

## Permanent metadata sequence

1. Quote the permanent Arweave image upload with `npm run nft:upload:images`. This prepares exactly 888 locked images plus a copy of `155.png` named `collection.png`; quote mode cannot spend SOL.
2. Review the wallet, balance, quote, and cap. Set `CONFIRM_TURBO_UPLOAD=UPLOAD_PERMANENT_ASSETS`, then run `npm run nft:upload:images:execute`. Record the printed `IMAGES_BASE_URI` as `NFT_IMAGE_BASE_URI`.
3. Export a fresh immutable release candidate. Quote its metadata with `npm run nft:upload:metadata`, then upload with `npm run nft:upload:metadata:execute`. Record `METADATA_BASE_URI` as `NFT_METADATA_BASE_URI` and set `COLLECTION_METADATA_URI=<METADATA_BASE_URI>/collection.json`.
4. Verify all 1,778 remote files byte-for-byte with `npm run nft:verify:remote`; while Arweave indexing is pending, `npm run nft:verify:remote:fast` verifies the same immutable data through Turbo's fast-finality gateway.
2. Set `NFT_IMAGE_BASE_URI` to that final directory URI. Optionally set the HTTPS `NFT_EXTERNAL_URL`.
3. Run `npm run nft:prepare`. Do not reuse an existing output directory; every candidate is immutable.
4. Run `npm run nft:verify` against that candidate.
5. Upload its `metadata` directory to permanent storage. The resulting directory URI becomes `MINT_BASE_URI`; `collection.json` inside it becomes `COLLECTION_METADATA_URI`.
6. Check several image and JSON URIs through an independent gateway before creating anything on mainnet.

Example preparation (the CIDs below must be real, not placeholders):

```powershell
$env:NFT_IMAGE_BASE_URI='ipfs://<final-images-directory-cid>'
$env:NFT_EXTERNAL_URL='https://hmd.bot'
$env:NFT_RELEASE_DIR='publication-mainnet-v1'
npm run nft:prepare
npm run nft:verify
```

## One-time collection creation

Generate and secure separate authority and collection-mint keypairs. Never commit or paste them. Configure `COLLECTION_AUTHORITY_KEYPAIR_PATH`, `COLLECTION_MINT_KEYPAIR_PATH`, `COLLECTION_METADATA_URI`, the production RPC and cluster. Preflight does not transact:

```powershell
npm run nft:collection:create
```

For an intentional mainnet transaction, review every value, set `CONFIRM_MAINNET_COLLECTION_CREATE=CREATE_HIVE_COLLECTION`, then run:

```powershell
npm run nft:collection:create -- --execute
```

Save the printed `SEAT_COLLECTION_ADDRESS`. After the Hive program is deployed and initialized, the collection update authority must be transferred to its config PDA so each freshly minted seat can be verified into the collection.

## When HMD launches

Set the public contract address as `HMD_MINT` and run:

```powershell
npm run nft:bind-hmd
```

This produces `.hive/hmd-binding.env` containing the verified address, decimals, and exact `HMD_BURN_AMOUNT`.

After the reviewed Hive program is deployed, initialize it in the closed state:

```powershell
npm run protocol:initialize
npm run protocol:initialize -- --execute
```

The initializer validates the deployed upgradeable program, classic SPL mint, sized collection, permanent metadata URI and exact 8,888-HMD base-unit amount. A new config always starts paused. Next, transfer the collection verification authority to the program's config PDA:

```powershell
npm run protocol:collection:delegate
npm run protocol:collection:delegate -- --execute
```

For mainnet, each state-changing command additionally requires the exact confirmation phrase documented in `.env.example`. Keep the website private, explicitly open minting with `HIVE_PAUSED=false`, and immediately perform the one-seat canary:

```powershell
npm run protocol:pause
npm run protocol:pause -- --execute
```

If the canary passes, open the website to the public while leaving the protocol unpaused. If it fails, set `HIVE_PAUSED=true` with the same command for the emergency stop.

The HMD contract address cannot be hardcoded before launch, and permanent storage cannot be fabricated without a real upload destination. Those are the only collection inputs intentionally left open.

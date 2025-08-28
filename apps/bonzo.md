# Bonzo

## Setup

Apply the `bonzo.patch` onto the `bonzo/` submodule to setup the customizations needed to run the deployment process.

```sh
```

The patch applies the following modifications

- Fixes `package-lock.json` to allow us to run `npm ci` successfully,
- Creates a `.env` with Solo/Local Node private keys,
- Uses `hedera_mainnet` network pointing to a **local network**
- Adds a small waiting period in `oracle-helpers.ts` to allow ownership changes to propagate properly, and
- Comments out `"Reserves initialization"` in `init-helpers.ts` because it was throwing some errors.

The last step allows us to at least have a partial deployment process that runs successfully.

> [!NOTE]
> The patch was created by first making the desired modification into the `bonzo` submodule.
> Then, the following command creates a patch from those modifications.
>
> ```sh
> git diff > ../bonzo.patch
> ```

## Deployment

To execute the deployment process for Bonzo, run

```sh
npm run hedera:mainnet:full:migration
```

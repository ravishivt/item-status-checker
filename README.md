# Item Status Checker

This queries the status for a particular web item (e.g. product inventory status) and emails if the status changes.  It is designed to not query the target URL too often and not to email too often.  The frequency of both can be configured as desired.

## Usage

To get started, create `./config/localConfig.json` by cloning the sample config under `./config/localConfig.SAMPLE.json` and customizing it.

Then run:

```sh
yarn install
yarn start
```

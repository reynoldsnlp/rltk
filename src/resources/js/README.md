The `js` and `wasm` files in this directory are stored for archiving purposes, but they will not be updated regularly, to avoid ballooning the storage in git history.

The intended practice is to have the `<lib>-debug.js` and `<lib>-optimized.js` (and their respective `wasm` files) which can be easily switched by symlinking or copying them to `<lib>.js` and `<lib>.wasm`.

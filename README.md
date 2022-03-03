# Installation

1. Run `yarn`

# To publish via `yalc`

1. Ensure `yalc` is installed `yarn global add yalc`
2. Run `yarn build-release` (this prepares the JS build files)
3. Run `yalc publish`
4. In the dependent repository, run `yalc add @voltz/v1-sdk`

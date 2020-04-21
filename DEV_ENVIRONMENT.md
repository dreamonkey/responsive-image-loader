# Developer guide: getting your environment set up

1. Make sure you have `node` installed with a version at _least_ 10.0.0 and `yarn` with a version
   of at least 1.10.0. We recommend using `nvm` to manage your node versions.
2. Fork the `dreamonkey/responsive-image-loader` repo on GitHub.
3. Clone your fork to your machine with `git clone`.
   Recommendation: name your git remotes `upstream` for this repository
   and `origin` or `<your-username>` for your fork.
4. From the root of the project, run `yarn`.

To run unit tests, run `yarn test`.
NOTE: Currently some Thumbor-related tests will fail randomly due to possible race conditions or time-outs.
Run them 2-3 times and they should disappear.

To run lint, run `yarn lint`.

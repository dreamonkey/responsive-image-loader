# responsive-image-loader

**New package, who dis?**

A webpack loader to automagically bring your website images to a whole new level of responsiveness!

This loader tackles in an unified way three main problems with images on the web nowadays:

- usage of most efficient image formats (automatic conversion);
- images resizing to always serve the lightest bundle possible (resolution switching);
- intelligent images transformation based on focal points of an image (art direction).

Moreover, we aim to automatize everything that doesn't strictly require your input:

- calculating best breakpoints for resolution switching;
- ordering sources by most efficient image format;
- providing sensible defaults;
- serving a fallback for older browsers;
- and more!

We also fucused on flexiblity and customizability: conversion, resizing and transformation engines can be easily switched with your implementation, which you can then PR here and make available to others.

**Aren't there other tools doing the same stuff?**
![Well yes, but actually no](docs/well-yes-but-actually-no.jpg?raw=true)
We found some notable tools while evaluating if it was worth to create our own package, but none of them combines all the requirements we now offer:

- manages together conversion, resolution switching and art direction, with all their weird interactions;
- framework agnostic;
- operates at build time (did anyone said SSG?);
- works offline;
- free;
- open source;
- customizable and flexible at its core.

For more info, check out the [issue](https://github.com/quasarframework/quasar/issues/5383#issue-511313782) from which this package spawned.

## Table of contents

- [Roadmap](#roadmap)
- [Donations and shameless self-advertisement](#donations)
- [Installation](#installation)
  - [Loader](#loader)
  - [Engines](#engines)
- [Usage](#usage)
- [Configuration](#configuration)
- [Caveats & FAQ](#caveats-faq)
- [Contributing](#contributing)
- [License](#license)

## <a name="roadmap"></a> Roadmap

Features we'd like to implement, by most-wanted order.

- [ ] [Add PNG to supported formats](https://github.com/dreamonkey/responsive-image-loader/issues/16)
- [ ] [Support background-images](https://github.com/dreamonkey/responsive-image-loader/issues/12)
- [ ] [Define defaults for arbitrary groups of images](https://github.com/dreamonkey/responsive-image-loader/issues/10)
- [ ] [Support values in pixels for `size` option](https://github.com/dreamonkey/responsive-image-loader/issues/13)
- [ ] [Write more granular unit tests](https://github.com/dreamonkey/responsive-image-loader/issues/17)
- [ ] [Add TSDocs to public methods](https://github.com/dreamonkey/responsive-image-loader/issues/18)
- [ ] [Support Cloudinary adapter for converter, transformer and resizer](https://github.com/dreamonkey/responsive-image-loader/issues/15)
- [ ] [Support video conversion and processing](https://github.com/dreamonkey/responsive-image-loader/issues/11)
- [ ] [Test with HMR](https://github.com/dreamonkey/responsive-image-loader/issues/14)
- [ ] [Pass-through custom configuration to underlying engines](https://github.com/dreamonkey/responsive-image-loader/issues/19)

## <span id="donations"></span> Donations and shameless self-advertisement

[Dreamonkey](https://dreamonkey.com/) is a software house based in Reggio Emilia, Italy.
We release packages as open-source when we feel they could benefit the entire community, nontheless we spend a considerabile amount of time studying, coding, maintaining and enhancing them.

Does your business or personal projects depend on our packages? Consider donating here on Github to help us maintain them and allow us to create new ones!

Do you need a UX and quality driven team to work on your project? Get in touch with us through our [incredibly elaborate quotation request page](https://dreamonkey.com/en/contacts/request-quotation) or our [much less cool contact form](https://dreamonkey.com/en/contacts/contact-us) and let's find out if we are the right choice for you!

## <span id="installation"></span> Installation

Install via `yarn add @dreamonkey/responsive-image-loader` or `npm install --save @dreamonkey/responsive-image-loader`.

### <span id="loader"></span> Loader

#### Normal usage

Add the loader into your webpack rules targetting `.html` files.

```javascript
webpackConf.module.rules.push({
  test: /\.html$/,
  loader: 'responsive-image-loader',
  options: {
    /* ... */
  },
});
```

#### On Quasar framework

Presumely due to some kind of incompatibility with [theirs HTML loader](https://github.com/quasarframework/quasar/issues/5383#issuecomment-560510363), you must tap into low level Vue template to use this loader with [Quasar framework](https://quasar.dev/) (on which it has been tested and developed).

```javascript
webpackConf.module.rules.push({
  test: /\.vue$/,
  resourceQuery: /type=template/,
  loader: 'responsive-image-loader',
  options: {
    /* ... */
  },
});
```

It is not possible to specify only `test: /\.vue$/` because Vue templates are actually [processed many times](https://github.com/vuejs/vue-loader/issues/1164#issuecomment-370947737) (one for general file plus one per each used tag) and this would break the loader workflow.
A caching mechanism (as suggested by Vue creator in this cases) won't work efficiently and will break framework-agnosticism.

### <span id="engines"></span> Engines

Conversion, art direction and resolution switching are powered via an adapter by a fully decoupled and swappable engine.
Every engine has its installation guide (independent from this loader) and you can also provide your custom adapter to support a new engine (in which case, we welcome PRs!)

#### [`sharp`](https://github.com/lovell/sharp) (conversion | resolution switching)

Everything should "Just Work™" out-of-the-box. It's installed by default when adding the loader dependency, but check for [`libvips` dependency](https://sharp.pixelplumbing.com/en/stable/install/#libvips) if something doesn't work properly. If you get build errors at the first run, try deleting and re-installing the whole `node_modules` folder.

#### [`thumbor`](https://github.com/thumbor/thumbor) (art direction)

Installation is currently a pain in the ass and docs are out-of-sync, but it's still the best open source tool for art-direction out in the wild right now. You can check [here](https://github.com/thumbor/thumbor/issues/1221#issuecomment-550424664) how I managed to make it work.

**Thumbor adapter is currently the most messed up adapter and only works under Linux.**
It ships with a preset configuration, but you can overwrite string config options [via environment variables](https://thumbor.readthedocs.io/en/latest/configuration.html#override-config-through-environment-variable).

We also didn't found an elegant solution to abstract most of the transformation adapter code into common code and to start `thumbor` instance just once per build process, so if you can think of a solution for this which **is self contained and doesn't require external configuration**, we'd like to get in touch with you.

That's a lot of limitations, we know, any help with this part of the loader (and support for an equivalent software, even if paid and closed source) will be greatly appreciated.

## <span id="usage"></span> Usage

Add `responsive` attribute over an `<img>` component and it will be enhanced with conversion and resolution switching!

```html
<img src="my-little-calogero.jpg" responsive />
```

You can opt-in to art direction adding `responsive-ad` attribute. You can also provide an encoded inline transformation as the attribute value which will be merged on top of [default transformations](#default-transformations). \
This allow to overwrite size or ratio of an existing transformation on a single image.

Adding a `responsive-ad-ignore` attribute without value will disable all default transformations, while providing a pipe-separated list of transformation names will disable only the selected ones.

Notice that you can use both a viewport width or an [alias](#aliases) to reference a transformation in the value of both attributes.

```html
<!-- Opt-in to art direction -->
<img src="my-little-nicola.jpg" responsive responsive-ad />
<!--
  Define inline transformations:
  - the first uses a viewport width as name and explicitly define `ratio` and `size`.
  - the second uses an alias as name and define a custom image
    (it will be used "as-is"); `size` has not been specified and
    will be inferred from the default size.
-->
<img
  src="my-little-francisco.jpg"
  responsive
  responsive-ad="699_(ratio=3:2,size=1.0);md_(path=./custom_example.jpg)"
/>
<!--
  Ignore all default transformations and only apply the one specified.
  `ratio` has not been specified and will be inferred from the default ratio.
-->
<img
  src="my-little-kappa.jpg"
  responsive
  responsive-ad-ignore
  responsive-ad="1023_(size=0.5)"
/>
<!-- Ignore only 'xs' and '1500' transformations, apply all other default ones -->
<img
  src="my-little-cuenta.jpg"
  responsive
  responsive-ad-ignore="xs|1500"
  responsive-ad
/>
```

## <span id="configuration"></span> Configuration

You can check out the default configuration [here](defaults.ts).

```typescript
// Full configuration, you won't ever need all this options
const fullOptionsExample: ResponsiveImageLoaderConfig = {
  conversion: {
    converter: 'sharp',
    enabledFormats: {
      webp: true,
      jpeg: true,
    },
  },
  resolutionSwitching: {
    resizer: 'sharp',
    breakpoints: {
      minViewport: 200,
      maxViewport: 3840,
      maxSteps: 5,
      minStepSize: 35,
    },
  },
  artDirection: {
    transformer: 'thumbor',
    aliases: {
      xs: '699', // 0-699
      md: '1439', // 700-1439
    },
    defaults: {
      ratio: 'original',
      size: 1.0,
      transformations: {
        xs: { ratio: '4:3' },
        md: { ratio: '2:3', size: 0.5 },
      },
    },
  },
};

// Example of a typical configuration
const options: DeepPartial<ResponsiveImageLoaderConfig> = {
  artDirection: {
    transformer: 'thumbor',
    aliases: {
      xs: '699', // 0-699
      sm: '1023', // 700-1023
      md: '1439', // 1201-1439
      lg: '1919', // 1440-1919
      xl: '3400', // 1920-3400
    },
    defaults: {
      transformations: {
        xs: { ratio: '4:3' },
        sm: { ratio: '2:1' },
        md: { ratio: '2:3', size: 0.5 },
        lg: { ratio: '16:9', size: 0.5 },
        xl: { ratio: '21:9', size: 0.5 },
      },
    },
  },
};
```

### <span id="conversion"></span> Conversion

#### `converter` (default: 'sharp')

Specify the adapter function to use for image format conversion.
You can provide the name of a preset adapter (only `sharp` for now) **after you [installed it](#engines) properly on your system**.
Providing `null` disables conversion.

**The adapter cannot be a lambda function, or it won't inherit the loader context**

```typescript
// Disables conversion
const opt = { converter: null };

// Provide custom adapter, **never use a lambda function**
const opt = {
  converter: function(sourcePath, destinationPath, uriWithoutHash, format) {
    /**/
    return breakpoint;
  },
};

// Provide custom adapter defined elsewere, **never use a lambda function**
const conversionAdapter: ConversionAdapter = function(
  sourcePath,
  destinationPath,
  uriWithoutHash,
  format,
) {
  /**/
  return breakpoint;
};
const opt = { converter: conversionAdapter };
```

#### `enabledFormats` (default: jpeg and webp enabled)

Keys of this object represents available formats (`jpeg` or `webp`), while their value represent their enabled status.

```typescript
// Only serve webp formats
const opt = { enabledFormats: { webp: true, jpeg: false } };
```

Source will be ordered by format efficiency: `webp` > `jpeg`

### <span id="resolution-switching"></span> Resolution switching

Breakpoints generation adds as many breakpoints as possible into narrow viewports (smartphones), which suffer high bundle sizes the most (eg. when using data network); it also grants some breakpoints to wider viewports (laptops, desktops), where is less critical to save bandwidth.
If narrow viewports need less breakpoints than originally allocated for them, those breakpoints are re-allocated to wider viewports and removed when they cannot be used in the widest viewport available.

#### `resizer` (default: 'sharp')

Specify the adapter to use for image resizing.
You can provide the name of a preset adapter (only `sharp` for now) **after you [installed it](#engines) properly on your system**.
Providing `null` disables resolution switching.

**The adapter cannot be a lambda function, or it won't inherit the loader context**

```typescript
// Disables resolution switching
const opt = { resizer: null };

// Provide custom adapter, **never use a lambda function**
const opt = {
  resizer: function(sourcePath, destinationPath, breakpointWidth) {
    /**/
    return breakpoint;
  },
};

// Provide custom adapter defined elsewere, **never use a lambda function**
const resizingAdapter: ResizingAdapter = function(
  sourcePath,
  destinationPath,
  breakpointWidth,
) {
  /**/
  return breakpoint;
};
const opt = { resizer: resizingAdapter };
```

#### `minViewport` (default: 200)

The minimum viewport which will be considered when automatically generating breakpoints.

#### `maxViewport` (default: 3840)

The maximum viewport which will be considered when automatically generating breakpoints.

#### `maxBreakpointsCount` (default: 5)

Maximum number of breakpoints which can be generated, the actual count can be lower due to `minSizeDifference` option.
It doesn't include breakpoints generated by art direction transformations.

#### `minSizeDifference` (default: 35)

Minimum size difference (expressed in KB) there should be between a breakpoint and both its preceding and following ones.

### <span id="art-direction"></span> Art direction

#### `transformer` (default: null)

Specify the adapter to use for image transformations.
You can provide the name of a preset adapter (only `thumbor` for now) **after you [installed it](#engines) properly on your system**.
Providing `null` disables art direction.

**The adapter cannot be a lambda function, or it won't inherit the loader context**

```typescript
// Disables art direction
const opt = { transformer: null };

// Provide custom adapter, **never use a lambda function**
const opt = {
  transformer: function(imagePath, transformations) {
    /**/
    return transformationSource;
  },
};

// Provide custom adapter defined elsewere, **never use a lambda function**
const transformationAdapter: TransformationAdapter = function(
  imagePath,
  transformations,
) {
  /**/
  return transformationSource;
};
const opt = { transformer: transformationAdapter };
```

#### `aliases` (default: {})

Maps of aliases to viewport widths which can be used when referencing a transformation.

```typescript
const opts = {
  aliases: {
    xs: '699', // 0-699
    sm: '1023', // 700-1023
    md: '1439', // 1201-1439
    lg: '1919', // 1440-1919
    xl: '3400', // 1920-3400
  },
};
```

#### `defaultRatio` (default: 'original');

The ratio which will be used when applying transformations, if not explicitly provided.

#### `defaultSize` (default: 1.0);

The width size multiplier which will be used when applying transformations, if not explicitly provided.
It should be a percentage number greater than `0.10` and lesser or equal to `1.00`.
Value is capped to `0.10` on lower bound and `1.00` on upper bound.

#### `defaultTransformations` (default: {});

Map of default transformations.

```typescript
const opts = {
  defaultTransformations: {
    xs: { ratio: '4:3' },
    sm: { ratio: '2:1' },
    md: { ratio: '2:3', size: 0.5 },
    lg: { ratio: '16:9', size: 0.5 },
    xl: { ratio: '21:9', size: 0.5 },
  },
};
```

## <span id="caveats-faq"></span> Caveats & FAQ

### Does it work in every possible scenario?

**NO!**
Being a webpack loader, it has limits derived by being a build-time tool: it will only work for images statically referenced in your code.
If you are dynamically changing your `<img>` `src` attribute, this loader cannot help you. If you are doing so with a JS framework via dynamic bindings (Vue `:src="..."`, Angular `[src]="..."`, etc), changing your component to use slots instead could help you and make your components more flexible.

### Only use in production

The compilation time overhead of this loader is high, due to image processing. It is not advisable to use it during development unless you have a really valid motivation to do so. You'll probably want to apply it conditionally to your webpack chain only when compiling for production.

```javascript
if (process.env.NODE_ENV === "production") {
    webpackConfig.module.rules.push({ ... });
}
```

### What's up with all those hard-coded paths?

Currently the loader is meant to work with Quasar framework file structure and because of this some paths are hard-coded. Our plan is to abstract and make them configurable before the stable version is released.

Currently hard-coded paths are:

- source images path are resolved relatively to `/src` folder
- emitted images are expected to be emitted into a `/img` folder inside webpack output folder (usually `dist/<something>/`)
- temporary folder is assumed to be `/dist/temp`
- log file (only used during development) is assumed to be `/dist/temp/log.txt`
- converted image temporary folder is assumed to be `/dist/temp/images`

### Pay attention to CSS selectors

`<img>` will be wrapped into a `<picture>` when the loader kicks in.
If you have to reference via selectors (both via JS or CSS), you must take this structure change into account. Use a class to reference the image in your selectors and avoid direct-descendent selector.

```html
<div class="container">
  <img responsive class="my-image" src="something.jpg" />
</div>
```

will become

```html
<div class="container">
  <picture>
    <source />
    <source />
    <!-- ... -->
    <img responsive class="my-image" src="something.jpg" />
  </picture>
</div>
```

So the selector should take into accout both structures, depending on the context

```css
/* Should access direct child, whoever it is (eg. positioning or spacing) */
.container > img,
.container > picture {
  /* ... */
}

/* Should access original image tag */
.container > img,
.container > picture > img {
  /* ... */
}

/* Or */
.container img {
  /* ... */
}

/* Or (preferred) */
.container .my-image {
  /* ... */
}
```

### How do I enable/disable conversion and/or resolution switching?

Conversion and resolution-switching are enabled by default.
If you want to disable them globally, set `conversion.converter` and/or `resolutionSwitching.resizer` to `null` into the loader options.
Currently there is no way to disable them on a per-image basis.

### Which default value should I use for `size`?

`defaultSize`, which is an option of art direction configuration, will be used also for resolution switching in some particular edge cases which need a fallback image:

- if a breakpoint is generated after the last art direction source;
- if there are no art direction sources at all.

Because of this, you should set `defaultSize` to be the one of the image on the biggest screen possible.

Example: if the image occupies 100% of the viewport width on the maximum supported width of my website, default `size` will be `1.0`. If it occupies 50%, default `size` will be `0.5`.

### Why doesn't the loader kick in on my images?

The loader won't process the image if `responsive` attribute is missing and if `src` attribute is missing or empty. Also, art direction won't take place if `responsive-ad` is missing.

## <span id="contributing"></span> Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## <span id="security"></span> Security

If you discover any security related issues, please email security@dreamonkey.com instead of using the issue tracker.

## <span id="license"></span> License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
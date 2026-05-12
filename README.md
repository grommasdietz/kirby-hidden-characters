# Kirby Hidden Characters

[Kirby CMS](https://getkirby.com) plugin to visually show hidden characters like spaces, soft hyphens, tabs, line breaks, or paragraph endings in focused [writer](https://getkirby.com/docs/reference/panel/fields/writer), [textarea](https://getkirby.com/docs/reference/panel/fields/textarea), and [text fields](https://getkirby.com/docs/reference/panel/fields/text). The dimmed visual feedback is inspired by Adobe InDesign's hidden-characters mode, providing a familiar experience for content editors.

![Cover image showing an example of the plugin in use](/.github/assets/hero-image.png)

---

## Legend

The plugin visualizes the following characters using a custom icon font:

| Name                          | Unicode  |                                                                                             Character                                                                                             | Description                                               |
| :---------------------------- | :------- | :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------- |
| **Space**                     | `U+0020` |                     ![Space](/.github/assets/characters/dark/gd-hc-space.svg#gh-dark-mode-only) ![Space](/.github/assets/characters/light/gd-hc-space.svg#gh-light-mode-only)                     | Centered dot                                              |
| **No-Break Space**            | `U+00A0` |               ![No break](/.github/assets/characters/dark/gd-hc-no_break.svg#gh-dark-mode-only) ![No break](/.github/assets/characters/light/gd-hc-no_break.svg#gh-light-mode-only)               | Centered dot with inverted chevron below                  |
| **Narrow No-Break Space**     | `U+202F` | ![Narrow no break](/.github/assets/characters/dark/gd-hc-narrow_no_break.svg#gh-dark-mode-only) ![Narrow no break](/.github/assets/characters/light/gd-hc-narrow_no_break.svg#gh-light-mode-only) | Centered dot with inverted chevron above                  |
| **Hair Space**                | `U+200A` |                       ![Hair](/.github/assets/characters/dark/gd-hc-hair.svg#gh-dark-mode-only) ![Hair](/.github/assets/characters/light/gd-hc-hair.svg#gh-light-mode-only)                       | Centered dot with two small dots above                    |
| **Six-Per-Em Space**          | `U+2006` |                         ![Six](/.github/assets/characters/dark/gd-hc-six.svg#gh-dark-mode-only) ![Six](/.github/assets/characters/light/gd-hc-six.svg#gh-light-mode-only)                         | Centered dot with same-sized dot below                    |
| **Thin Space**                | `U+2009` |                       ![Thin](/.github/assets/characters/dark/gd-hc-thin.svg#gh-dark-mode-only) ![Thin](/.github/assets/characters/light/gd-hc-thin.svg#gh-light-mode-only)                       | Centered dot with chevron above                           |
| **Medium Mathematical Space** | `U+205F` |                       ![Math](/.github/assets/characters/dark/gd-hc-math.svg#gh-dark-mode-only) ![Math](/.github/assets/characters/light/gd-hc-math.svg#gh-light-mode-only)                       | Centered dot with negation sign above                     |
| **Four-Per-Em Space**         | `U+2005` |                       ![Four](/.github/assets/characters/dark/gd-hc-four.svg#gh-dark-mode-only) ![Four](/.github/assets/characters/light/gd-hc-four.svg#gh-light-mode-only)                       | Centered dot with large dot below                         |
| **Three-Per-Em Space**        | `U+2004` |                     ![Three](/.github/assets/characters/dark/gd-hc-three.svg#gh-dark-mode-only) ![Three](/.github/assets/characters/light/gd-hc-three.svg#gh-light-mode-only)                     | Centered dot with large dot above                         |
| **Punctuation Space**         | `U+2008` |         ![Punctuation](/.github/assets/characters/dark/gd-hc-punctuation.svg#gh-dark-mode-only) ![Punctuation](/.github/assets/characters/light/gd-hc-punctuation.svg#gh-light-mode-only)         | Centered dot with dot below and vertical stroke above     |
| **Figure Space**              | `U+2007` |                   ![Figure](/.github/assets/characters/dark/gd-hc-figure.svg#gh-dark-mode-only) ![Figure](/.github/assets/characters/light/gd-hc-figure.svg#gh-light-mode-only)                   | Centered dot inside number sign                           |
| **En Space**                  | `U+2002` |                           ![En](/.github/assets/characters/dark/gd-hc-en.svg#gh-dark-mode-only) ![En](/.github/assets/characters/light/gd-hc-en.svg#gh-light-mode-only)                           | Centered dot with en dash below                           |
| **Em Space**                  | `U+2003` |                           ![Em](/.github/assets/characters/dark/gd-hc-em.svg#gh-dark-mode-only) ![Em](/.github/assets/characters/light/gd-hc-em.svg#gh-light-mode-only)                           | Centered dot with em dash below                           |
| **Tab**                       | `U+0009` |                   ![Tab](/.github/assets/characters/dark/gd-hc-tabulator.svg#gh-dark-mode-only) ![Tab](/.github/assets/characters/light/gd-hc-tabulator.svg#gh-light-mode-only)                   | Two rightward arrows spanning the tab stop width[^text-only] |
| **Zero-Width Space**          | `U+200B` |           ![Zero width](/.github/assets/characters/dark/gd-hc-zero_width.svg#gh-dark-mode-only) ![Zero width](/.github/assets/characters/light/gd-hc-zero_width.svg#gh-light-mode-only)           | Dashed vertical stroke                                    |
| **Soft Hyphen**               | `U+00AD` |         ![Soft hyphen](/.github/assets/characters/dark/gd-hc-soft_hyphen.svg#gh-dark-mode-only) ![Soft hyphen](/.github/assets/characters/light/gd-hc-soft_hyphen.svg#gh-light-mode-only)         | Vertical stroke indicating possible hyphenation[^text-only] |
| **Line Break**                | `U+000A` |                     ![Break](/.github/assets/characters/dark/gd-hc-break.svg#gh-dark-mode-only) ![Break](/.github/assets/characters/light/gd-hc-break.svg#gh-light-mode-only)                     | Negation sign representing hard line break[^text-only]    |
| **Paragraph End**             |          |             ![Paragraph](/.github/assets/characters/dark/gd-hc-paragraph.svg#gh-dark-mode-only) ![Paragraph](/.github/assets/characters/light/gd-hc-paragraph.svg#gh-light-mode-only)             | Pilcrow sign representing the end of a paragraph          |
| **Story End**                 |          |     ![Paragraph end](/.github/assets/characters/dark/gd-hc-paragraph_end.svg#gh-dark-mode-only) ![Paragraph end](/.github/assets/characters/light/gd-hc-paragraph_end.svg#gh-light-mode-only)     | Number sign representing the end of the entire text block |

[^text-only]: Only rendered in `writer` and `textarea`. Single-line `<input>` elements don't support line breaks, collapse tabs to spaces, and never create hyphenation opportunities for soft hyphens.

---

## Requirements

- Kirby 5+
- PHP 8.2+

---

## Installation

You can install the plugin via one of three methods:

1. ### Download

   Download and copy this repository to `site/plugins/kirby-hidden-characters`.

2. ### Git Submodule

   ```shell
   git submodule add https://github.com/grommasdietz/kirby-hidden-characters.git site/plugins/kirby-hidden-characters
   ```

3. ### Composer

   ```shell
   composer require grommasdietz/kirby-hidden-characters
   ```

---

## Quickstart

This plugin works out of the box with no configuration required.

### Configuration

Developers building Panel plugins can register additional field components as overlay targets or customize the overlay element before insertion via the JavaScript extension API. See [Extension API](docs/usage/architecture.md#extension-api) for details.

### Documentation

Full reference for [usage](docs/usage/index.md), [contributions](docs/contributions/index.md) and [maintenance](docs/maintenance/index.md) lives in [documentation](docs/index.md).

---

## Credits

The overlaying logic is adapted from [Kirby Soft Hyphens](https://github.com/hansipete/kirby-soft-hyphens) plugin by [@hansipete](https://github.com/hansipete). Thank you!

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.

---

## Security

See [SECURITY.md](SECURITY.md) for security policies and reporting vulnerabilities.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidance and expectations.

---

## License

[MIT](LICENSE.md) © 2024 Grommas Dietz

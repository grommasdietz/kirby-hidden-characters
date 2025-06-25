# Kirby Hidden Characters

[Kirby](https://getkirby.com) plugin to visually show hidden characters like spaces, soft hyphens, line breaks or paragraph endings in focused [writer](https://getkirby.com/docs/reference/panel/fields/writer), [textarea](https://getkirby.com/docs/reference/panel/fields/textarea) and [text](https://getkirby.com/docs/reference/panel/fields/text) fields. The dimmed visual feedback is based on the appearance of Adobe’s solution in InDesign, providing a familiar experience for content editors.

![Cover image showing an example of the plugin in use](https://github.com/user-attachments/assets/27f553c1-e827-44e5-b538-7ba3a2a82b0d)

## Legend

The plugin visualizes the following characters using a custom icon font:

| ­                             | Character | Symbol                                                    |
| :---------------------------- | :-------: | :-------------------------------------------------------- |
| **Space**                     |    `·`    | Centered dot for a regular space                          |
| **No-Break Space**            | `[NBSP]`  | Centered dot with an inverted chevron below               |
| **Em Space**                  |  `[EM]`   | Centered dot with an em dash below                        |
| **En Space**                  |  `[EN]`   | Centered dot with an en dash below                        |
| **Three-Per-Em Space**        | `[3/EM]`  | Centered dot with a larger dot above                      |
| **Four-Per-Em Space**         | `[4/EM]`  | Centered dot with a larger dot below                      |
| **Six-Per-Em Space**          | `[6/EM]`  | Centered dot with a same-sized dot below                  |
| **Thin Space**                | `[Thin]`  | Centered dot with a chevron above                         |
| **Narrow No-Break Space**     | `[NNBP]`  | Centered dot with a chevron above                         |
| **Hair Space**                | `[Hair]`  | Centered dot with two small dots above                    |
| **Punctuation Space**         | `[Punc.]` | Centered dot with a dot below and vertical stroke above   |
| **Figure Space**              | `[Fig.]`  | Centered dot inside a number sign                         |
| **Medium Mathematical Space** | `[Fig.]`  | Centered dot with negation sign above                     |
| **Zero-Width Space**          | `[ZWSP]`  | Dashed vertical stroke                                    |
| **Soft Hyphen**               |    `I`    | Vertical stroke indicating a possible hyphenation         |
| **Line Break**                |    `¬`    | Negation sign representing a hard line break              |
| **Paragraph End**             |    `¶`    | Pilcrow sign representing the end of a paragraph          |
| **Story End**                 |    `#`    | Number sign representing the end of the entire text block |

## Requirements

- Kirby 4+

## Installation

You can install the plugin via one of three methods:

### 1. Download

Download and copy this repository to `/site/plugins/kirby-hidden-characters`

### 2. Git Submodule

```bash
git submodule add https://github.com/grommasdietz/kirby-hidden-characters.git site/plugins/kirby-hidden-characters
```

### 3. Composer

```bash
composer require grommasdietz/kirby-hidden-characters
```

## Configuration

This plugin works out of the box with no configuration required

## Credits

- The foundational logic for this plugin is adapted from the [Kirby Soft Hyphens](https://github.com/hansipete/kirby-soft-hyphens) plugin by [**@hansipete**](https://github.com/hansipete). Thank you!

## License

MIT

# Kirby Hidden Characters

[Kirby](https://getkirby.com) plugin to visually show hidden characters like spaces, soft hyphens, line breaks or paragraph endings in focused [writer](https://getkirby.com/docs/reference/panel/fields/writer), [textarea](https://getkirby.com/docs/reference/panel/fields/textarea) and [text fields](https://getkirby.com/docs/reference/panel/fields/text). The dimmed visual feedback is based on the appearance of Adobe’s solution in InDesign, providing a familiar experience for content editors.

![Cover image showing an example of the plugin in use](https://github.com/user-attachments/assets/ca199c35-84ab-42de-823c-527bafd4c8b3)

## Legend

The plugin visualizes the following characters using a custom icon font:

| ­                             |                                                 Character                                                 | Symbol                                                    |
| :---------------------------- | :-------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------- |
| **Space**                     |      ![gd-hc-space](https://github.com/user-attachments/assets/942452b8-4252-499c-a1b9-07ebb5458792)      | Centered dot for a regular space                          |
| **Thin Space**                |      ![gd-hc-thin](https://github.com/user-attachments/assets/3d86f0a6-c682-40c7-8b54-0f28cc8d1536)       | Centered dot with a chevron above                         |
| **No-Break Space**            |    ![gd-hc-no_break](https://github.com/user-attachments/assets/c60861c0-919e-4c2b-8c99-a973cd9d5d62)     | Centered dot with an inverted chevron below               |
| **Narrow No-Break Space**     | ![gd-hc-narrow_no_break](https://github.com/user-attachments/assets/6d735304-8433-40d1-9a82-37c9efa48dd0) | Centered dot with a inverted chevron above                |
| **Em Space**                  |       ![gd-hc-em](https://github.com/user-attachments/assets/4a822154-d770-4dc7-af53-d14272a12805)        | Centered dot with an em dash below                        |
| **En Space**                  |       ![gd-hc-en](https://github.com/user-attachments/assets/54f896e0-8777-4d2c-9bf0-9db4bcd08167)        | Centered dot with an en dash below                        |
| **Three-Per-Em Space**        |      ![gd-hc-three](https://github.com/user-attachments/assets/5215050d-428a-41db-b710-36b9f6e3ed15)      | Centered dot with a large dot above                       |
| **Four-Per-Em Space**         |      ![gd-hc-four](https://github.com/user-attachments/assets/66c7d1af-c648-4dfb-84df-98f81d121a00)       | Centered dot with a large dot below                       |
| **Six-Per-Em Space**          |       ![gd-hc-six](https://github.com/user-attachments/assets/f94622b2-3c93-48de-b3ba-5dd0fa8736f8)       | Centered dot with a same-sized dot below                  |
| **Hair Space**                |      ![gd-hc-hair](https://github.com/user-attachments/assets/45d960a4-a140-466c-8b21-5d8c52b93201)       | Centered dot with two small dots above                    |
| **Punctuation Space**         |   ![gd-hc-punctuation](https://github.com/user-attachments/assets/25eb3b07-dd63-492c-a604-527456298d0b)   | Centered dot with a dot below and vertical stroke above   |
| **Figure Space**              |     ![gd-hc-figure](https://github.com/user-attachments/assets/4772ae82-ff99-4678-8897-8befa6ed94e2)      | Centered dot inside a number sign                         |
| **Medium Mathematical Space** |      ![gd-hc-math](https://github.com/user-attachments/assets/f4eceba8-2daf-400b-867d-feb1dbe84a47)       | Centered dot with negation sign above                     |
| **Zero-Width Space**          |   ![gd-hc-zero_width](https://github.com/user-attachments/assets/797b56b8-f03a-4a2e-8995-8bf915e93b65)    | Dashed vertical stroke                                    |
| **Soft Hyphen**               |   ![gd-hc-soft_hyphen](https://github.com/user-attachments/assets/0b137996-c22e-4eeb-b38f-a133d4254f4a)   | Vertical stroke indicating a possible hyphenation         |
| **Line Break**                |      ![gd-hc-break](https://github.com/user-attachments/assets/04e2b4df-4fdb-489e-ad1e-e2e17e6c8262)      | Negation sign representing a hard line break              |
| **Paragraph End**             |    ![gd-hc-paragraph](https://github.com/user-attachments/assets/6c3b5eb2-0eb9-40b7-bdc9-ce1856bce708)    | Pilcrow sign representing the end of a paragraph          |
| **Story End**                 |  ![gd-hc-paragraph_end](https://github.com/user-attachments/assets/08abfd9d-e68e-471d-8cc8-5e4229733156)  | Number sign representing the end of the entire text block |

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

The foundational logic for v2 of this plugin is adapted from the [Kirby Soft Hyphens](https://github.com/hansipete/kirby-soft-hyphens) plugin by [@hansipete](https://github.com/hansipete). Thank you!

## License

MIT

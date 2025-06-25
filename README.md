# Kirby Hidden Characters

[Kirby](https://getkirby.com) plugin to visually show hidden characters like spaces, soft hyphens, line breaks or paragraph endings in focused [writer](https://getkirby.com/docs/reference/panel/fields/writer), [textarea](https://getkirby.com/docs/reference/panel/fields/textarea) and [text fields](https://getkirby.com/docs/reference/panel/fields/text). The dimmed visual feedback is based on the appearance of Adobe’s solution in InDesign, providing a familiar experience for content editors.

![Cover image showing an example of the plugin in use](https://github.com/user-attachments/assets/ca199c35-84ab-42de-823c-527bafd4c8b3)

## Legend

The plugin visualizes the following characters using a custom icon font:

| Name                          | Unicode  |                                                                                                                  Character                                                                                                                   | Description                                               |
| :---------------------------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------- |
| **Space**                     | `U+0020` |           ![Space](https://github.com/user-attachments/assets/5c5a9a90-9c5f-4512-b898-8d3793b8a366#gh-dark-mode-only) ![Space](https://github.com/user-attachments/assets/0919b526-44a2-4fe8-9592-55187e0fddb3#gh-light-mode-only)           | Centered dot                                              |
| **Thin Space**                | `U+2009` |            ![Thin](https://github.com/user-attachments/assets/1b00d283-32fe-4a7d-ada7-2701109afaad#gh-dark-mode-only) ![Thin](https://github.com/user-attachments/assets/1cd06136-ccff-4b7c-96e4-4094c989a26d#gh-light-mode-only)            | Centered dot with chevron above                           |
| **No-Break Space**            | `U+00A0` |        ![No break](https://github.com/user-attachments/assets/23a5a710-f26d-4dd7-950e-dfca4cb6c011#gh-dark-mode-only) ![No break](https://github.com/user-attachments/assets/842745af-20a8-4654-a5ba-a97e1bb38f1d#gh-light-mode-only)        | Centered dot with inverted chevron below                  |
| **Narrow No-Break Space**     | `U+202F` | ![Narrow no break](https://github.com/user-attachments/assets/cdae2d39-5a94-409c-ab74-60eadcfa018f#gh-dark-mode-only) ![Narrow no break](https://github.com/user-attachments/assets/799bb3ef-12cb-4acc-a66a-d70e186cc851#gh-light-mode-only) | Centered dot with inverted chevron above                  |
| **Em Space**                  | `U+2003` |              ![Em](https://github.com/user-attachments/assets/fa0b93d0-7b00-42c1-9aab-b0f85b35a2b6#gh-dark-mode-only) ![Em](https://github.com/user-attachments/assets/83e84fe6-db46-4905-8ce5-b9177569263b#gh-light-mode-only)              | Centered dot with em dash below                           |
| **En Space**                  | `U+2002` |              ![En](https://github.com/user-attachments/assets/71ae4ac3-a8c3-43e4-913f-fe25b4689954#gh-dark-mode-only) ![En](https://github.com/user-attachments/assets/595c688a-4697-4e04-8fab-62e2fa8111ac#gh-light-mode-only)              | Centered dot with en dash below                           |
| **Three-Per-Em Space**        | `U+2004` |           ![Three](https://github.com/user-attachments/assets/1d10cc84-7211-4db3-bce8-51e976faa9fc#gh-dark-mode-only) ![Three](https://github.com/user-attachments/assets/4e81dce7-0263-437d-9b9a-a28084f3a8b5#gh-light-mode-only)           | Centered dot with large dot above                         |
| **Four-Per-Em Space**         | `U+2005` |            ![Four](https://github.com/user-attachments/assets/de9e51af-ad60-4d3b-af12-0930cf0c238c#gh-dark-mode-only) ![Four](https://github.com/user-attachments/assets/f694b27d-6713-4a72-81b7-bedaa265d540#gh-light-mode-only)            | Centered dot with large dot below                         |
| **Six-Per-Em Space**          | `U+2006` |             ![Six](https://github.com/user-attachments/assets/3a210d5f-0f6a-4a84-aee6-bfa90062075f#gh-dark-mode-only) ![Six](https://github.com/user-attachments/assets/3bd9778d-4782-4784-a02e-dc09510b3109#gh-light-mode-only)             | Centered dot with same-sized dot below                    |
| **Hair Space**                | `U+200A` |            ![Hair](https://github.com/user-attachments/assets/747e459c-9cd7-43ec-8de7-e05d49e316df#gh-dark-mode-only) ![Hair](https://github.com/user-attachments/assets/d461def3-e127-42cd-a823-a99ddc7ee17a#gh-light-mode-only)            | Centered dot with two small dots above                    |
| **Punctuation Space**         | `U+2008` |     ![Punctuation](https://github.com/user-attachments/assets/c93a420c-0eb7-4a10-8948-6289c709a2e2#gh-dark-mode-only) ![Punctuation](https://github.com/user-attachments/assets/77b73f0b-8da7-4b39-9fd2-0956fb226c16#gh-light-mode-only)     | Centered dot with dot below and vertical stroke above     |
| **Figure Space**              | `U+2007` |          ![Figure](https://github.com/user-attachments/assets/8f0ab3e2-ee8d-42a7-b4af-87b16ceb144d#gh-dark-mode-only) ![Figure](https://github.com/user-attachments/assets/130f4c22-ea3e-42fa-93cc-a13b479ad192#gh-light-mode-only)          | Centered dot inside number sign                           |
| **Medium Mathematical Space** | `U+205F` |            ![Math](https://github.com/user-attachments/assets/e58586aa-6624-4cdb-9a68-f8cfa98fcec2#gh-dark-mode-only) ![Math](https://github.com/user-attachments/assets/f371c14b-64a9-4c85-9700-9b28db126b87#gh-light-mode-only)            | Centered dot with negation sign above                     |
| **Zero-Width Space**          | `U+200B` |      ![Zero width](https://github.com/user-attachments/assets/2c406f79-8422-46e1-b508-ead69505f4ac#gh-dark-mode-only) ![Zero width](https://github.com/user-attachments/assets/dc38e47c-e048-4a2f-b979-ef298f1b72a0#gh-light-mode-only)      | Dashed vertical stroke                                    |
| **Soft Hyphen**               | `U+00AD` |     ![Soft hyphen](https://github.com/user-attachments/assets/8d489b3e-93bd-4e91-989b-51f50134a9f3#gh-dark-mode-only) ![Soft hyphen](https://github.com/user-attachments/assets/2f1f126e-e13e-43ac-b072-d385b48ab77b#gh-light-mode-only)     | Vertical stroke indicating possible hyphenation           |
| **Line Break**                | `U+000A` |           ![Break](https://github.com/user-attachments/assets/15a1b9a9-7e5c-43d8-9a63-c2bf3363761a#gh-dark-mode-only) ![Break](https://github.com/user-attachments/assets/b0d5b495-0762-49cc-a1b9-c6935113d44e#gh-light-mode-only)           | Negation sign representing hard line break                |
| **Paragraph End**             |          |       ![Paragraph](https://github.com/user-attachments/assets/e52e3e87-cf85-4e2a-b622-5cba68f19fc6#gh-dark-mode-only) ![Paragraph](https://github.com/user-attachments/assets/928de1a4-f70f-4d6a-90b3-6d98e3dafe61#gh-light-mode-only)       | Pilcrow sign representing the end of paragraph            |
| **Story End**                 |          |   ![Paragraph end](https://github.com/user-attachments/assets/a7e26939-6763-4998-b4dc-ec2544096451#gh-dark-mode-only) ![Paragraph end](https://github.com/user-attachments/assets/4b068eaa-175a-492d-9d5d-38b15f124ca6#gh-light-mode-only)   | Number sign representing the end of the entire text block |

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

This plugin works out of the box with no configuration required

## Credits

The foundational logic for v2 of this plugin is adapted from the [Kirby Soft Hyphens](https://github.com/hansipete/kirby-soft-hyphens) plugin by [@hansipete](https://github.com/hansipete). Thank you!

## License

MIT

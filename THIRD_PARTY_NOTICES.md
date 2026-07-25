# Third-Party Notices

Rudralipi is licensed under the Apache License 2.0. Its dependencies retain
their respective licenses and copyright notices.

## Direct dependencies

| Project                     | Purpose                            | License    |
| --------------------------- | ---------------------------------- | ---------- |
| Bun                         | Workspace tooling and test runtime | MIT        |
| React                       | Optional editor view               | MIT        |
| dnd-kit                     | Accessible drag and drop           | MIT        |
| Tiptap open-source packages | Rich-text editing adapter          | MIT        |
| Floating UI                 | Tiptap floating UI peer runtime    | MIT        |
| Zustand                     | Editor session state               | MIT        |
| Zod                         | Runtime schema validation          | MIT        |
| Tailwind CSS                | Editor styling                     | MIT        |
| Day.js                      | Date and time handling             | MIT        |
| Vite                        | Application development and builds | MIT        |
| Vitest                      | Unit and integration testing       | MIT        |
| Testing Library             | Component testing                  | MIT        |
| Playwright                  | Browser and visual testing         | Apache-2.0 |
| axe-core                    | Automated accessibility checks     | MPL-2.0    |
| TypeScript                  | Type checking and compilation      | Apache-2.0 |
| ESLint                      | Static analysis                    | MIT        |
| Prettier                    | Source formatting                  | MIT        |

The exact versions are recorded in `bun.lock`. No third-party source has been
adapted or copied into Rudralipi.

Gotenberg is not bundled or linked into Rudralipi. The optional adapter talks to
a separately deployed Gotenberg service over its public HTTP API. Gotenberg is
distributed under the MIT License.

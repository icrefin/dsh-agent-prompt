# Contributing to icrefin/dsh-agent-prompt

Thanks for taking the time to contribute. This document covers the repository
**dsh-agent-prompt** owned by `icrefin`.

## Ways to contribute

- Report a bug using the *Bug report* issue form.
- Request a feature using the *Feature request* issue form.
- Improve documentation, examples, or translations.
- Send a pull request that fixes or implements something on the issue tracker.

If you plan a large change, open an issue first so we can agree on the design
before you write the implementation.

## Before you start

1. Search existing issues and pull requests to avoid duplicates.
2. Read the [Code of Conduct](CODE_OF_CONDUCT.md).
3. Check the README for supported versions and prerequisites.

## Development setup

This is a TypeScript package built with pnpm. It needs **Node >= 22.17.0** and
**pnpm 11.8.0**, the version pinned in `package.json` through `packageManager`
(`corepack enable` picks it up). The `@deepseek-ai/dsh-*` peer dependencies are
published on npm, so a clean checkout really does install.

```bash
git clone https://github.com/icrefin/dsh-agent-prompt.git
cd dsh-agent-prompt
git switch main

corepack enable
pnpm install
pnpm check          # tsc over both halves, then vitest
```

| Command | What it does |
| --- | --- |
| `pnpm typecheck` | `tsc` over the host half and, separately, over the browser half |
| `pnpm test` | `vitest run` — 25 tests in `test/files.spec.ts`, `test/routes.spec.ts` and `test/version.spec.ts` |
| `pnpm check` | `pnpm typecheck && pnpm test` — run this before opening a pull request |
| `pnpm build` | `tsc -p tsconfig.build.json` then `tsdown` (`lib/`, `lib/client.js`) |
| `pnpm pack` | `pnpm build`, then `npm pack` into `dist/` |

`lib/` and `dist/` are build products and are not committed. `pnpm check` is the
suite CI runs, so run it before opening a pull request.

## Branch and commit conventions

- Branch from `main`; keep one topic per branch (`fix/...`, `feat/...`, `docs/...`).
- Keep commits small and focused.
- Write imperative, scoped commit messages, e.g. `fix(parser): reject empty input`.
- Rebase onto the latest `main` before requesting review; avoid merge commits inside the PR branch.

## Pull requests

Every pull request must:

- Explain **what** changed and **why**.
- Link the issue it closes (`Closes #123`).
- Pass CI.
- Update documentation whenever user-facing text or behavior changes — including both
  the English and the Chinese copy in the panel's locale dictionaries.
- Contain no secrets, tokens, private keys, internal hostnames, or personal data.
- State the license of any newly added dependency and confirm it is compatible with
  this project's `MIT` license.

Use the repository's pull request template. Do not delete checklist items without
explaining why.

## Reporting bugs

A useful bug report contains:

- The version, commit SHA, or release tag of the plugin you tested.
- The DeepSeek Harness build you ran it against, and how the plugin was installed.
- Operating system and runtime version.
- The instruction file involved — the user-global `AGENTS.md`, or which workspace.
- Exact reproduction steps, expected result, and actual result.
- Logs with secrets and personal data removed.

Report security vulnerabilities privately — see [SECURITY.md](SECURITY.md). Never open
a public issue for a vulnerability.

## Coding style

- Match the style of the surrounding code; do not reformat unrelated files.
- Add or update tests for behavior changes.
- Keep public APIs documented.
- Prefer clear names over comments that restate the code.
- Do not add a dependency for something the standard library already does.
- Keep the two halves apart: `src/index.ts`, `src/routes.ts` and `src/files.ts` run on
  the host, `src/client/*` runs in the browser, and the wire contract they share lives
  in `src/protocol.ts`.
- The route tests serve the real handlers from a real loopback server and write into a
  temporary directory, never into a real `AGENTS.md`. Keep it that way.

## Review process

Maintainers review pull requests as time allows. Expect at least one round of
feedback. Address comments with follow-up commits or a rebase, then re-request review.
A pull request inactive for 60 days without response may be closed.

## License

By contributing, you agree that your contributions are licensed under the `MIT`
license of this repository. Do not paste code you cannot license under these terms.

## Questions

Open a discussion, or email the maintainer at `icrefinai@gmail.com`.

---

# 为 icrefin/dsh-agent-prompt 贡献

感谢你抽出时间参与贡献。本文适用于 `icrefin` 名下的仓库 **dsh-agent-prompt**。

## 贡献方式

- 用 *Bug report* 表单报告问题。
- 用 *Feature request* 表单提出需求。
- 改进文档、示例或翻译。
- 提交 pull request，修复或实现 issue 中的事项。

如果改动较大，请先开 issue 讨论设计，以免实现在错误的方向上白费功夫。

## 开始之前

1. 先搜索已有的 issue 和 pull request，避免重复。
2. 阅读[行为准则](CODE_OF_CONDUCT.md)。
3. 查看 README 中说明的支持版本与前置条件。

## 开发环境

本项目是用 pnpm 构建的 TypeScript 包，需要 **Node >= 22.17.0** 与
**pnpm 11.8.0**（`package.json` 的 `packageManager` 字段已固定该版本，
`corepack enable` 会自动采用）。`@deepseek-ai/dsh-*` 这些 peer 依赖已发布到 npm，
因此在干净的检出上可以直接安装。

```bash
git clone https://github.com/icrefin/dsh-agent-prompt.git
cd dsh-agent-prompt
git switch main

corepack enable
pnpm install
pnpm check          # 先 tsc 检查两侧，再跑 vitest
```

| 命令 | 作用 |
| --- | --- |
| `pnpm typecheck` | 分别对宿主侧与浏览器侧执行 `tsc` |
| `pnpm test` | `vitest run` —— `test/files.spec.ts`、`test/routes.spec.ts`、`test/version.spec.ts` 共 25 个测试 |
| `pnpm check` | `pnpm typecheck && pnpm test` —— 提 PR 前请跑这个 |
| `pnpm build` | 先 `tsc -p tsconfig.build.json`，再 `tsdown`（产物为 `lib/`、`lib/client.js`） |
| `pnpm pack` | 先 `pnpm build`，再用 `npm pack` 打包到 `dist/` |

`lib/` 与 `dist/` 是构建产物，不纳入版本库。`pnpm check` 就是 CI 跑的那套，
提 pull request 之前请先跑通。

## 分支与提交规范

- 从 `main` 拉分支，一个分支只做一件事（`fix/...`、`feat/...`、`docs/...`）。
- 提交粒度尽量小。
- 提交信息用祈使句并带范围，例如 `fix(parser): reject empty input`。
- 请求评审前先 rebase 到最新的 `main`；PR 分支内避免合并提交。

## Pull request 要求

每个 pull request 必须：

- 说明改了**什么**、**为什么**改。
- 关联对应 issue（`Closes #123`）。
- 通过 CI。
- 当用户可见文案或行为变化时更新文档，包括面板语言字典中的中文与英文文案。
- 不含任何密钥、令牌、私钥、内网主机名或个人数据。
- 说明新增依赖的许可证，并确认与本项目的 `MIT` 许可证兼容。

请使用仓库的 pull request 模板；不要在没有说明理由的情况下删除检查项。

## 报告 bug

一份有效的 bug 报告应包含：

- 你测试的插件版本号、commit SHA 或发布标签。
- 你运行它所用的 DeepSeek Harness 版本，以及插件的安装方式。
- 操作系统与运行时版本。
- 涉及哪个指令文件 —— 用户全局的 `AGENTS.md`，或某个工作区。
- 精确的复现步骤、期望结果与实际结果。
- 去除密钥与个人信息后的日志。

安全漏洞请私下报告，见 [SECURITY.md](SECURITY.md)。切勿为漏洞开公开 issue。

## 代码风格

- 与周边代码风格保持一致；不要顺手重排无关文件。
- 行为变更需要新增或更新测试。
- 公开 API 必须有文档。
- 命名要清晰，避免复述代码的注释。
- 标准库已能实现的功能，不要新增依赖。
- 保持两侧分离：`src/index.ts`、`src/routes.ts`、`src/files.ts` 跑在宿主侧，
  `src/client/*` 跑在浏览器侧，两者共用的线路契约放在 `src/protocol.ts`。
- 路由测试用真实的 loopback 服务器驱动真实处理函数，并且只写入临时目录，
  绝不写真实的 `AGENTS.md`。请保持这一点。

## 评审流程

维护者会在时间允许时评审 pull request，通常至少有一轮反馈。请通过后续提交响应意见，
或推送 rebase 后重新请求评审。超过 60 天无回应的 pull request 可能被关闭。

## 许可证

参与贡献即表示你同意自己的贡献按本仓库的 `MIT` 许可证授权。
请勿粘贴你无权按此条款授权的代码。

## 疑问

请开 discussion，或发邮件到 `icrefinai@gmail.com`。

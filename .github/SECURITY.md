# Security Policy

## Supported versions

Only the versions below receive security fixes. Older releases are provided "as-is" —
upgrade to a supported line before reporting.

| Version | Supported | Notes |
| --- | --- | --- |
| `main` (latest commit) | :white_check_mark: | Active development |
| Latest tagged release | :white_check_mark: | Fixes are backported when practical |
| Older tagged releases | :x: | Upgrade to the latest release |
| Forks and modified copies | :x: | Report to the maintainer of that fork |

## Reporting a vulnerability

**Do not open a public issue, discussion, or pull request for a security problem.**
A public report exposes every user before a fix exists.

Report privately through one of these channels:

1. **GitHub Security Advisories (preferred)** — open
   `https://github.com/icrefin/dsh-agent-prompt/security/advisories/new`
   (repository → *Security* → *Advisories* → *Report a vulnerability*). This keeps the
   report private and gives us a private fork in which to prepare the fix.
2. **Email** — `icrefinai@gmail.com`. Encrypt with the maintainer's PGP key if one is
   published. Never send exploit code to a public list.

Include in your report:

- Affected version or commit, plus the dsh build and the deployment you ran it in.
- A minimal reproduction (proof of concept, request, or test case).
- Impact assessment: what an attacker gains, and under which preconditions.
- Any fix or mitigation you already know of.
- Whether you intend to publish, and the name you want used for credit.

## Our commitments

| Stage | Target |
| --- | --- |
| Acknowledge receipt | 3 business days |
| Initial assessment and severity triage | 10 business days |
| Fix or documented mitigation | 30 days for high/critical, best effort otherwise |
| Public disclosure | Coordinated with you, after a fix is available |

We credit you in the advisory unless you ask us not to. We will not pursue legal action
against researchers who act in good faith, avoid privacy violations, avoid service
disruption, and give us reasonable time to fix the issue before disclosure.

## Scope

In scope:

- The code in this repository (`icrefin/dsh-agent-prompt`), including published packages and CI workflows.
- Vulnerabilities exploitable with the default configuration. The plugin has no
  configuration and stores no state of its own — the instruction files on disk are the
  state.
- The `/api/agent-prompt/*` route family: the loopback-only fence, the method and
  4 MiB body fences, and target resolution. `GET /api/agent-prompt/tree`,
  `GET /api/agent-prompt/file` and `POST /api/agent-prompt/file` write a file the agent
  reads as instructions, so reaching a path outside the resolved
  `global` / `ws:<workspaceId>` target set — or reaching the write route from off the
  host — is a vulnerability.

Out of scope:

- Vulnerabilities in third-party dependencies — report those upstream; tell us only if
  this project becomes exploitable as a result.
- Social engineering, physical access, and volume-based denial of service.
- Spam, missing rate limits on endpoints documented as unauthenticated, and self-XSS.
- Issues that require an already-compromised machine or a modified local build.
- Anything on a host you do not own or have written permission to test.
- Another process on the same machine reaching the loopback-fenced routes. They are
  loopback-only by design and are reachable by any local process, like every other
  loopback-fenced plugin API in the same composition. They are **not** covered by the
  web app's `?token=` launch token, because named routes are matched before the
  authenticated SPA fallback. That is documented behaviour, not a vulnerability by
  itself; a way to reach the routes from off the host, or to make them write outside the
  resolved target set, is in scope.

## Safe harbor

If you follow this policy, we consider your research authorized, will work with you to
understand and fix the issue, and will not recommend or support legal action against you.

## Handling secrets in reports

Redact tokens, keys, and personal data. Use placeholders such as `192.0.2.10`,
`you@example.com`, and `<YOUR_API_KEY>` when an example is needed. If a live credential
must be shown, tell us first and rotate it immediately afterwards.

---

# 安全策略

## 支持的版本

只有下表中的版本会收到安全修复。更早的版本按“现状”提供 —— 报告前请先升级到受支持的分支。

| 版本 | 是否支持 | 说明 |
| --- | --- | --- |
| `main`（最新提交） | :white_check_mark: | 活跃开发 |
| 最新的发布标签 | :white_check_mark: | 可行时会回合修复 |
| 更早的发布标签 | :x: | 请升级到最新发布版 |
| 分支（fork）与改动过的副本 | :x: | 请向该分支的维护者报告 |

## 报告漏洞

**请勿为安全问题开公开 issue、discussion 或 pull request。**
公开报告会在修复发布之前就暴露给所有用户。

请通过以下任一渠道私下报告：

1. **GitHub Security Advisories（推荐）** —— 打开
   `https://github.com/icrefin/dsh-agent-prompt/security/advisories/new`
   （仓库 → *Security* → *Advisories* → *Report a vulnerability*）。报告保持私密，
   同时给我们一个私有分支用于准备修复。
2. **邮件** —— `icrefinai@gmail.com`。若维护者公布了 PGP 公钥，请加密发送。
   切勿把利用代码发到公开邮件列表。

报告中请包含：

- 受影响的版本或 commit，以及你运行的 dsh 版本与所属部署。
- 最小可复现样例（PoC、请求或测试用例）。
- 影响评估：攻击者能获得什么，前置条件是什么。
- 你已知的修复或缓解方式。
- 是否打算公开，以及你希望使用的署名。

## 我们的承诺

| 阶段 | 目标 |
| --- | --- |
| 确认收到 | 3 个工作日 |
| 初步评估与严重性定级 | 10 个工作日 |
| 修复或书面缓解方案 | 高危/严重 30 天内，其余尽力而为 |
| 公开披露 | 与你协商，且在修复可用之后 |

除你要求匿名外，我们会在公告中署名致谢。对于善意研究 —— 不侵犯隐私、不中断服务、
并在披露前给我们合理的修复时间 —— 我们不会采取法律行动。

## 范围

在范围内：

- 本仓库（`icrefin/dsh-agent-prompt`）的代码，包括其发布的包与 CI 工作流。
- 使用默认配置即可触发的漏洞。本插件没有任何配置，也不保存自身状态 ——
  磁盘上的指令文件就是状态。
- `/api/agent-prompt/*` 路由族：仅限 loopback 的围栏、方法围栏与 4 MiB 请求体围栏，
  以及目标解析。`GET /api/agent-prompt/tree`、`GET /api/agent-prompt/file` 与
  `POST /api/agent-prompt/file` 会写入一个智能体当作指令读取的文件，因此越过
  `global` / `ws:<workspaceId>` 目标集合去访问其他路径，或从主机之外触达写入路由，
  都算漏洞。

不在范围内：

- 第三方依赖自身的漏洞 —— 请报告给上游；仅当本项目因此变得可被利用时再告知我们。
- 社会工程、物理访问，以及靠流量压垮服务的拒绝服务。
- 垃圾信息、已声明为免认证接口的限流缺失，以及 self-XSS。
- 需要已失陷主机或被改动的本地构建才能成立的问题。
- 任何你并不拥有、也没有书面授权测试的主机。
- 同一台机器上的其他进程触达这些仅限 loopback 的路由。它们按设计只服务本机，
  与本组合中其他仅限 loopback 的插件 API 一样，任何本地进程都可访问；它们**不**
  受 Web 应用 `?token=` 启动令牌的保护，因为具名路由先于需要鉴权的 SPA 回退被匹配。
  这是有文档记录的行为，本身不算漏洞；但若能从主机之外触达这些路由，或让它们写到
  目标集合之外，则在范围内。

## 安全港

只要你遵循本策略，我们视你的研究为已授权，会与你一起理解并修复问题，
并且不会建议或支持对你采取法律行动。

## 报告中的密钥处理

请隐去令牌、密钥与个人信息。需要示例时请使用 `192.0.2.10`、`you@example.com`、
`<YOUR_API_KEY>` 这类占位符。若必须展示有效凭据，请先告知我们，并在其后立即轮换。

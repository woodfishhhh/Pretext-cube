# Ralph Context Snapshot

- task statement: 深度阅读 https://github.com/chenglou/pretext 仓库，并在本项目 docs 文件夹写一份“如何使用”文档。
- desired outcome: 在 docs 下产出可直接使用的中文上手文档，覆盖安装、核心 API、示例、注意事项。
- known facts/evidence:
  - 本项目依赖 @chenglou/pretext@^0.0.3（package.json）
  - 该库 README 给出两条主线：height 计算（prepare/layout）与手工排版（prepareWithSegments/layoutWithLines/walkLineRanges/layoutNextLine）
  - 提供 whiteSpace: 'pre-wrap' 模式，支持 textarea 场景
  - Caveats：system-ui 在 macOS 下精度风险，建议命名字体
- constraints:
  - 文档写入本地仓库 docs 目录
  - 输出要简洁、直接、可执行（遵循 AGENTS.md）
- unknowns/open questions:
  - 文档文件名用户未指定（默认选择 docs/how-to-use-pretext.md）
- likely codebase touchpoints:
  - docs/
  - package.json（依赖版本）

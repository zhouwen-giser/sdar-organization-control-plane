# SDAR v1.4 单节点控制台

基于 **SDAR v1.4 Node Control Backend 冻结协议 V1.0** 重建的 React + TypeScript 单节点控制台前端。

## 产品范围

控制台覆盖节点档案与健康、配置 Revision、LLM Provider、模型路由、SMPP Source、MCP Candidate/Binding、Skill、Plan Template、Node Capability、Readiness、A2A Exposure、Agent Card、Runtime Task、Telemetry Export、Management Operation、Audit、Node Events、RBAC 与协议追踪。

冻结后台当前状态为 `PROTOCOL_DESIGN_FROZEN_IMPLEMENTATION_PENDING`，因此本交付默认运行在可重复的 **Contract-first Local Validation Mode**：

- DTO、Operation、Scope 和路径来自冻结合同；
- 数据通过领域 Gateway 访问；
- 本地 Gateway 模拟 Revision、If-Match、Idempotency、202 Operation、Audit 和 Event；
- 不直接访问 Runtime 内部接口；
- 不提供 Telemetry Query；
- 不实现真实登录、Token 或 Secret Value；
- 刷新页面会恢复固定验证数据。

## 运行

```bash
npm ci
npm run contract:check
npm run validate
npm run dev
```

默认开发地址：`http://localhost:4173/#/overview`

## 质量门禁

```bash
npm run contract:generate
npm run contract:check
npm run typecheck
npm run check:architecture
npm run check:product
npm run lint
npm run test
npm run build
```

## 目录

```text
contracts/node-control/v1.0.0/  冻结协议副本
src/api/generated/              合同生成类型与 Operation Inventory
src/gateways/                   Gateway Contract 与确定性本地实现
src/state/                      查询、命令、角色和场景状态
src/mappers/                    DTO 到 ViewModel 映射
src/features/                   独立领域页面
src/components/                 Shell 和产品组件
docs/design/                    基线、路由、能力和交互审计
evidence/                       实际命令、浏览器 Smoke 和截图证据
```

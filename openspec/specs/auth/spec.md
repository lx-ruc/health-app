# auth Specification

## Purpose
TBD - created by archiving change health-app-v1. Update Purpose after archive.
## Requirements
### Requirement: 微信静默登录
系统 SHALL 在小程序启动时自动完成微信登录，用户无需手动操作。

#### Scenario: 首次登录
- **WHEN** 用户首次打开小程序
- **THEN** 系统调用 wx.login() 获取 code，发送到后端，后端用 code 换取 openid，签发 JWT 返回前端

#### Scenario: 自动续期
- **WHEN** JWT 即将过期（剩余有效期 < 1 天）
- **THEN** 前端在下次请求前自动调用后端续期接口，获取新 token

### Requirement: 请求认证
系统 SHALL 在所有需要认证的 API 请求中携带 JWT token。

#### Scenario: 携带 token 请求
- **WHEN** 前端发起需要认证的 API 请求
- **THEN** 请求头包含 `Authorization: Bearer <token>`

#### Scenario: token 过期处理
- **WHEN** 后端返回 401 状态码
- **THEN** 前端自动触发重新登录流程（wx.login → 换新 token → 重试原请求）

### Requirement: 后端 JWT 验证
系统 SHALL 在后端中间件中验证所有受保护路由的 JWT。

#### Scenario: 有效 token
- **WHEN** 请求携带有效的 JWT
- **THEN** 中间件解析 token，将 openid 注入请求上下文，放行请求

#### Scenario: 无效 token
- **WHEN** 请求携带无效或过期的 JWT
- **THEN** 后端返回 401 状态码，前端触发重新登录


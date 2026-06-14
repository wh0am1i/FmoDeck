# FMO 设备 WebSocket API 文档

> FMO 是一款国产业余无线电数字语音设备的 Web 管理面板。所有 API 均通过 WebSocket 通信（除 QSO 数据库恢复接口外）。

---

## 目录

- [1. 协议概述](#1-协议概述)
- [2. 连接方式](#2-连接方式)
- [3. 通用消息格式](#3-通用消息格式)
- [4. Config 配置管理 API](#4-config-配置管理-api)
- [5. WiFi 管理 API](#5-wifi-管理-api)
- [6. Station 远程台站 API](#6-station-远程台站-api)
- [7. QSO 日志 API](#7-qso-日志-api)
- [8. Message 消息 API](#8-message-消息-api)
- [9. Activity 活动/事件 API](#9-activity-活动事件-api)
- [10. User 用户信息 API](#10-user-用户信息-api)
- [11. UI 界面控制 API](#11-ui-界面控制-api)
- [12. Server Users 在线用户 API](#12-server-users-在线用户-api)
- [13. Events 实时推送 API](#13-events-实时推送-api)
- [14. Audio 音频流 API](#14-audio-音频流-api)
- [15. HTTP REST 接口](#15-http-rest-接口)

---

## 1. 协议概述

- **通信协议**：WebSocket (JSON 序列化)
- **消息模型**：请求-响应模式，客户端发送 `{type, subType, data}`，服务端返回对应的 `{type, subType, data}` 响应
- **超时机制**：所有操作默认 **5秒超时**
- **并发控制**：各 Service 采用 `_busy` 守卫 + FIFO 请求队列，同一类型操作串行化
- **自动重连**：主 WebSocket 错误/关闭后 **3秒重连**；Events WebSocket 使用指数退避（1s 起，最大 8s）

## 2. 连接方式

| 端点                 | 用途     | 传输内容                   |
| -------------------- | -------- | -------------------------- |
| `ws://<host>/ws`     | 主控通道 | JSON 指令与响应            |
| `ws://<host>/events` | 实时推送 | 服务端主动推送的事件       |
| `ws://<host>/audio`  | 音频流   | 原始 16-bit PCM 二进制数据 |

> `<host>` 为设备 IP 地址，如 `192.168.1.100`

## 3. 通用消息格式

### 客户端 → 服务端（请求）

```json
{
  "type": "<类型>",
  "subType": "<子类型>",
  "data": { <参数对象> }
}
```

### 服务端 → 客户端（响应）

```json
{
  "type": "<类型>",
  "subType": "<子类型>Response",
  "data": { <响应数据> }
}
```

---

## 4. Config 配置管理 API

**type**: `config`

### 4.1 服务 URL 配置

#### 设置服务 URL

```json
// 请求
{ "type": "config", "subType": "setUrl", "data": { "url": "xmrg.ham.sh.cn" } }

// 响应
{ "type": "config", "subType": "setUrlResponse", "data": { "result": 0 } }

// 获取 URL
{ "type": "config", "subType": "getUrl", "data": {} }

// 响应
{ "type": "config", "subType": "getUrlResponse", "data": { "url": "xmrg.ham.sh.cn" } }
```

> URL 限制：最多 31 字符，不含空格/斜杠，必须包含 `.`，不以 `.` 开头或结尾

### 4.2 服务端口

```json
// 设置端口
{ "type": "config", "subType": "setPort", "data": { "port": 8000 } }
{ "type": "config", "subType": "setPortResponse", "data": { "result": 0 } }

// 获取端口
{ "type": "config", "subType": "getPort", "data": {} }
{ "type": "config", "subType": "getPortResponse", "data": { "port": 8000 } }
```

> 端口范围：1-65535

### 4.3 APRS 密码

```json
// 设置密码
{ "type": "config", "subType": "setPasscode", "data": { "passcode": "12345" } }
{ "type": "config", "subType": "setPasscodeResponse", "data": { "result": 0 } }

// 获取密码
{ "type": "config", "subType": "getPasscode", "data": {} }
{ "type": "config", "subType": "getPasscodeResponse", "data": { "passcode": "12345" } }
```

> 格式：5位数字 或 `-1`（不设密码）

### 4.4 APRS 个性消息 (Remark)

```json
// 设置 remark
{ "type": "config", "subType": "setAprsRemark", "data": { "remark": "FM Transmitter Testing" } }
{ "type": "config", "subType": "setAprsRemarkResponse", "data": { "result": 0 } }

// 获取 remark
{ "type": "config", "subType": "getAprsRemark", "data": {} }
{ "type": "config", "subType": "getAprsRemarkResponse", "data": { "remark": "FM Transmitter Testing" } }
```

> UTF-8 字节限制：63 字节

### 4.5 服务器名称

```json
// 设置服务器名称
{ "type": "config", "subType": "setServerName", "data": { "serverName": "FMO-Repeater" } }
{ "type": "config", "subType": "setServerNameResponse", "data": { "result": 0 } }

// 获取服务器名称
{ "type": "config", "subType": "getServerName", "data": {} }
{ "type": "config", "subType": "getServerNameResponse", "data": { "serverName": "FMO-Repeater" } }
```

> 最长 31 字符

### 4.6 黑名单

```json
// 设置黑名单
{ "type": "config", "subType": "setBlacklist", "data": { "blacklist": "BG1ABC,BG2DEF" } }
{ "type": "config", "subType": "setBlacklistResponse", "data": { "result": 0 } }

// 获取黑名单
{ "type": "config", "subType": "getBlacklist", "data": {} }
{ "type": "config", "subType": "getBlacklistResponse", "data": { "blacklist": "BG1ABC,BG2DEF" } }
```

> 仅允许大写字母、数字、逗号、空格；最长 511 字符

### 4.7 广播设置

```json
// 开启服务器广播
{ "type": "config", "subType": "setBroadcastServer", "data": {} }
{ "type": "config", "subType": "setBroadcastServerResponse", "data": { "result": 0 } }

// 开启用户广播
{ "type": "config", "subType": "setBroadcastUser", "data": {} }
{ "type": "config", "subType": "setBroadcastUserResponse", "data": { "result": 0 } }
```

### 4.8 APRS 类型

```json
// 设置 APRS 类型 (1-15)
{ "type": "config", "subType": "setAprsType", "data": { "aprsType": 1 } }
{ "type": "config", "subType": "setAprsTypeResponse", "data": { "result": 0 } }

// 获取 APRS 类型
{ "type": "config", "subType": "getAprsType", "data": {} }
{ "type": "config", "subType": "getAprsTypeResponse", "data": { "aprsType": 1 } }
```

### 4.9 重启 APRS 服务

```json
{ "type": "config", "subType": "restartAprsService", "data": {} }
{ "type": "config", "subType": "restartAprsServiceResponse", "data": { "result": 0 } }
```

### 4.10 服务器登录公告

```json
// 设置登录公告
{ "type": "config", "subType": "setServerLoginAnnouncement", "data": { "serverLoginAnnouncement": "欢迎使用FMO中继" } }
{ "type": "config", "subType": "setServerLoginAnnouncementResponse", "data": { "result": 0 } }

// 获取登录公告
{ "type": "config", "subType": "getServerLoginAnnouncement", "data": {} }
{ "type": "config", "subType": "getServerLoginAnnouncementResponse", "data": { "serverLoginAnnouncement": "欢迎使用FMO中继" } }
```

> UTF-8 字节限制：127 字节

### 4.11 QSO 祝福语

```json
// 设置 QSO 祝福语
{ "type": "config", "subType": "setQsoBestWish", "data": { "qsoBestWish": "73!" } }
{ "type": "config", "subType": "setQsoBestWishResponse", "data": { "result": 0 } }

// 获取 QSO 祝福语
{ "type": "config", "subType": "getQsoBestWish", "data": {} }
{ "type": "config", "subType": "getQsoBestWishResponse", "data": { "qsoBestWish": "73!" } }
```

> UTF-8 字节限制：64 字节

### 4.12 服务器过滤

```json
// 设置过滤等级 (0-8)
{ "type": "config", "subType": "setServerFilter", "data": { "serverFilter": 0 } }
{ "type": "config", "subType": "setServerFilterResponse", "data": { "result": 0 } }

// 获取过滤等级
{ "type": "config", "subType": "getServerFilter", "data": {} }
{ "type": "config", "subType": "getServerFilterResponse", "data": { "serverFilter": 0 } }
```

> 0=不过滤 ... 8=最大过滤

### 4.13 坐标设置

```json
// 设置坐标
{ "type": "config", "subType": "setCordinate", "data": { "latitude": 31.2304, "longitude": 121.4737 } }
{ "type": "config", "subType": "setCordinateResponse", "data": { "result": 0 } }

// 获取坐标
{ "type": "config", "subType": "getCordinate", "data": {} }
{ "type": "config", "subType": "getCordinateResponse", "data": { "latitude": 31.2304, "longitude": 121.4737 } }
```

### 4.14 用户物理可达性信息

```json
// 设备名称 (char[16])
{ "type": "config", "subType": "setUserPhyDeviceName", "data": { "deviceName": "FG-3" } }
{ "type": "config", "subType": "getUserPhyDeviceName", "data": {} }
{ "type": "config", "subType": "getUserPhyDeviceNameResponse", "data": { "deviceName": "FG-3" } }

// 频率 (0-1000)
{ "type": "config", "subType": "setUserPhyFreq", "data": { "freq": 145.0 } }
{ "type": "config", "subType": "getUserPhyFreq", "data": {} }
{ "type": "config", "subType": "getUserPhyFreqResponse", "data": { "freq": 145.0 } }

// 天线类型 (char[16])
{ "type": "config", "subType": "setUserPhyAnt", "data": { "ant": "Yagi" } }
{ "type": "config", "subType": "getUserPhyAnt", "data": {} }
{ "type": "config", "subType": "getUserPhyAntResponse", "data": { "ant": "Yagi" } }

// 天线高度 (0-100000)
{ "type": "config", "subType": "setUserPhyAntHeight", "data": { "height": 10 } }
{ "type": "config", "subType": "getUserPhyAntHeight", "data": {} }
{ "type": "config", "subType": "getUserPhyAntHeightResponse", "data": { "height": 10 } }
```

### 4.15 固件升级

```json
// 查询稳定版版本
{ "type": "config", "subType": "queryUpgradeStable", "data": {} }
{ "type": "config", "subType": "queryUpgradeStableResponse", "data": { "result": 0 } }

// 查询内测版版本
{ "type": "config", "subType": "queryUpgradeInside", "data": {} }
{ "type": "config", "subType": "queryUpgradeInsideResponse", "data": { "result": 0 } }

// 获取升级查询结果
{ "type": "config", "subType": "getUpgradeQueryResult", "data": {} }
{ "type": "config", "subType": "getUpgradeQueryResultResponse", "data": {
  "busy": 0,
  "hasNewVersion": 1,
  "version": "v1.2.3",
  "info": "New features added"
}}

// 开始升级
{ "type": "config", "subType": "startUpgrade", "data": {} }
{ "type": "config", "subType": "startUpgradeResponse", "data": { "result": 0 } }

// 获取升级运行时状态
{ "type": "config", "subType": "getUpgradeRuntime", "data": {} }
{ "type": "config", "subType": "getUpgradeRuntimeResponse", "data": { "isUpgrading": 1 } }

// 重启系统
{ "type": "config", "subType": "rebootSystem", "data": {} }
{ "type": "config", "subType": "rebootSystemResponse", "data": { "result": 0 } }
```

---

## 5. WiFi 管理 API

**type**: `wifi`

### 5.1 扫描 WiFi 网络

```json
// 发起扫描（服务端会在约8秒后自动推送结果，也可手动拉取）
{ "type": "wifi", "subType": "scanWifi", "data": {} }

// 手动获取扫描结果
{ "type": "wifi", "subType": "scanWifiResult", "data": {} }

// 扫描结果（code=0 表示成功）
{
  "type": "wifi",
  "subType": "scanWifiResultResponse",
  "data": {
    "code": 0,
    "list": [
      { "ssid": "HomeWiFi", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "rssi": -45 },
      { "ssid": "Office_5G", "bssid": "11:22:33:44:55:66", "channel": 36, "rssi": -62 }
    ]
  }
}

// code=-1/-5 表示超时或无结果
{ "type": "wifi", "subType": "scanWifiResultResponse", "data": { "code": -1, "list": null } }
```

### 5.2 连接 WiFi

```json
// 连接指定网络
{ "type": "wifi", "subType": "setWifi", "data": { "ssid": "HomeWiFi", "password": "mysecret" } }
{ "type": "wifi", "subType": "setWifiResponse", "data": {} }

// 等待连接结果
{ "type": "wifi", "subType": "setWifiResult", "data": {} }
{ "type": "wifi", "subType": "setWifiResultResponse", "data": {} }
```

### 5.3 断开 / 遗忘 / 保存

```json
// 断开当前 WiFi
{ "type": "wifi", "subType": "disconnectWifi", "data": {} }
{ "type": "wifi", "subType": "disconnectWifiResponse", "data": {} }

// 遗忘网络
{ "type": "wifi", "subType": "forgetWifi", "data": { "ssid": "HomeWiFi" } }
{ "type": "wifi", "subType": "forgetWifiResponse", "data": {} }

// 保存网络配置
{ "type": "wifi", "subType": "saveWifi", "data": { "ssid": "HomeWiFi", "password": "mysecret" } }
{ "type": "wifi", "subType": "saveWifiResponse", "data": {} }
```

### 5.4 获取当前连接状态

```json
// 请求
{ "type": "wifi", "subType": "getWifi", "data": {} }

// 已连接
{ "type": "wifi", "subType": "getWifiResponse", "data": {
  "ssid": "HomeWiFi",
  "ip": "192.168.1.100",
  "rssi": -45,
  "connected": true
}}

// 未连接
{ "type": "wifi", "subType": "getWifiResponse", "data": { "list": null } }
```

---

## 6. Station 远程台站 API

**type**: `station`

用于管理语音服务器上的在线台站列表。

### 6.1 台站列表

```json
// 获取全部（默认 Range 0-8）
{ "type": "station", "subType": "getList", "data": {} }
// 或获取指定范围
{ "type": "station", "subType": "getListRange", "data": { "start": 0, "count": 8 } }

// 响应
{ "type": "station", "subType": "getListResponse", "data": {
  "list": [
    { "uid": 1, "name": "BG1ABC", "txPower": 10, "mode": 1 },
    { "uid": 2, "name": "BG2DEF", "txPower": 5, "mode": 1 }
  ],
  "count": 2
}}
```

### 6.2 当前台站

```json
// 获取当前选中的台站
{ "type": "station", "subType": "getCurrent", "data": {} }
{ "type": "station", "subType": "getCurrentResponse", "data": { "uid": 1, "name": "BG1ABC" } }

// 切换到指定台站
{ "type": "station", "subType": "setCurrent", "data": { "uid": 2 } }
{ "type": "station", "subType": "setCurrentResponse", "data": { "result": 0 } }

// 下一个 / 上一个台站
{ "type": "station", "subType": "next", "data": {} }
{ "type": "station", "subType": "nextResponse", "data": { "result": 0 } }

{ "type": "station", "subType": "prev", "data": {} }
{ "type": "station", "subType": "prevResponse", "data": { "result": 0 } }
```

---

## 7. QSO 日志 API

**type**: `qso`

### 7.1 日志列表

```json
// 分页查询
{ "type": "qso", "subType": "getList", "data": { "page": 0, "pageSize": 20 } }

// 响应
{ "type": "qso", "subType": "getListResponse", "data": {
  "list": [
    {
      "logId": 1,
      "callsign": "BG1ABC",
      "date": "20260420",
      "time": "120000",
      "freq": "145.0000",
      "mode": "FM",
      "gridSquare": "OL31"
    }
  ],
  "page": 0,
  "pageSize": 20
}}
```

### 7.2 日志详情

```json
{ "type": "qso", "subType": "getDetail", "data": { "logId": 1 } }
{ "type": "qso", "subType": "getDetailResponse", "data": {
  "log": {
    "logId": 1,
    "callsign": "BG1ABC",
    "date": "20260420",
    "time": "120000",
    "freq": "145.0000",
    "mode": "FM",
    "gridSquare": "OL31",
    "rptUsed": "FMO-Repeater"
  }
}}
```

### 7.3 签名密钥管理

```json
// 获取签名
{ "type": "qso", "subType": "getSign", "data": {} }
{ "type": "qso", "subType": "getSignResponse", "data": { "signature": "abc123..." } }

// 获取公钥
{ "type": "qso", "subType": "getPublicKey", "data": {} }
{ "type": "qso", "subType": "getPublicKeyResponse", "data": { "publicKey": "MIIBIjAN..." } }

// 重置密钥对
{ "type": "qso", "subType": "resetKeyPair", "data": {} }
{ "type": "qso", "subType": "resetKeyPairResponse", "data": { "result": 0 } }
```

### 7.4 触发推送历史

```json
{ "type": "qso", "subType": "triggerPushHistory", "data": {} }
```

---

## 8. Message 消息 API

**type**: `message` — 支持 FIFO 请求队列，操作串行化

### 8.1 消息列表

```json
// 请求
{ "type": "message", "subType": "getList", "data": { "page": 0, "pageSize": 20, "anchorId": 0 } }

// 响应
{ "type": "message", "subType": "getListResponse", "data": {
  "list": [
    {
      "messageId": 1,
      "fromCallsign": "BG1ABC",
      "fromSSID": 0,
      "toCallsign": "BG2DEF",
      "message": "Hello!",
      "timestamp": 1713600000,
      "read": 0
    }
  ],
  "page": 0,
  "pageSize": 20,
  "anchorId": 0,
  "nextAnchorId": 1
}}
```

### 8.2 消息详情

```json
{ "type": "message", "subType": "getDetail", "data": { "messageId": 1 } }
{ "type": "message", "subType": "getDetailResponse", "data": {
  "message": {
    "messageId": 1,
    "fromCallsign": "BG1ABC",
    "fromSSID": 0,
    "toCallsign": "BG2DEF",
    "message": "Hello!",
    "timestamp": 1713600000,
    "read": 0
  }
}}
```

### 8.3 发送消息

```json
{ "type": "message", "subType": "send", "data": { "callsign": "BG2DEF", "ssid": 0, "message": "Hello!" } }
{ "type": "message", "subType": "sendResponse", "data": { "result": 0 } }
```

### 8.4 标记已读 / 删除

```json
// 标记已读
{ "type": "message", "subType": "setRead", "data": { "messageId": 1 } }
{ "type": "message", "subType": "setReadResponse", "data": { "result": 0 } }

// 删除单条
{ "type": "message", "subType": "deleteItem", "data": { "messageId": 1 } }
{ "type": "message", "subType": "deleteItemResponse", "data": { "result": 0 } }

// 删除全部
{ "type": "message", "subType": "deleteAll", "data": {} }
{ "type": "message", "subType": "deleteAllResponse", "data": { "result": 0 } }
```

---

## 9. Activity 活动/事件 API

**type**: `event` / `blocked` — 支持 FIFO 请求队列

### 9.1 事件列表

```json
{ "type": "event", "subType": "getList", "data": { "count": 20 } }
{ "type": "event", "subType": "getListResponse", "data": {
  "list": [
    {
      "fromUID": 1,
      "callsign": "BG1ABC",
      "content": "Testing",
      "timestamp": 1713600000
    }
  ],
  "count": 20
}}
```

### 9.2 事件详情

```json
{ "type": "event", "subType": "getDetail", "data": { "fromUID": 1 } }
{ "type": "event", "subType": "getDetailResponse", "data": {
  "event": {
    "fromUID": 1,
    "callsign": "BG1ABC",
    "content": "Testing",
    "timestamp": 1713600000
  }
}}
```

### 9.3 发布事件

```json
{ "type": "event", "subType": "publish", "data": { "topic": "TEST", "content": "hello" } }
{ "type": "event", "subType": "publishResponse", "data": { "result": 0 } }
```

### 9.4 删除全部事件

```json
{ "type": "event", "subType": "deleteAll", "data": {} }
{ "type": "event", "subType": "deleteAllResponse", "data": { "result": 0 } }
```

### 9.5 屏蔽用户管理

```json
// 获取屏蔽列表
{ "type": "blocked", "subType": "getList", "data": {} }
{ "type": "blocked", "subType": "getListResponse", "data": {
  "list": [
    { "uid": 99, "callsign": "BADUSER" }
  ]
}}

// 解除屏蔽
{ "type": "blocked", "subType": "unblock", "data": { "uid": 99 } }
{ "type": "blocked", "subType": "unblockResponse", "data": { "result": 0, "uid": 99 } }
```

---

## 10. User 用户信息 API

**type**: `user`

```json
// 获取当前用户信息
{ "type": "user", "subType": "getInfo", "data": {} }
{ "type": "user", "subType": "getInfoResponse", "data": {
  "callsign": "BG1ABC",
  "uid": 1,
  "wlanIP": "192.168.1.100"
}}
```

---

## 11. UI 界面控制 API

**type**: `ui`

### 11.1 屏幕模式

```json
// 获取屏幕模式
{ "type": "ui", "subType": "getScreenMode", "data": {} }
{ "type": "ui", "subType": "getScreenModeResponse", "data": { "mode": "normal" } }

// 设置屏幕模式 ("normal" / "standby")
{ "type": "ui", "subType": "setScreenMode", "data": { "mode": "standby" } }
{ "type": "ui", "subType": "setScreenModeResponse", "data": { "result": 0 } }
```

---

## 12. Server Users 在线用户 API

**type**: `serverUsers`

```json
// 分页获取在线用户
{ "type": "serverUsers", "subType": "getListPage", "data": { "page": 0, "pageSize": 20 } }
{ "type": "serverUsers", "subType": "getListPageResponse", "data": {
  "list": [
    { "uid": 1, "callsign": "BG1ABC", "wlanIP": "192.168.1.100", "serverURL": "xmrg.ham.sh.cn" }
  ],
  "page": 0,
  "pageSize": 20
}}
```

---

## 13. Events 实时推送 API

**连接**: `ws://<host>/events`

此通道仅服务端推送，客户端无需发送请求。

### 13.1 消息摘要推送

```json
{
  "type": "message",
  "subType": "summary",
  "data": {
    "unreadCount": 2,
    "latestMessage": {
      "fromCallsign": "BG3XYZ",
      "message": "Copy that",
      "timestamp": 1713600000
    }
  }
}
```

### 13.2 消息已读推送

```json
{
  "type": "message",
  "subType": "ack",
  "data": {
    "messageId": 1
  }
}
```

### 13.3 QSO 呼号/发言推送

```json
{
  "type": "qso",
  "subType": "callsign",
  "data": {
    "callsign": "BG1ABC",
    "action": "tx"
  }
}
```

### 13.4 QSO 历史记录推送

```json
{
  "type": "qso",
  "subType": "history",
  "data": {
    "logId": 1,
    "callsign": "BG1ABC",
    "date": "20260420",
    "time": "120000"
  }
}
```

### 13.5 OTA 升级进度推送

```json
{
  "type": "ota",
  "subType": "progress",
  "data": {
    "percent": 50,
    "status": "downloading"
  }
}
```

---

## 14. Audio 音频流 API

**连接**: `ws://<host>/audio` — 仅服务端推送二进制数据

### 14.1 音频参数

| 参数     | 值                     |
| -------- | ---------------------- |
| 采样格式 | 16-bit PCM (LE, Int16) |
| 声道数   | 单声道 (Mono)          |
| 采样率   | 8000 Hz                |
| 传输类型 | Binary (ArrayBuffer)   |

### 14.2 处理管线

设备接收到的原始 PCM 数据会经过以下 Web Audio 处理链：

```
输入 → 高通滤波(220Hz) → 低通滤波(3000Hz) →
EQ低架(180Hz, +0.5dB) → EQ峰值(1400Hz, +1.0dB) → EQ高架(2600Hz, 0dB) →
压缩器(-22dB, 2:1) → FFT分析器 → 音量控制 → 输出
```

### 14.3 缓冲策略

- 最小启动缓冲：0.1 秒
- 目标前置缓冲：0.5 秒
- 最大缓冲：1.0 秒（超出时丢弃最旧数据）

### 14.4 状态文本

| 状态           | 含义                |
| -------------- | ------------------- |
| `缓冲中...`    | 正在累积初始缓冲区  |
| `播放中`       | 正常播放            |
| `音频已连接`   | WS 已建立但尚未播放 |
| `音频未连接`   | WS 未连接           |
| `音频连接错误` | WS 连接失败         |

---

## 15. HTTP REST 接口

### 15.1 恢复 QSO 数据库

```http
POST /api/qso/restore
Content-Type: multipart/form-data

body: FormData(file=<.db文件>)
```

上传 SQLite 数据库文件以恢复 QSO 日志。

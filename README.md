# ᝰ.ᐟ TENEO-NODE

运行 Teneo 节点 BETA，CLI 版本。<br>
Teneo 是一个基于浏览器扩展的节点。<br>
通过运行一个访问公共社交媒体数据的节点，您可以获得 $TENEO 代币作为报酬。这很简单、被动，您可以从您贡献的价值中赚取收益。

## 💡 如何注册

- **无需下载扩展，您可以使用脚本注册**

## 🚨 在运行 Teneo CLI 版本之前的注意事项

我对因使用 CLI 版本运行节点可能导致账户被 `封禁` 的情况不承担 `责任`，因为官方的 `Teneo Node Beta` 并未提供 CLI 版本选项，仅支持 Chrome 扩展。  
但 `我认为` 没有理由封禁账户，因为这不是作弊，我未在脚本中更改任何内容（心跳间隔 15 分钟，最大 Teneo 积分 25，每日最大积分 2400）。

## 📎 Teneo Node CLI 版本脚本功能

- 注册
- 登录
- 运行节点
- 自动登录
- 自动重连


## 📌 使用 Javascript/NodeJs 运行的截图


## ✎ᝰ. 运行方法
- 克隆仓库
```bash
git clone https://github.com/Zlkcyber/teneo-farm.git
cd teneo-farm
```

- 安装依赖
```bash
npm install
```

- 为单账户运行，多账户看下面
```bash
node main.js
```

## 多账户运行: 
- 手动将 token 放入 tokens.txt，每行一个 token
    ```bash
    nano tokens.txt
    ```
- 代理（可选）放入 proxies.txt
    ```bash
    nano proxies.txt
    ```

### 如果不想手动放入token，可自动获取： 
- 填写 accounts.txt，格式为：test@gmail.com|password123，每行一个账户
    ```bash
    nano accounts.txt
    ```
- 运行以下命令获取token
    ```bash
    node getToken
    ```

- 启动多账户运行
    ```bash
    node multy
    ```

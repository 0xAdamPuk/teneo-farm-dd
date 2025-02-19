const WebSocket = require('ws');
const fs = require('fs/promises');
const HttpsProxyAgent = require('https-proxy-agent');
const readline = require('readline');

async function readFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        const tokens = data.split('\n').map(line => line.trim()).filter(line => line);
        return tokens;
    } catch (error) {
        console.error('读取文件出错:', error.message);
        return [];
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class WebSocketClient {
    constructor(token, proxy = null) {
        this.token = token;
        this.proxy = proxy;
        this.socket = null;
        this.pingInterval = null;
        this.reconnectAttempts = 0;
        this.wsUrl = "wss://secure.ws.teneo.pro";
        this.version = "v0.2";
    }

    async connect() {
        const wsUrl = `${this.wsUrl}/websocket?accessToken=${encodeURIComponent(this.token)}&version=${encodeURIComponent(this.version)}`;

        const options = {};
        if (this.proxy) {
            options.agent = new HttpsProxyAgent(this.proxy);
        }

        this.socket = new WebSocket(wsUrl, options);

        this.socket.onopen = () => {
            const connectionTime = new Date().toISOString();
            console.log("WebSocket 已于", connectionTime, "连接成功");
            this.reconnectAttempts = 0;
            this.startPinging();
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("收到 WebSocket 消息:", data);
        };

        this.socket.onclose = () => {
            console.log("WebSocket 已断开连接");
            this.stopPinging();
            this.reconnect();
        };

        this.socket.onerror = (error) => {
            console.error("WebSocket 错误:", error.message);
        };
    }

    reconnect() {
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
        console.log(`将在 ${delay / 1000} 秒后重新连接...`);
        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.stopPinging();
        }
    }

    startPinging() {
        this.stopPinging();
        this.pingInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ type: "PING" }));
            }
        }, 10000);
    }

    stopPinging() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
}

async function main() {
    try {
        const tokens = await readFile('tokens.txt');
        rl.question('是否使用代理？(y/n): ', async (useProxyAnswer) => {
            let useProxy = useProxyAnswer.toLowerCase() === 'y';
            let proxies = [];

            if (useProxy) {
                proxies = await readFile('proxies.txt');
            }

            if (tokens.length > 0) {
                const wsClients = [];

                for (let i = 0; i < tokens.length; i++) {
                    const token = tokens[i];
                    const proxy = proxies[i % proxies.length] || null;
                    console.log(`正在为账户 ${i + 1} 连接 WebSocket - 代理: ${proxy || '无'}`);

                    const wsClient = new WebSocketClient(token, proxy);
                    wsClient.connect();
                    wsClients.push(wsClient);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                process.on('SIGINT', () => {
                    console.log('程序退出。正在停止 ping 并断开所有 WebSocket 连接...');
                    wsClients.forEach(client => client.stopPinging());
                    wsClients.forEach(client => client.disconnect());
                    process.exit(0);
                });
            } else {
                console.log('tokens.txt 中未找到令牌 - 正在退出...');
                process.exit(0);
            }
        });
    } catch (error) {
        console.error('主函数出错:', error);
    }
}

main();

const WebSocket = require('ws');
const { promisify } = require('util');
const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const SocksProxyAgent = require('socks-proxy-agent'); // 添加对Socks代理的支持
const chalk = require('chalk');

console.log(chalk.cyan.bold(`╔═╗╔═╦╗─╔╦═══╦═══╦═══╦═══╗`));
console.log(chalk.cyan.bold(`╚╗╚╝╔╣║─║║╔══╣╔═╗║╔═╗║╔═╗║`));
console.log(chalk.cyan.bold(`─╚╗╔╝║║─║║╚══╣║─╚╣║─║║║─║║`));
console.log(chalk.cyan.bold(`─╔╝╚╗║║─║║╔══╣║╔═╣╚═╝║║─║║`));
console.log(chalk.cyan.bold(`╔╝╔╗╚╣╚═╝║╚══╣╚╩═║╔═╗║╚═╝║`));
console.log(chalk.cyan.bold(`╚═╝╚═╩═══╩═══╩═══╩╝─╚╩═══╝`));
console.log(chalk.cyan.bold(`原作者github：github.com/zlkcyber 我的gihub：github.com/Gzgod 本人仅做了汉化处理 `));
console.log(chalk.cyan.bold(`我的推特：推特雪糕战神@Hy78516012  关注tg频道防失联：https://t.me/xuegaoz`));

let socket = null;
let pingInterval;
let countdownInterval;
let potentialPoints = 0;
let countdown = "计算中...";
let pointsTotal = 0;
let pointsToday = 0;
let retryDelay = 1000;

const auth = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlra25uZ3JneHV4Z2pocGxicGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU0MzgxNTAsImV4cCI6MjA0MTAxNDE1MH0.DRAvf8nH1ojnJBc3rD_Nw6t1AV8X_g6gmY_HByG2Mag";
const reffCode = "OwAG3kib1ivOJG4Y0OCZ8lJETa6ypvsDtGmdhcjB";

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function getLocalStorage() {
  try {
    const data = await readFileAsync('localStorage.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function setLocalStorage(data) {
  const currentData = await getLocalStorage();
  const newData = { ...currentData, ...data };
  await writeFileAsync('localStorage.json', JSON.stringify(newData));
}

async function connectWebSocket(token, proxy) {
  if (socket) return;
  const version = "v0.2";
  const url = "wss://secure.ws.teneo.pro";
  const wsUrl = `${url}/websocket?accessToken=${encodeURIComponent(token)}&version=${encodeURIComponent(version)}`;

  const options = {};
  if (proxy) {
    if (proxy.startsWith('http://') || proxy.startsWith('https://')) {
      options.agent = new HttpsProxyAgent(proxy);
    } else if (proxy.startsWith('socks://') || proxy.startsWith('socks5://')) {
      options.agent = new SocksProxyAgent(proxy);
    } else {
      console.error("Unsupported proxy type. Only HTTP(S) and SOCKS proxies are supported."); // 检查代理类型
      return;
    }
  }

  socket = new WebSocket(wsUrl, options);

  socket.onopen = async () => {
    const connectionTime = new Date().toISOString();
    await setLocalStorage({ lastUpdated: connectionTime });
    console.log("WebSocket 已于", connectionTime, "连接成功");
    startPinging();
    startCountdownAndPoints();
  };

  socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    console.log("收到 WebSocket 消息:", data);
    if (data.pointsTotal !== undefined && data.pointsToday !== undefined) {
      const lastUpdated = new Date().toISOString();
      await setLocalStorage({
        lastUpdated: lastUpdated,
        pointsTotal: data.pointsTotal,
        pointsToday: data.pointsToday,
      });
      pointsTotal = data.pointsTotal;
      pointsToday = data.pointsToday;
    }
  };

  let reconnectAttempts = 0;
  socket.onclose = () => {
    socket = null;
    console.log("WebSocket 已断开连接");
    stopPinging();
    const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
    setTimeout(() => connectWebSocket(token, proxy), delay);
    reconnectAttempts++;
  };

  socket.onerror = (error) => {
    if (proxy) {
      console.error(`WebSocket 错误 (使用代理 ${proxy}):`, error);
    } else {
      console.error("WebSocket 错误:", error);
    }
  };
}

function disconnectWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
    stopPinging();
  }
}

function startPinging() {
  stopPinging();
  pingInterval = setInterval(async () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "PING" }));
      await setLocalStorage({ lastPingDate: new Date().toISOString() });
    }
  }, 10000);
}

function stopPinging() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号。停止 ping 并断开 WebSocket...');
  stopPinging();
  disconnectWebSocket();
  process.exit(0);
});

function startCountdownAndPoints() {
  clearInterval(countdownInterval);
  updateCountdownAndPoints();
  countdownInterval = setInterval(updateCountdownAndPoints, 60 * 1000); // 1分钟间隔
}

async function updateCountdownAndPoints() {
  const { lastUpdated, pointsTotal, pointsToday } = await getLocalStorage();
  if (lastUpdated) {
    const nextHeartbeat = new Date(lastUpdated);
    nextHeartbeat.setMinutes(nextHeartbeat.getMinutes() + 15);
    const now = new Date();
    const diff = nextHeartbeat.getTime() - now.getTime();

    if (diff > 0) {
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      countdown = `${minutes}分 ${seconds}秒`;

      const maxPoints = 25;
      const timeElapsed = now.getTime() - new Date(lastUpdated).getTime();
      const timeElapsedMinutes = timeElapsed / (60 * 1000);
      let newPoints = Math.min(maxPoints, (timeElapsedMinutes / 15) * maxPoints);
      newPoints = parseFloat(newPoints.toFixed(2));

      if (Math.random() < 0.1) {
        const bonus = Math.random() * 2;
        newPoints = Math.min(maxPoints, newPoints + bonus);
        newPoints = parseFloat(newPoints.toFixed(2));
      }

      potentialPoints = newPoints;
    } else {
      countdown = "计算中...";
      potentialPoints = 25;
    }
  } else {
    countdown = "计算中...";
    potentialPoints = 0;
  }
  console.log("总积分:", pointsTotal, "| 今日积分:", pointsToday, "| 倒计时:", countdown);
  await setLocalStorage({ potentialPoints, countdown });
}

async function getUserId(proxy) {
  const loginUrl = "https://auth.teneo.pro/api/login";

  rl.question('邮箱: ', (email) => {
    rl.question('密码: ', async (password) => {
      try {
        const response = await axios.post(loginUrl, {
          email: email,
          password: password
        }, {
          headers: {
            'x-api-key': reffCode
          }
        });

        const access_token = response.data.access_token;

        await setLocalStorage({ access_token });
        await startCountdownAndPoints();
        await connectWebSocket(access_token, proxy);
      } catch (error) {
        console.error('错误:', error.response ? error.response.data : error.message);
      } finally {
        rl.close();
      }
    });
  });
}

async function registerUser() {
  const isExistUrl = 'https://auth.teneo.pro/api/check-user-exists';
  const signupUrl = "https://node-b.teneo.pro/auth/v1/signup";

  rl.question('请输入您的邮箱: ', (email) => {
    rl.question('请输入您的密码: ', (password) => {
      rl.question('请输入邀请码: ', async (invitedBy) => {
        try {
          const isExist = await axios.post(isExistUrl, { email: email }, {
            headers: {
              'x-api-key': reffCode
            }
          });

          if (isExist && isExist.data && isExist.data.exists) {
            console.log('用户已存在，请直接使用以下邮箱登录:', email);
            return;
          } else {
            const response = await axios.post(signupUrl, {
              email: email,
              password: password,
              data: { invited_by: invitedBy },
              gotrue_meta_security: {},
              code_challenge: null,
              code_challenge_method: null
            }, {
              headers: {
                'apikey': auth,
                'Content-Type': 'application/json',
                'authorization': `Bearer ${auth}`,
                'x-client-info': 'supabase-js-web/2.47.10',
                'x-supabase-api-version': '2024-01-01',
              }
            });
          }

          console.log('注册成功，请在以下邮箱确认您的账户:', email);
        } catch (error) {
          console.error('注册过程中出错:', error.response ? error.response.data : error.message);
        } finally {
          rl.close();
        }
      });
    });
  });
}

async function main() {
  const localStorageData = await getLocalStorage();
  let access_token = localStorageData.access_token;

  rl.question('是否使用代理？(y/n): ', async (useProxy) => {
    let proxy = null;
    if (useProxy.toLowerCase() === 'y') {
      proxy = await new Promise((resolve) => {
        rl.question('请输入您的代理 URL (例如: http://username:password@host:port 或 socks5://username:password@host:port): ', (inputProxy) => {
          resolve(inputProxy);
        });
      });
    }

    if (!access_token) {
      rl.question('未找到用户令牌。您想:\n1. 注册一个账户\n2. 登录您的账户\n3. 手动输入令牌\n请选择一个选项: ', async (option) => {
        switch (option) {
          case '1':
            await registerUser();
            break;
          case '2':
            await getUserId(proxy);
            break;
          case '3':
            rl.question('请输入您的访问令牌: ', async (accessToken) => {
              userToken = accessToken;
              await setLocalStorage({ userToken });
              await startCountdownAndPoints();
              await connectWebSocket(userToken, proxy);
              rl.close();
            });
            break;
          default:
            console.log('无效选项。正在退出...');
            process.exit(0);
        }
      });
    } else {
      rl.question('菜单:\n1. 登出\n2. 开始运行节点\n请选择一个选项: ', async (option) => {
        switch (option) {
          case '1':
            fs.unlink('localStorage.json', (err) => {
              if (err) {
                console.error('删除 localStorage.json 时出错:', err.message);
              } else {
                console.log('登出成功。');
                process.exit(0);
              }
            });
            break;
          case '2':
            await startCountdownAndPoints();
            await connectWebSocket(access_token, proxy);
            break;
          default:
            console.log('无效选项。正在退出...');
            process.exit(0);
        }
      });
    }
  });
}
// 运行
main();

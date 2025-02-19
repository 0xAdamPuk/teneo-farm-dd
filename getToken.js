const fs = require('fs/promises');
const axios = require('axios');

const reffCode = "OwAG3kib1ivOJG4Y0OCZ8lJETa6ypvsDtGmdhcjB";

async function readAccounts(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        const accounts = data.split('\n').map(line => {
            const [email, password] = line.split('|');
            return { email, password };
        });
        return accounts;
    } catch (err) {
        throw new Error(`读取账户文件出错: ${err.message}`);
    }
}

async function login(email, password) {
    const loginUrl = "https://auth.teneo.pro/api/login";

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
        return access_token;
    } catch (error) {
        console.error('错误:', error.response ? error.response.data : error.message);
        return null;
    }
}

async function refreshTokens() {
    console.log('正在为所有账户获取令牌...');
    try {
        await fs.access('tokens.txt');
        await fs.unlink('tokens.txt');
        console.log('成功清除旧的 tokens.txt 文件');
    } catch (error) {
        console.log('文件 tokens.txt 不存在，将创建新文件');
    }
    try {
        const accounts = await readAccounts('accounts.txt');
        if (!accounts.length) {
            console.log('accounts.txt 中未找到任何账户');
            return;
        }
        for (const account of accounts) {
            console.log('正在为以下账户获取访问令牌:', account.email);
            const token = await login(account.email, account.password);
            if (token) {
                console.log('访问令牌:', token);
                await fs.appendFile('tokens.txt', token + '\n', 'utf8');
                console.log('令牌已保存至 tokens.txt 文件');
            }
        }
    } catch (error) {
        console.error('处理账户时出错:', error.message);
    }
}

refreshTokens();

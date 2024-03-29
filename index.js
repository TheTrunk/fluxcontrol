const btcmessage = require('bitcoinjs-message');
const qs = require('qs');
const axios = require('axios');
const zeltrezjs = require('zeltrezjs');
const os = require('os');
const fs = require('fs')

const address = '1hjy4bCYBJr4mny4zCE85J94RXa8W6q37';
const privateKey = '';

let logins = {};


// helper function for timeout on axios connection
const axiosGet = (url, options = {
  timeout: 5000,
}) => {
  const abort = axios.CancelToken.source();
  const id = setTimeout(
    () => abort.cancel(`Timeout of ${options.timeout}ms.`),
    options.timeout,
  );
  return axios
    .get(url, { cancelToken: abort.token, ...options })
    .then((res) => {
      clearTimeout(id);
      return res;
    });
};

const axiosPost = (url, data, options = {
  timeout: 5000,
}) => {
  const abort = axios.CancelToken.source();
  const id = setTimeout(
    () => abort.cancel(`Timeout of ${options.timeout}ms.`),
    options.timeout,
  );
  return axios
    .post(url, data, { cancelToken: abort.token, ...options })
    .then((res) => {
      clearTimeout(id);
      return res;
    });
};


function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getIPaddresses() {
  try {
    const ips = [];
    const detZelNodes = await axiosGet(`https://api.runonflux.io/daemon/viewdeterministiczelnodelist`);
    if (detZelNodes.data.status === 'success') {
      const data = detZelNodes.data.data;
      data.forEach((zelnode) => {
        if (zelnode.ip != '') {
          ips.push(zelnode.ip);
        }
      });
      return ips;
    } else {
      throw detZelNodes.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}
// return signature of a given message providing a private key
async function signMessage(message, privKey) {
  if (privKey.length !== 64) {
    privKey = zeltrezjs.address.WIFToPrivKey(privKey);
  }
  const pk = Buffer.from(privKey, "hex");
  const mysignature = btcmessage.sign(message, pk, true);
  return mysignature.toString("base64");
}

function loadLogins() {
  const platform = os.platform();
  let loginsFile = null;

  if (platform === "linux" || platform === "darwin") {
    loginsFile = `${os.homedir()}/ZelFlux/logins.json`;
  } else if (platform === "win32") {
    loginsFile = `${os.homedir()}\\ZelFlux\\logins.json`;
  }

  if (fs.existsSync(loginsFile)) {
    let data = "";
    const stream = fs.createReadStream(loginsFile);
    stream.on("data", (chunk) => {
      data += chunk;
    })
      .on("end", () => {
        logins = JSON.parse(data);
      });
  }
}

function saveLogins(logins) {
  const platform = os.platform();
  let loginsFile = null;

  if (platform === "linux" || platform === "darwin") {
    loginsFile = `${os.homedir()}/ZelFlux/logins.json`;
  } else if (platform === "win32") {
    loginsFile = `${os.homedir()}\\ZelFlux\\logins.json`;
  }

  const stream = fs.createWriteStream(loginsFile);
  console.log(logins);
  stream.once("open", () => {
    stream.write(JSON.stringify(logins));
    stream.end();
  });
}

// given an ip address return stored authHeader
async function getAuthHeader(ip) {
  return logins[ip];
}

// returns login phrase of zelnode
async function getLoginPhrase(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const loginPhraseResponse = await axiosGet(`http://${adjIp}:${adjPort}/id/loginphrase`);
    if (loginPhraseResponse.data.status === 'success') {
      return loginPhraseResponse.data.data;
    } else {
      throw loginPhraseResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function getMessage(ip, message) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const loginPhraseResponse = await axiosGet(`http://${adjIp}:${adjPort}/apps/hashes`);
    if (loginPhraseResponse.data.status === 'success') {
      const messFound = loginPhraseResponse.data.data.find((a) => a.hash === message && a.message === true);
      if (messFound) {
        return true;
      }
      return false;
    }
    return false
  } catch (error) {
    console.log(error);
  }
}


// returns number of minor flux version
async function getFluxVersion(ip) {
  try {
    const axiosConfig = {
      timeout: 6666,
    };
    const loginPhraseResponse = await axiosGet(`http://${adjIp}:${adjPort}/flux/version`, axiosConfig);
    if (loginPhraseResponse.data.status === 'success') {
      return loginPhraseResponse.data.data;
      return Number(loginPhraseResponse.data.data.split('.')[2]);
    } else {
      throw loginPhraseResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function getApplications(ip) {
  try {
    const axiosConfig = {
      timeout: 4567,
    };
    const loginPhraseResponse = await axiosGet(`http://${adjIp}:${adjPort}/apps/globalappsspecifications`, axiosConfig);
    if (loginPhraseResponse.data.status === 'success') {
      return loginPhraseResponse.data.data;
    } else {
      throw loginPhraseResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function getFluxScannedHeight(ip) {
  try {
    const scannedHeightResponse = await axiosGet(`http://${adjIp}:${adjPort}/explorer/scannedheight`);
    if (scannedHeightResponse.data.status === 'success') {
      return Number(scannedHeightResponse.data.data.generalScannedHeight);
    } else {
      throw scannedHeightResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function getBalance(ip, address) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const balanceResponse = await axiosGet(`http://${adjIp}:${adjPort}/explorer/balance/${address}`);
    if (balanceResponse.data.status === 'success') {
      return Number(balanceResponse.data.data);
    } else {
      throw balanceResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

// returns number of scannedheight
async function getZelBenchVersion(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const loginPhraseResponse = await axiosGet(`http://${adjIp}:${adjPort}/benchmark/getinfo`);
    if (loginPhraseResponse.data.status === 'success') {
      return Number(loginPhraseResponse.data.data.version.split('.').join(''));
    } else {
      return 'BAD';
    }
  } catch (error) {
    return 'BAD';
  }
}

// returns number of scannedheight
async function getZelCashVersion(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const loginPhraseResponse = await axiosGet(`http://${adjIp}:${adjPort}/daemon/getinfo`);
    if (loginPhraseResponse.data.status === 'success') {
      return Number(loginPhraseResponse.data.data.version);
    } else {
      return 'BAD';
    }
  } catch (error) {
    return 'BAD';
  }
}

async function getZelCashError(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const getInfoResp = await axiosGet(`http://${adjIp}:${adjPort}/daemon/getinfo`);
    // console.log(getInfoResp.data.data.errors);
    if (getInfoResp.data.status === 'success') {
      if (getInfoResp.data.data.errors.includes('EXCEPTION')) {
        return 'BAD';
      }
      if (getInfoResp.data.data.blocks < 986549) {
        return 'BAD';
      }
      return 'OK';
    }
  } catch (error) {
    return 'BAD';
  }
}

// returns number of scannedheight
async function isAllOnNodeOK(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const zelbenchStatus = await axiosGet(`http://${adjIp}:${adjPort}/benchmark/getstatus`);
    if (zelbenchStatus.data.status === 'success') {
      if (zelbenchStatus.data.data.status === 'online' && zelbenchStatus.data.data.zelback === 'connected') {
        if (zelbenchStatus.data.data.benchmarking === 'toaster' || zelbenchStatus.data.data.benchmarking === 'failed') {
          return 'BAD';
        } else {
          return 'OK';
        }
      } else {
        return 'BAD';
      }
    } else {
      return 'BAD';
    }
  } catch (error) {
    return 'BAD';
  }
}


// returns number of scannedheight
async function getScannedHeight(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const loginPhraseResponse = await axiosGet(`http://${adjIp}:${adjPort}/explorer/scannedheight`);
    if (loginPhraseResponse.data.status === 'success') {
      return loginPhraseResponse.data.data.generalScannedHeight;
    } else {
      throw loginPhraseResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function zelcashPing(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    console.log(authHeader);
    const zelidauthHeader = authHeader;
    console.log(zelidauthHeader);
    const restartResponse = await axiosGet(`http://${adjIp}:${adjPort}/daemon/ping`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    if (restartResponse.data.status === 'success') {
      console.log(ip + ': ' + restartResponse.data.data);
    } else {
      throw restartResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function restartNodeBenchmarks(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const restartResponse = await axiosGet(`http://${adjIp}:${adjPort}/benchmark/restartnodebenchmarks`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    if (restartResponse.data.status === 'success') {
      return restartResponse.data.data;
    } else {
      throw restartResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function broadcastMessage(ip, message) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    console.log(authHeader);
    const response = await axios.post(`http://${adjIp}:${adjPort}/flux/broadcastmessage`, JSON.stringify(message), {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 22567,
    });
    console.log(response.data);
  } catch (error) {
    console.log(error);
  }
}

async function restartDaemon(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const restartResponse = await axiosGet(`http://${adjIp}:${adjPort}/daemon/restart`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    console.log(restartResponse);
    if (restartResponse.data.status === 'success') {
      console.log(ip + ': ' + restartResponse.data.data);
      return 'OK';
    } else {
      throw restartResponse.data.data;
    }
  } catch (error) {
    return 'OK2';
  }
}

async function restartExplorerSync(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const restartResponse = await axiosGet(`http://${adjIp}:${adjPort}/explorer/restart`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    console.log(restartResponse);
    if (restartResponse.data.status === 'success') {
      return restartResponse.data.data;
    } else {
      throw restartResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function stopExplorerSync(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const restartResponse = await axiosGet(`http://${adjIp}:${adjPort}/explorer/stop`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    console.log(restartResponse);
    if (restartResponse.data.status === 'success') {
      return restartResponse.data.data;
    } else {
      throw restartResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function updateZelBench(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axiosGet(`http://${adjIp}:${adjPort}/flux/updatebenchmark`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    console.log(updateResponse);
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      throw updateResponse.data.data;
    }
  } catch (error) {
    return 'OK2';
  }
}

async function updateZelBenchFast(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    axiosGet(`http://${adjIp}:${adjPort}/flux/updatebenchmark`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
  } catch (error) {
    return 'OK2';
  }
}

async function updateZelCash(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axiosGet(`http://${adjIp}:${adjPort}/flux/updatedaemon`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    console.log(updateResponse);
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      throw updateResponse.data.data;
    }
  } catch (error) {
    return 'OK2';
  }
}

async function restartApp(ip, appname) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axiosGet(`http://${adjIp}:${adjPort}/apps/apprestart/${appname}`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    console.log(updateResponse);
  } catch (error) {
    return 'OK2';
  }
}

async function updateZelCashFast(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    axiosGet(`http://${adjIp}:${adjPort}/flux/updatedaemon`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
  } catch (error) {
    return 'OK2';
  }
}

async function updateZelFlux(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axiosGet(`http://${adjIp}:${adjPort}/flux/softupdateflux`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 6666,
    });
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      throw updateResponse.data.data;
    }
  } catch (error) {
    console.log(error);
    return 'OK2';
  }
}

const abc = [];
async function rescanApps(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axiosGet(`http://${adjIp}:${adjPort}/apps/rescanglobalappsinformation/10/false`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      throw updateResponse.data.data;
    }
  } catch (error) {
    console.log(error);
    abc.push(ip);
    console.log(JSON.stringify(abc));
    return 'OK2';
  }
}

async function getZelFluxErrorLog(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axiosGet(`http://${adjIp}:${adjPort}/flux/errorlog`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    console.log(updateResponse);
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      throw updateResponse.data.data;
    }
  } catch (error) {
    return 'OK2';
  }
}

async function updateZelFluxTheHardWay(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axiosGet(`http://${adjIp}:${adjPort}/flux/hardupdateflux`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3333,
    });
    console.log(updateResponse);
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      console.log(updateResponse.data.data)
      throw updateResponse.data.data;
    }
  } catch (error) {
    console.log(error);
    return 'OK2';
  }
}

// post login
async function login(ip) {
  try {
    const loginPhrase = await getLoginPhrase(ip);
    const signature = await signMessage(loginPhrase, privateKey);
    const zelidauth = {
      zelid: address,
      signature,
      loginPhrase,
    };
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const verifyLogin = await axiosPost(`http://${adjIp}:${adjPort}/id/verifylogin`, qs.stringify(zelidauth));
    if (verifyLogin.data.status === 'success') {
      console.log(`Login to ${ip} success.`);
      const login = qs.stringify(zelidauth);
      logins[ip] = login;
      console.log(login);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function massLogin() {
  const ipsObtained = await getIPaddresses();
  // const ipsObtained = ["44.91.64.97","95.111.224.33","207.180.200.92","89.58.13.42","178.18.241.226","202.61.200.238","194.163.166.132","62.171.185.239","194.163.166.131","5.189.157.9","161.97.161.22","95.216.124.196","202.61.202.55","164.68.123.43","202.61.239.158","207.180.210.204","144.91.83.157","207.180.249.81","207.180.251.106","164.68.122.130","185.218.125.231","95.111.226.131","185.252.234.129","89.58.14.206","161.97.88.170","202.61.206.118","161.97.103.214","95.111.228.182","164.68.123.42","173.249.24.103","66.94.104.246","167.86.99.108","161.97.102.205","88.198.23.116","207.180.213.235","89.58.25.104","194.163.182.156","194.163.163.211","89.58.25.225","202.61.237.47","75.119.135.51","75.119.138.45","173.249.22.199","173.249.60.160","95.111.255.69","161.97.153.110","202.61.194.173","185.215.164.58","23.88.19.178","89.58.3.226","89.58.24.249","178.18.248.135","161.97.124.100","207.180.205.49","194.163.186.209","161.97.101.200","161.97.102.204","62.171.187.143","62.171.178.237","194.233.72.243","208.87.135.14","95.216.124.203","194.163.146.238","194.163.163.213","185.237.252.247","62.171.166.59","202.61.202.227","202.61.201.56","161.97.130.106","161.97.156.19","194.163.163.209","185.188.250.77","173.249.60.183","161.97.154.69","95.111.243.242","194.163.166.133","75.119.158.36","95.111.232.85","161.97.154.71","161.97.133.161","161.97.99.236","173.212.198.141","64.227.42.55","95.111.255.151","194.163.163.210","161.97.97.102","164.68.112.202","161.97.183.19","208.87.134.22","162.212.152.110","193.188.15.193","193.188.15.214","5.189.188.239","65.21.165.2","135.181.125.49","89.166.59.157","194.163.163.214","178.18.240.255","202.61.201.21","89.58.25.205","207.180.240.218","95.216.124.194","89.58.10.47","173.212.254.79","185.217.125.75","95.111.243.248","161.97.141.28","173.212.230.38","207.180.213.214","62.171.173.208","144.91.76.192","62.171.144.23","161.97.97.77","194.163.174.86","95.216.124.204","207.180.250.106","62.171.183.139","194.163.174.85","144.91.76.45","71.126.67.84","202.61.207.40","62.171.190.167","202.61.207.240","95.216.124.202","135.181.125.51","146.255.194.226","178.18.241.197","202.61.236.30","45.83.104.44","62.171.186.241","89.58.12.39","194.13.80.131","144.91.73.208","95.216.124.199","161.97.110.171","167.86.96.78","161.97.119.215","194.163.130.206","202.61.204.151","89.58.14.17","202.61.237.24","71.126.67.85","202.61.206.120","75.119.128.132","62.171.146.12","89.58.25.54","91.230.111.27","208.87.134.16","185.232.70.252","71.126.67.86","209.145.56.10","144.126.137.171","74.142.7.117","95.216.80.121","95.216.124.195","194.163.163.207","45.132.246.245","62.171.190.19","194.36.144.191","194.163.174.87","202.61.250.53","173.212.238.11","144.91.98.69","62.171.170.200","77.68.103.73","161.97.162.210","202.61.239.147","77.68.76.222","89.58.10.49","178.18.241.199","207.180.215.211","202.61.202.238","62.171.146.21","202.61.204.48","75.119.153.92","75.119.153.4","167.86.93.137","207.180.241.244","5.189.173.167","149.255.39.23","193.188.15.215","193.188.15.195","95.216.124.209","194.163.148.252","45.129.182.59","95.216.124.201","202.61.207.10","89.58.13.115","62.171.129.78","95.216.124.200","194.163.170.21","194.163.166.134","202.61.202.211","89.58.15.4","194.35.120.80","45.142.176.146","207.180.248.154","95.216.124.208","178.18.244.206","207.180.244.236","95.111.240.33","161.97.164.232","194.163.163.212","207.180.219.104","207.180.244.43","63.250.52.246","167.86.86.3","178.18.243.34","185.237.252.248","5.189.147.106","78.68.23.52","194.163.161.184","89.58.30.78","185.237.252.127","89.58.1.245","88.198.23.105","141.94.76.4","75.119.129.69","89.58.8.80","95.111.247.46","207.180.235.244","173.212.192.3","95.111.245.117","62.171.146.18","178.18.253.164","161.97.134.122","144.91.108.196","95.111.232.238","202.61.201.13","62.171.185.208","62.171.188.152","95.111.233.193","207.180.193.83","144.91.87.50","209.126.81.235","5.189.158.155","147.182.199.182","63.250.53.22","194.163.170.93","88.198.23.119","202.61.238.139","89.58.26.53","194.163.168.198","62.171.146.17","207.180.223.23","173.212.225.34","202.61.204.93","194.163.190.243","95.111.233.243","178.18.242.131","94.16.104.218","185.245.182.172","178.18.241.54","185.239.209.230","167.86.77.6","164.68.122.129","202.61.198.182","167.86.97.60","194.163.163.208"]
  // const ipsObtained = ["161.97.134.154","161.97.90.182","161.97.147.155","62.171.162.208","167.86.116.93","173.249.50.74","193.188.15.220","89.233.105.18","202.61.242.230","75.119.159.136","65.21.190.188","207.180.196.222","89.58.12.71","89.58.27.240","75.119.131.132","194.163.156.188","194.163.183.182","202.61.205.163","161.97.87.56","173.212.202.225","5.189.175.166","161.97.108.17","146.255.194.230","185.193.67.0","185.193.67.1","74.142.7.119","38.105.209.123","167.86.96.157","146.255.194.229","93.104.215.90","95.111.236.211","76.67.213.49","161.97.134.198","207.244.249.214","185.239.209.11","74.142.7.121","209.59.164.68","209.182.236.129","172.93.51.145","173.249.25.231","89.58.13.47","89.58.11.113","89.58.14.52","161.97.171.229","89.58.28.83","173.212.251.47","93.104.215.107","95.111.231.173","185.193.67.2","144.91.122.6","194.163.130.22","185.188.250.71","167.86.105.81","185.187.169.116","167.86.95.178","5.189.136.54","89.58.12.152","89.58.26.115","173.212.201.140","62.171.165.254","89.58.15.95","45.142.177.186","202.61.205.168","109.90.207.31","109.90.125.189","91.192.45.220","95.111.232.102","107.152.42.100","209.59.164.74","108.58.190.254","135.181.165.186","95.217.213.69","185.217.127.183","209.250.248.24","194.163.162.211","46.4.72.119","62.171.184.53","46.4.72.125","209.250.249.228","46.4.72.110","46.4.142.199","62.171.147.231","75.119.158.46","144.91.66.78","193.38.34.84","193.38.33.172","194.163.129.118","62.171.177.13","75.119.149.23","45.63.114.193","144.91.108.145","144.91.104.192","82.37.1.113","5.161.42.245","194.163.175.57","45.79.71.219","193.188.15.239","193.188.15.198","193.188.15.174","208.87.135.93","185.202.238.152","194.163.168.39","95.179.142.63","199.247.31.134","173.249.53.56","95.179.186.221","75.119.135.231","75.119.159.254","209.250.255.127","193.38.34.89","173.249.52.26","193.38.34.13","136.244.108.25","75.119.130.25","95.179.135.137","209.250.241.199","144.91.105.147","202.61.203.151","62.171.138.214","136.244.103.2","202.61.227.7","209.145.50.124","207.244.234.198","209.126.2.53","144.126.155.210","209.126.1.201","194.233.64.149","193.188.15.233","193.38.33.110","136.244.99.4","89.58.24.23","89.58.26.230","140.82.58.175","91.235.197.251","62.171.153.153","75.119.130.24","5.189.174.138","62.171.134.194","161.97.105.71","49.12.236.69","89.58.31.30","89.58.30.225","75.119.130.23","75.119.130.22","161.97.102.55","75.119.130.20","207.180.249.214","89.58.30.180","89.58.29.123","194.233.77.220","75.119.130.21","89.58.28.56","89.58.30.132","207.180.232.62","89.58.25.138","194.233.69.151","89.58.29.79","209.145.58.65","208.87.135.237","178.18.247.56","194.163.188.65","194.163.176.204","178.18.252.19","193.26.157.137","144.91.70.164","89.58.13.75","75.119.145.183","185.190.142.115","167.86.76.38","62.171.189.166","62.171.159.189","194.163.136.17","178.18.250.140","207.180.206.150","66.94.106.66","173.249.50.4","66.94.101.178","207.180.201.250","209.126.87.6","161.97.165.7","144.126.138.169","5.189.155.217","209.145.54.35","74.80.195.10","45.32.124.179","88.198.54.92","74.80.195.11","45.76.188.208","65.21.190.144","144.126.133.42","194.163.190.219","178.18.252.68","194.163.168.40","95.217.211.244","202.61.238.184","202.61.196.109","202.61.201.103","185.218.125.201","207.180.237.118","202.61.239.109","161.97.152.21","75.119.132.117","89.58.0.16","202.61.236.12","202.61.202.21","202.61.237.11","94.250.203.31","95.111.227.165","161.97.174.59","209.126.82.210","207.244.234.248","72.194.134.226","162.212.153.207","209.126.82.230","89.58.1.105","66.94.123.159","194.233.84.106","185.197.249.182","194.163.170.222","95.216.213.30","162.55.49.30","185.215.165.173","157.90.146.169","202.61.204.124","202.61.229.41","202.61.236.231","94.16.110.78","89.58.30.214","202.61.196.223","75.119.142.75","194.163.190.134","144.91.116.126","194.163.170.187","202.61.207.248","89.58.2.75","62.171.135.221","161.97.163.115","217.160.61.162","178.18.252.165","192.145.44.15","89.58.3.170","173.212.217.189","193.26.159.101","5.189.163.60","45.9.61.125","202.61.205.148","185.217.126.37","164.68.119.241","162.212.158.22","161.97.145.122","161.97.145.233","130.185.119.223","95.111.254.28","89.58.15.31","167.86.96.135","89.58.12.65","144.91.102.165","194.163.158.102","89.58.13.74","207.180.227.41","45.130.104.128","109.205.182.166"]
  // const ipsObtained = ["202.61.207.199","202.61.200.217","202.61.203.177","89.58.28.116","89.58.13.15","149.56.142.190","185.185.82.111","213.136.76.127","188.95.248.62","62.171.150.171","209.145.53.116","154.53.33.102","198.91.51.25","76.237.86.178","66.94.114.234","66.94.121.24","76.237.86.177","202.61.203.173","185.209.228.213","194.163.139.218","202.61.236.63","164.68.127.62","202.61.238.127","164.68.121.49","194.163.130.160","207.180.237.90","194.163.139.192","207.180.246.79","173.249.14.123","164.68.127.159","75.119.145.96","173.249.11.128","173.249.21.12","185.239.208.44","207.180.232.167","207.180.227.8","164.68.127.228","89.58.12.173","164.68.127.117","161.97.67.70","66.94.102.91","104.56.107.168","66.94.118.176","154.53.58.33","66.94.114.235","66.94.118.175","164.68.109.49","144.91.65.29","207.180.244.24","173.249.13.229","173.249.21.3","95.111.224.27","164.68.98.41","207.180.243.92","173.249.19.113","164.68.106.42","167.86.92.188","167.86.70.44","161.97.128.215","194.163.187.112","161.97.77.162","167.86.66.61","164.68.108.244","164.68.97.226","207.180.233.57","144.91.86.88","202.61.203.101","164.68.102.245","173.249.12.61","164.68.106.123","164.68.98.165","167.86.98.222","75.119.136.231","5.189.134.65","89.58.27.24","209.145.53.60","66.94.118.177","194.163.183.149","89.58.3.39","194.163.154.92","45.157.178.255","202.61.207.139","202.61.204.17","89.58.15.117","51.75.248.124","45.129.180.23","207.180.233.97","206.189.30.223","194.163.129.113","194.163.170.162","188.165.227.59","144.91.93.125","45.88.188.189","139.59.180.184","207.180.229.44","75.119.159.74","161.97.74.58","185.215.165.117","162.212.152.161","107.152.43.99","107.152.44.111","92.222.216.51","194.233.90.89","162.212.153.170","66.94.107.113","89.58.13.53","135.181.22.96","89.58.25.28","75.119.131.99","185.252.235.78","202.61.202.224","89.58.24.231","89.58.14.62","89.58.27.146","144.91.72.71","161.97.163.63","65.21.63.30","194.163.190.160","202.61.207.45","2.59.156.139","202.61.229.134","202.61.200.253","194.163.146.196","95.111.252.95","2.59.156.180","178.18.242.9","213.136.92.165","75.119.149.43","207.180.238.149","162.212.153.53","66.119.15.225","66.119.15.226","154.53.51.92","207.244.151.170","154.53.51.91","154.53.58.76","65.108.10.70","95.216.209.6","135.181.129.228","89.58.31.122","202.61.207.236","5.189.151.215","194.60.87.8","89.58.0.180","94.16.107.45","194.163.185.43","144.91.126.19","89.233.108.22","75.119.157.98","207.180.231.235","167.86.93.108","194.163.172.156","5.189.148.86","161.97.76.82","5.189.143.224","95.111.248.17","95.111.247.187","5.189.160.150","95.111.247.128","5.189.169.229","162.212.152.68","107.152.33.55","192.99.35.103","136.50.235.246","107.152.33.13","154.53.57.23","135.181.198.130","202.61.200.118","185.190.140.248","95.111.247.221","161.97.84.232","194.163.130.146","194.163.168.93","194.163.168.91","164.68.121.210","89.58.28.39","164.68.97.207","164.68.127.33","82.23.81.112","167.86.100.130","167.86.82.117","161.97.153.192","62.171.169.27","38.242.198.65","173.212.239.43","95.111.251.112","161.97.124.103","85.3.15.87","144.91.92.5","75.119.134.102","107.152.41.155","157.90.221.137","209.145.63.55","209.145.49.182","158.140.144.78","62.171.163.76","65.21.63.40","157.90.221.138","89.58.3.119","135.181.81.201","65.108.159.40","207.180.242.238","173.212.247.224","75.119.155.66","75.119.158.87","167.86.116.49","5.189.170.51","178.18.255.100","194.163.154.174","89.58.12.104","109.90.207.30","194.163.176.95","38.242.200.87","144.91.111.134","100.4.72.94","108.58.190.250","209.145.55.34","209.145.55.52","162.212.153.219","209.145.49.181","107.152.43.102","209.145.49.39","66.94.122.193","161.97.102.87","154.53.49.160","45.136.29.135","89.58.33.177","194.36.146.66","178.18.251.166","89.58.9.17","95.111.241.178","185.249.225.76","161.97.106.5","75.119.149.163","85.23.190.192","161.97.73.1","144.91.110.14","62.171.144.84","202.61.249.188","161.97.150.49","95.111.235.179","46.173.134.248","75.119.155.63","46.173.134.175","62.171.184.240","46.173.134.100","75.119.149.27","75.119.159.183","46.173.134.119","174.93.19.239","154.53.44.81","107.152.33.144","209.182.236.55","194.233.72.242","89.58.24.13","144.91.113.95","46.173.134.191","167.86.114.42","46.173.134.162","46.173.134.135","46.173.134.156","46.173.134.109","164.68.121.228"]
  // const ipsObtained = ["95.216.124.216","95.216.124.220","95.216.124.215","95.216.124.198","46.173.134.235","46.173.134.139","95.216.124.219","95.216.124.218","46.173.134.223","155.138.230.168","154.53.51.118","95.216.124.197","95.216.124.221","95.216.124.217","209.145.62.98","209.145.58.39","74.142.7.116","74.142.7.120","66.94.121.5","193.188.15.226","66.94.121.49","207.244.251.100","65.21.249.204","95.216.124.214","95.216.124.212","65.21.4.149","95.216.124.210","194.163.128.135","89.58.32.232","207.180.223.75","75.119.143.250","62.171.189.160","194.163.139.153","38.242.206.59","86.122.62.213","63.250.53.105","92.10.195.25","185.218.126.171","89.58.35.113","82.65.226.81","144.91.84.230","86.121.167.250","173.212.211.175","31.7.195.202","37.26.136.253","194.163.134.132","72.83.12.82","154.53.35.146","5.161.71.168","76.237.86.182","65.108.145.211","89.58.26.195","144.91.71.201","173.249.27.225","31.7.195.205","31.7.195.208","89.58.33.130","31.7.195.201","95.216.124.213","31.7.195.203","31.7.195.207","65.21.222.104","167.86.118.24","31.7.195.204","173.212.241.14","95.111.255.98","194.163.186.191","185.15.62.131","88.99.75.9","202.61.204.21","89.58.35.222","202.61.201.52","164.68.127.210","173.249.26.69","167.86.99.92","75.119.149.118","89.58.32.25","188.26.252.140","162.227.122.111","144.126.144.209","144.91.66.77","65.21.165.6","65.21.222.98","65.21.81.147","95.216.124.207","65.21.81.150","65.21.165.3","65.21.81.153","65.21.81.146","95.216.80.120","65.21.222.99","65.21.222.101","65.21.222.102","65.21.81.151","65.21.222.103","136.243.226.51","88.99.20.6","65.21.222.106","95.216.80.102","88.99.20.2","136.243.226.54","88.99.20.5","88.99.20.4","88.99.20.7","136.243.226.50","136.243.226.58","31.7.194.133","75.119.141.47","88.99.20.9","88.99.20.8","65.21.81.152","65.21.165.11","65.21.165.8","65.21.165.5","95.216.80.101","65.21.222.105","95.216.80.119","65.21.81.154","65.21.165.4","65.21.222.100","65.21.165.9","65.21.165.10","65.21.81.148","65.21.81.149","95.216.80.124","65.21.222.107","95.216.80.125","65.21.165.7","95.216.80.122","95.216.80.123","95.216.80.118","88.99.20.11","136.243.226.56","88.99.20.10","136.243.226.55","136.243.226.59","136.243.226.53","31.7.195.115","88.99.20.3","65.21.81.155","136.243.226.57","136.243.226.52","202.61.201.76","31.7.195.118","194.163.144.233","202.61.237.139","89.58.13.117","38.242.207.96","178.18.247.121","45.132.247.146","75.119.137.111","31.7.195.120","75.119.158.11","178.18.249.115","85.240.254.144","202.61.238.18","158.58.129.39","79.114.158.113","66.94.101.100","151.197.19.215","76.69.187.121","162.212.152.142","76.65.137.7","209.145.53.158","207.244.232.55","45.32.134.22","209.145.53.161","66.94.124.217","144.126.144.226","194.163.168.94","194.163.175.119","202.61.192.75","94.250.203.4","194.163.183.208","144.91.67.173","86.86.93.95","173.212.242.113","95.111.241.72","144.91.65.69","202.61.242.89","45.142.178.79","202.61.202.126","173.249.34.234","202.61.200.125","173.249.16.195","194.163.185.255","161.97.169.212","85.116.124.138","31.7.195.113","78.35.147.57","192.99.15.164","70.54.165.23","209.126.84.231","88.212.61.227","146.71.76.170","148.72.144.148","63.250.52.93","207.180.208.93","216.128.178.2","95.216.80.108","202.61.201.159","194.163.173.22","89.58.26.142","95.216.80.98","130.185.119.118","202.61.202.159","194.163.144.133","95.216.80.105","161.97.130.85","75.119.146.233","75.119.149.237","161.97.163.117","31.7.194.135","95.111.248.120","82.64.37.19","95.216.80.100","144.91.88.130","75.119.148.41","207.180.238.180","173.249.25.68","194.163.144.234","104.225.216.246","149.248.52.252","174.65.60.11","50.210.168.50","144.126.135.45","176.126.47.134","38.242.215.101","65.21.1.177","95.216.80.103","89.58.24.91","75.119.129.134","144.91.101.252","144.91.89.17","89.58.0.122","93.104.215.209","89.58.2.51","62.171.142.13","31.7.195.206","31.7.195.219","31.7.195.222","161.97.99.231","202.61.200.111","49.12.235.79","167.86.86.20","161.97.103.213","31.7.194.136","185.253.218.60","31.7.195.102","31.7.194.134","78.148.239.100","31.7.195.108","161.97.124.102","95.111.236.187","193.188.15.254","207.180.210.133","31.7.195.213","31.7.195.220","31.7.195.109","31.7.195.121","31.7.195.111","31.7.195.215","31.7.195.117","31.7.195.122","167.86.95.102","144.91.66.23","121.122.109.3","202.61.200.250","23.124.56.129","95.216.124.206","95.216.80.107","95.216.124.205","89.58.3.209","176.57.150.201","161.97.85.103","158.58.129.4","35.76.39.237","23.122.39.49","62.171.153.186","88.89.241.60"]
  //const ipsObtained = ["65.21.63.40","161.97.145.122","173.212.201.140","202.61.249.188","164.68.106.42","164.68.127.210","194.163.190.243","185.15.62.131","207.180.233.57","194.163.130.160","144.91.110.14","161.97.97.77","207.180.231.235","109.90.207.31","82.23.81.112","75.119.142.75","161.97.67.70","107.152.44.111","193.188.15.233","65.108.159.40","207.180.246.79","161.97.152.21","164.68.102.245","167.86.66.61","75.119.129.69","194.163.187.112","178.18.247.56","167.86.92.188","193.26.157.137","209.250.248.24","164.68.97.226","202.61.202.224","164.68.98.165","167.86.93.108","209.145.55.34","209.145.63.55","66.94.118.177","66.94.121.24","193.188.15.174","164.68.109.49","65.21.190.188","178.18.252.68","89.58.0.180","192.145.44.15","173.212.251.47","89.233.108.22","173.249.21.12","2.59.156.139","164.68.127.62","167.86.100.130","109.90.125.189","2.59.156.180","161.97.108.17","85.116.124.138","194.163.190.160","174.93.19.239","100.4.72.94","209.145.53.158","76.237.86.178","154.53.49.160","89.58.12.173","173.249.13.229","38.242.198.65","173.249.19.113","164.68.121.210","95.111.224.27","164.68.127.33","75.119.145.96","144.91.71.201","144.91.72.71","167.86.99.92","62.171.165.254","207.180.244.24","89.58.15.31","164.68.127.228","38.105.209.123","76.69.187.121","198.91.51.25","63.250.52.246","95.216.213.30","95.216.209.6","146.255.194.229","89.58.31.122","144.91.65.29","207.180.206.150","167.86.70.44","62.171.146.18","94.16.107.45","167.86.114.42","213.136.92.165","173.212.239.43","89.58.28.39","144.91.93.125","62.171.147.231","207.180.237.90","207.180.232.167","192.99.35.103","209.145.54.35","209.182.236.55","89.58.24.13","65.21.63.30","46.4.72.125","185.218.126.171","45.129.180.23","75.119.155.63","207.180.213.235","173.249.21.3","75.119.159.74","140.82.58.175","88.198.23.119","167.86.118.24","164.68.97.207","62.171.153.186","202.61.204.21","207.180.215.211","164.68.98.41","144.91.66.77","107.152.42.100","188.26.252.140","209.145.53.60","154.53.57.23","208.87.134.16","66.94.118.175","23.124.56.129","194.163.183.149","88.198.23.116","45.142.178.79","207.180.249.81","161.97.128.215","164.68.121.49","146.255.194.230","161.97.174.59","194.163.186.191","167.86.105.81","161.97.77.162","202.61.192.75","46.173.134.191","89.58.12.65","46.173.134.235","46.173.134.162","162.212.152.142","172.93.51.145","144.126.144.209","194.233.84.106","193.188.15.220","194.163.146.238","95.216.124.212","173.249.14.123","95.111.232.238","173.249.24.103","207.180.243.92","109.90.207.30","91.192.45.220","5.189.143.224","88.198.23.105","89.58.26.115","164.68.127.159","5.189.170.51","164.68.127.117","107.152.41.155","75.119.155.66","66.94.114.235","173.249.12.61","164.68.121.228","107.152.33.55","74.142.7.116","66.94.114.234","158.140.144.78","5.189.147.106","135.181.129.228","146.255.194.226","162.55.49.30","157.90.221.138","157.90.146.169","89.58.26.195","88.198.54.92","178.18.249.115","164.68.123.42","95.216.124.214","167.86.116.49","194.163.168.93","89.58.14.62","167.86.98.222","95.111.252.95","178.18.255.100","209.145.55.52","193.188.15.198","154.53.44.81","107.152.33.13","207.180.238.149","95.216.124.210","95.217.211.244","75.119.136.231","194.163.146.196","207.180.242.238","207.180.232.62","144.91.126.19","161.97.145.233","79.114.158.113","85.240.254.144","213.136.76.127","158.58.129.39","75.119.157.98","202.61.203.173","188.165.227.59","207.180.227.8","164.68.108.244","5.189.151.215","46.173.134.156","162.212.152.68","66.94.102.91","66.119.15.225","66.94.118.176","194.163.170.162","94.250.203.4","89.58.28.116","89.58.27.146","207.180.201.250","144.91.67.173","75.119.132.117","95.216.80.98","173.249.11.128","173.249.34.234","164.68.106.123","173.249.25.68","78.35.147.57","82.37.1.113","146.71.76.170","154.53.35.146","162.212.152.161","107.152.43.99","104.225.216.246","66.119.15.226","144.126.135.45","95.216.80.103","95.216.80.100","89.58.2.51","95.216.80.105","161.97.99.231","89.58.0.122","161.97.124.102","167.86.95.102","144.91.66.23","95.216.80.99","89.58.25.54","64.227.42.55","5.189.175.166","154.53.51.118","209.145.58.39","209.145.62.98","147.182.199.182","66.94.121.49","66.94.121.5","95.216.80.106","88.90.72.139","158.58.129.4"]
  //const ipsObtained = ["62.171.162.208","38.242.200.87","154.53.49.160","207.180.223.75","185.15.62.131","173.249.27.225","95.216.80.104","95.216.80.108","95.216.80.98","95.216.80.107","194.163.130.146","161.97.85.103"];
  // const ipsObtained = ["144.91.64.97","95.111.224.33","89.58.30.78","144.91.76.45","178.18.248.135","95.111.255.151","185.239.209.230","193.188.15.214","193.188.15.215","95.217.213.69","62.171.184.53","194.163.162.211","62.171.159.189","161.97.165.7","173.249.50.4","157.90.221.137","62.171.163.76","161.97.150.49","161.97.73.1","161.97.102.87","89.58.32.232","38.242.206.59","89.58.35.113","46.173.134.119","46.173.134.248","185.249.225.76","194.163.134.132","74.142.7.120","72.83.12.82","65.108.145.211","46.173.134.100","65.21.4.149","89.58.33.130","95.111.255.98","31.7.195.202","82.65.226.81","31.7.195.208","31.7.195.201","31.7.195.205","31.7.195.204","31.7.195.203","75.119.149.118","173.249.26.69","86.121.167.250","5.161.71.168","162.227.122.111","89.58.35.222","38.242.207.96","89.58.13.117","178.18.247.121","194.163.168.94","75.119.158.11","75.119.141.47","151.197.19.215","202.61.242.89","66.94.101.100","45.32.134.22","70.54.165.23","209.126.84.231","144.126.144.226","63.250.52.93","216.128.178.2","82.64.37.19","86.86.93.95","202.61.200.111","31.7.195.206","194.163.144.234","192.99.15.164","207.180.208.93","207.180.210.133","38.242.215.101","176.126.47.134","31.7.195.105","31.7.195.210","31.7.195.217","31.7.195.115","31.7.195.213","31.7.195.116","31.7.195.215","31.7.195.207","31.7.195.104","31.7.195.108","31.7.195.101","31.7.195.214","31.7.195.224","194.163.166.101","89.58.15.139","31.7.195.211","31.7.195.119","31.7.195.209","31.7.195.102","31.7.195.111","31.7.195.121","35.76.39.237"]
  let i = 1;
  if (ipsObtained.length > 0) {
    setTimeout(async () => {
      for (const ip of ipsObtained) {
        if (!logins[ip]) {
          const loggedIn = await login(ip);
          console.log(i + ' ' + ip + ': ' + loggedIn);
        } else {
          // const loggedIn = await login(ip);
          console.log(i + ' ' + ip + ': already logged in.');
        }
        i++;
      }
      setTimeout(() => {
        saveLogins(logins);
      }, 1000);
    }, 2000);
  }
}

async function massAskFluxVersion() {
  loadLogins();
  let i = 1;
  let j = 0;
  setTimeout(async () => {
    const ips = Object.keys(logins)
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      console.log(i + ' ' + ip + ': ' + fluxVersion);
      i++;
      if (fluxVersion < 58) {
        j++
      }
      console.log("Nodes to update: " + j)
    }
  }, 2000);
}

async function massFluxUpdate() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    // const ips = Object.keys(logins)
    //const ips = await getKadenaLocations();
    // const ips = ["144.91.64.97","95.111.224.33","89.58.30.78","144.91.76.45","178.18.248.135","95.111.255.151","185.239.209.230","193.188.15.214","193.188.15.215","95.217.213.69","62.171.184.53","194.163.162.211","62.171.159.189","161.97.165.7","173.249.50.4","157.90.221.137","62.171.163.76","161.97.150.49","161.97.73.1","161.97.102.87","89.58.32.232","38.242.206.59","89.58.35.113","46.173.134.119","46.173.134.248","185.249.225.76","194.163.134.132","74.142.7.120"]
    // const ips = ["72.83.12.82","65.108.145.211","46.173.134.100","65.21.4.149","89.58.33.130","95.111.255.98","31.7.195.202","82.65.226.81","31.7.195.208","31.7.195.201","31.7.195.205","31.7.195.204","31.7.195.203","75.119.149.118","173.249.26.69","86.121.167.250","5.161.71.168","162.227.122.111","89.58.35.222","38.242.207.96","89.58.13.117","178.18.247.121","194.163.168.94","75.119.158.11","75.119.141.47","151.197.19.215","202.61.242.89","66.94.101.100","45.32.134.22"]
    const ips = ["70.54.165.23", "209.126.84.231", "144.126.144.226", "63.250.52.93", "216.128.178.2", "82.64.37.19", "86.86.93.95", "202.61.200.111", "31.7.195.206", "194.163.144.234", "192.99.15.164", "207.180.208.93", "207.180.210.133", "38.242.215.101", "176.126.47.134", "31.7.195.105", "31.7.195.210", "31.7.195.217", "31.7.195.115", "31.7.195.213", "31.7.195.116", "31.7.195.215", "31.7.195.207", "31.7.195.104", "31.7.195.108", "31.7.195.101", "31.7.195.214", "31.7.195.224", "194.163.166.101", "89.58.15.139", "31.7.195.211", "31.7.195.119", "31.7.195.209", "31.7.195.102", "31.7.195.111", "31.7.195.121", "35.76.39.237"]
    // const ips = ["185.237.252.248","185.216.177.15","135.125.183.102","194.163.187.112","202.61.207.40","202.61.200.118","92.240.66.189","217.160.61.162","74.142.7.118","209.59.164.74","66.94.124.217","31.7.194.139","104.225.216.235","209.145.55.34","65.21.172.62","194.163.161.62","157.90.221.138","65.21.172.59","89.58.31.30","75.119.157.98","202.61.200.22","173.249.27.225","161.97.108.17","45.88.188.189","202.61.207.236","95.111.226.196","202.61.198.182","207.180.251.217","45.157.178.244","194.163.168.94","161.97.156.19","202.61.203.177","62.171.162.208","31.7.194.140","193.38.33.172","5.189.163.60","194.163.163.209","207.180.246.79","144.91.115.203","75.119.129.69","66.94.106.66","45.32.221.244","185.217.127.183","88.198.23.105","65.108.10.70","194.163.161.184","185.239.209.11","62.171.166.59","75.119.158.87","207.180.206.150","202.61.207.139","75.119.156.74","178.18.248.135","161.97.134.154","5.189.157.9","75.119.155.63","161.97.134.122","89.58.27.34","89.58.29.123","173.249.34.234","194.163.183.208","5.189.134.65","202.61.236.63","62.171.184.240","46.173.134.175","95.111.243.242","194.163.188.65","65.21.132.14","194.163.162.211","71.126.67.86","95.111.234.79","74.80.195.11","23.227.173.36","209.126.81.235","65.21.60.91","194.163.186.191","194.163.163.213","185.225.233.26","194.163.154.92","161.97.171.229","144.91.98.69","202.61.229.41","144.91.83.157","75.119.132.117","185.217.127.136","167.86.118.24","202.61.201.103","164.68.112.202","144.91.93.125","161.97.76.82","144.91.122.6","82.65.226.81","155.138.165.92","162.212.152.110","95.111.255.151","209.126.82.211","207.180.232.62","144.126.155.210","75.119.151.120","66.94.118.177","193.188.15.214","107.152.32.76","207.244.234.248","107.152.43.102","195.88.87.83","161.97.154.69","141.94.76.95","185.193.67.1","75.119.146.233","75.119.158.36","161.97.140.235","202.61.238.184","173.249.51.7","62.171.134.194","207.180.233.97","62.171.145.74","185.245.182.172","95.111.232.102","161.97.124.102","75.119.157.80","89.58.30.180","173.249.25.119","46.173.134.156","75.119.157.162","64.227.42.55","95.111.236.211","75.119.149.163","161.97.183.19","66.94.107.113","162.212.153.207","209.145.49.181","209.126.87.6","202.61.200.250","202.61.250.53","194.163.143.18","178.18.240.255","89.58.14.52","89.58.24.31","136.244.103.2","62.171.190.167","207.180.249.214","95.111.241.72","202.61.202.55","202.61.205.148","62.171.189.166","207.180.227.8","45.129.182.59","161.97.165.7","2.59.156.139","161.97.97.102","206.189.30.223","202.61.206.120","202.61.194.173","77.68.76.222","185.185.82.111","5.161.51.248","66.119.15.221","68.72.138.169","209.145.49.182","209.182.236.55","66.94.114.234","173.212.254.79","95.111.248.17","194.163.166.133","194.163.139.141","75.119.130.23","164.68.97.226","62.171.146.21","161.97.104.139","62.171.166.58","144.91.66.23","173.249.14.123","202.61.202.159","161.97.145.122","144.91.108.196","144.91.73.208","95.111.248.120","109.205.181.255","89.58.14.17","164.68.98.41","95.111.235.179","2.59.156.180","202.61.200.111","144.91.66.78","109.90.207.31","144.126.137.171","154.53.33.214","194.233.72.242","194.233.83.186","38.105.209.123","62.171.185.208","5.189.160.150","45.32.124.179","65.21.132.12","95.216.124.196","95.216.124.200","136.243.226.51","89.58.27.240","89.58.15.31","194.163.129.118","45.136.29.135","157.90.146.169","185.217.126.37","207.180.237.118","207.180.241.244","161.97.90.182","136.243.226.58","202.61.201.56","207.180.226.231","185.202.238.152","88.99.20.2","207.180.227.41","194.163.183.182","95.179.142.63","202.61.242.230","207.180.244.236","185.188.250.71","144.126.133.42","23.227.173.185","144.202.111.71","207.180.205.49","65.21.81.151","178.18.241.199","89.58.9.108","65.21.222.98","194.163.148.252","144.91.78.255","207.180.249.81","178.18.252.165","144.91.70.164","202.61.202.243","82.64.37.19","161.97.88.170","62.171.189.160","144.91.111.134","194.163.139.218","161.97.147.148","202.61.204.17","62.171.159.189","207.180.237.90","193.38.34.89","161.97.74.58","161.97.161.22","202.61.194.87","167.86.96.135","100.4.72.94","162.212.153.219","5.161.49.152","72.194.134.226","209.145.63.55","95.216.80.121","95.216.124.213","95.216.80.102","95.216.124.198","136.244.108.25","194.163.170.187","194.163.146.238","161.97.153.110","75.119.155.66","161.97.87.56","207.180.248.154","164.68.121.49","75.119.158.11","194.163.163.211","161.97.99.231","75.119.158.46","95.111.232.85","173.249.22.199","207.180.225.30","95.111.236.187","144.91.102.165","92.240.66.187","185.193.67.0","144.91.67.173","76.67.213.49","194.233.72.243","207.148.80.85","144.91.122.89","144.91.76.192","63.250.52.246","146.255.194.228","194.163.182.156","194.163.186.209","185.239.209.230","194.163.190.131","194.163.139.153","89.58.3.226","178.18.251.166","209.250.249.228","194.163.163.212","144.91.86.88","161.97.130.106","93.104.215.187","194.163.190.134","164.68.120.91","62.171.146.12","62.171.144.23","194.163.163.171","95.111.245.117","92.240.66.181","46.173.134.135","161.97.154.71","95.111.228.182","95.111.252.95","173.249.13.229","62.171.151.48","208.87.134.22","134.122.38.171","207.244.251.100","194.36.144.191","116.203.149.106","89.58.26.142","89.58.30.132","89.58.12.71","161.97.128.215","161.97.134.81","164.68.106.123","161.97.141.28","173.212.202.225","95.111.251.112","139.59.180.184","207.180.232.167","207.180.242.116","194.163.163.208","164.68.127.228","207.180.242.64","164.68.122.129","173.249.52.26","161.97.102.205","207.180.215.211","207.180.223.23","93.104.215.209","161.97.70.94","194.163.163.210","62.171.129.78","75.119.129.134","144.91.101.252","143.110.223.38","193.188.15.239","66.94.118.118","89.58.26.67","89.58.25.155","51.38.125.46","45.132.246.245","89.58.24.59","89.58.30.61","62.171.155.171","202.61.201.21","75.119.148.41","89.58.25.104","193.26.159.135","202.61.238.18","89.58.26.145","161.97.82.112","5.189.140.48","161.35.54.51","89.58.10.47","107.152.44.112","108.58.190.254","82.37.1.113","66.94.101.100","173.249.16.195","207.244.246.142","178.18.253.164","202.61.202.224","62.171.173.208","89.58.15.139","75.119.130.25","95.216.124.210","95.216.124.206","194.163.183.149","95.216.124.205","167.86.77.149","194.36.146.66","144.91.117.51","5.189.167.16","158.58.129.4","209.145.53.161","194.163.170.93","67.227.227.154","5.189.151.215"]
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      if (fluxVersion !== "3.8.1") {
        const updateResponse = await updateZelFlux(ip);
        console.log('Updating Flux on ' + ip + ': ' + updateResponse);
      }
    }
  }, 2000);
}

async function massAppRestart(app) {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    // const ips = Object.keys(logins)
    // const ips = await getIPaddresses();
    const ips = ["193.26.159.101", "75.119.132.117", "167.86.122.63", "207.244.251.164", "75.119.159.136", "202.61.237.47", "66.119.15.221", "104.225.216.235", "202.61.206.120", "149.255.39.17", "45.9.62.3", "194.13.80.131", "178.18.249.115", "62.171.155.171", "194.163.168.91", "202.61.207.146", "202.61.201.76", "202.61.202.55", "65.21.222.99", "202.61.201.21", "178.18.252.165", "194.163.129.118", "109.205.182.166", "202.61.250.53", "135.181.125.49", "209.145.55.52", "65.21.222.105", "202.61.236.12", "202.61.201.56", "194.163.129.242", "202.61.201.52", "202.61.200.217", "109.205.181.254", "209.145.49.182", "75.119.142.75", "109.205.181.255", "66.94.107.113", "202.61.236.30", "194.163.170.222", "202.61.200.250", "202.61.205.168", "202.61.237.11", "167.86.82.117", "86.122.62.213", "109.205.181.253", "202.61.207.240", "209.145.56.10", "23.227.173.36", "207.180.249.214", "209.145.49.181", "208.87.134.22", "202.61.200.125", "157.90.221.137", "62.171.188.152", "95.111.236.187", "149.255.39.23", "202.61.194.173", "93.104.215.209", "161.97.131.151", "167.86.97.60", "104.225.218.185", "104.225.223.221", "178.18.251.166", "202.61.238.184", "149.255.39.59", "172.93.54.129", "46.173.134.100", "202.61.201.103", "144.91.88.130", "194.163.166.101", "167.86.73.161", "202.61.205.103", "65.21.132.11", "95.111.253.56", "202.61.204.93", "202.61.238.139", "5.189.163.60", "161.97.169.212", "45.142.176.146", "173.249.60.183", "194.163.190.134", "194.60.87.8", "161.97.134.154", "161.97.131.153", "66.119.15.222", "202.61.202.126", "173.249.51.7", "23.227.173.185", "209.182.236.46", "161.97.131.154", "161.97.99.231", "144.91.101.252", "161.97.134.122", "45.129.181.23", "89.233.107.235", "75.119.145.183", "91.235.197.251", "202.61.202.21", "207.244.249.214", "75.119.135.51", "208.87.135.123", "207.244.237.151", "194.163.162.211", "202.61.202.238", "185.237.252.248", "194.163.168.94", "62.171.163.76", "85.23.190.192", "85.23.154.147", "62.171.184.53", "194.163.139.218", "194.163.139.192", "161.97.145.233", "23.88.19.178", "193.188.15.236", "194.233.90.89", "89.58.9.17", "161.97.134.81", "89.58.10.219", "194.163.168.93", "95.216.80.125", "95.216.80.124", "161.97.76.82", "95.216.124.215", "95.216.124.214", "95.216.124.219", "209.182.233.16", "202.61.242.230", "95.216.80.118", "89.58.1.245", "45.83.104.44", "89.58.3.226", "88.99.20.8", "65.21.222.102", "65.21.81.152", "88.99.20.3", "65.21.165.10", "88.99.20.9", "65.21.81.154", "65.21.222.98", "65.21.165.3", "95.216.124.210", "88.99.20.11", "95.216.124.216", "65.21.81.146", "194.163.170.162", "89.58.12.65", "89.58.14.17", "95.216.80.119", "88.99.20.4", "88.99.20.2", "76.67.213.49", "89.58.15.31", "89.58.14.206", "95.216.124.218", "95.216.80.122", "194.163.130.160", "95.216.124.212", "89.58.13.42", "89.58.8.80", "89.58.12.39", "89.58.12.71", "89.58.13.74", "95.216.124.202", "95.216.124.201", "46.173.134.223", "46.173.134.191", "46.173.134.162", "46.173.134.175", "46.173.134.135", "46.173.134.235", "46.173.134.109", "46.173.134.139", "65.21.222.107", "95.216.124.205", "95.216.124.206", "79.143.178.170", "95.216.80.120", "104.225.219.5", "63.250.55.88", "86.121.167.221", "104.225.220.4", "95.216.124.198", "65.21.132.12", "46.173.134.119", "95.216.124.221", "95.216.124.213", "161.97.129.6", "209.182.233.134", "172.93.50.129", "95.216.124.203", "95.216.124.211", "95.216.80.101", "95.216.124.194", "109.90.125.189", "188.115.184.212", "164.68.119.151", "89.58.15.139", "207.180.208.93", "207.180.210.133", "194.36.144.191", "207.180.237.118", "89.58.26.230", "185.188.250.77", "89.58.13.15", "158.58.130.68", "75.119.134.102", "202.61.237.24", "144.126.133.42", "95.216.124.220", "45.32.134.22", "88.198.23.116", "88.198.23.119", "194.163.163.171", "88.198.23.105", "138.201.81.45", "95.216.80.98", "95.216.80.99", "95.216.80.100", "95.216.80.103", "95.216.80.104", "95.216.124.195", "95.216.124.199", "95.216.124.200", "95.216.124.196", "207.180.233.97", "185.225.232.141", "65.21.165.9", "207.244.229.36", "89.58.24.91", "95.216.124.207", "95.216.80.102", "89.166.59.157", "95.111.232.102", "88.99.20.6", "88.99.20.5", "202.61.204.17", "144.91.120.175", "161.97.163.117", "31.7.194.133", "31.7.194.134", "31.7.194.135", "5.189.179.194", "89.58.25.28", "130.185.119.118", "144.126.155.17", "65.21.165.11", "65.21.81.155", "95.216.80.123", "65.21.165.2", "95.216.124.217", "65.21.81.149", "65.21.81.151", "65.21.81.150", "65.21.222.100", "65.21.81.153", "65.21.222.104", "65.21.165.5", "65.21.81.147", "65.21.222.103", "65.21.222.106", "65.21.165.4", "65.21.165.8", "45.76.188.208", "65.21.81.148", "65.21.222.101", "65.21.165.6", "88.99.20.7", "65.21.165.7", "144.91.64.97", "89.58.15.4", "95.216.124.204", "158.58.129.4", "167.86.95.178", "89.58.25.205", "89.58.24.249", "46.173.134.156", "172.93.51.145", "202.61.229.41", "45.129.180.23", "31.7.194.136", "95.216.80.121", "89.58.24.31", "185.239.208.44", "109.90.207.31", "65.108.40.221", "161.97.147.148", "194.163.176.166", "146.255.194.226", "146.255.194.227", "146.255.194.228", "146.255.194.229", "146.255.194.230", "104.56.107.168", "50.210.168.50", "94.130.117.177", "75.119.131.99", "161.97.74.58", "63.250.53.22", "89.58.25.104", "89.58.26.53", "82.78.98.85", "99.98.217.243", "89.58.25.225", "65.21.172.61", "45.9.61.125", "88.99.75.9", "194.163.161.184", "185.237.252.247", "91.192.45.220", "104.225.218.5", "46.173.134.248", "88.198.84.161", "136.243.226.51", "136.243.226.53", "136.243.226.54", "136.243.226.50", "136.243.226.52", "136.243.226.56", "136.243.226.57", "136.243.226.58", "136.243.226.55", "136.243.226.59", "65.21.172.62", "31.7.194.139", "45.88.188.189", "65.21.172.59", "208.87.135.14", "208.87.135.148", "207.180.251.106", "75.119.138.45", "207.180.241.244", "209.145.55.34", "173.249.16.195", "108.58.190.250", "144.76.253.209", "94.16.107.84", "104.225.216.246", "217.79.255.186", "193.188.15.193", "65.21.132.13", "31.7.194.137", "31.7.194.140", "207.180.242.238", "65.21.132.14", "31.7.194.138", "158.58.129.39"]
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await restartApp(ip, app);
      console.log(fluxVersion);
      i++;
    }
  }, 2000);
}

async function massRescanApps() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    // const ips = Object.keys(logins)
    const ips = ["35.221.19.76", "34.86.68.176", "35.222.132.136", "34.75.72.119", "188.239.61.82", "35.238.242.0", "35.237.111.20", "193.188.15.180", "193.188.15.220", "85.3.13.198", "82.223.151.197", "144.126.137.180", "75.119.148.15", "62.75.255.37", "188.239.61.90", "173.212.250.66", "95.111.230.98", "78.35.147.57", "213.136.85.74", "143.198.236.144", "193.188.15.223", "84.44.151.75", "143.198.234.29", "62.171.152.220", "116.202.21.109", "88.99.37.192", "88.99.80.124", "95.111.241.238", "35.239.62.11", "35.196.48.184", "35.199.0.51", "173.249.33.162", "95.217.118.204", "95.111.226.196", "144.91.109.132", "35.221.30.130", "104.197.53.102", "35.196.116.67", "35.221.19.42", "35.199.40.149", "85.245.238.61", "35.243.198.127", "35.199.18.151", "144.126.137.179", "144.126.133.170", "62.171.138.132", "95.111.253.41", "144.126.133.172", "188.239.61.234", "159.224.161.151", "62.171.135.157", "213.136.89.166", "62.171.134.83", "62.171.134.84", "62.171.134.82", "207.180.210.204", "62.171.134.81", "95.111.251.232", "209.126.86.251", "188.239.61.197", "76.67.215.177", "193.188.15.238", "95.111.253.234", "75.119.151.215", "75.119.151.217", "75.119.151.216", "75.119.151.219", "75.119.151.218", "5.12.67.157", "144.126.134.53", "144.126.134.55", "79.114.164.152", "144.126.134.54", "95.111.253.140", "75.119.142.89", "209.126.5.199", "209.145.54.22", "209.145.55.195", "209.145.55.211", "95.111.253.225", "95.111.252.158", "95.111.253.188", "144.126.134.52", "62.171.138.114", "95.111.251.195", "95.111.253.21", "91.158.95.34", "209.145.49.19", "144.126.133.168", "91.158.95.32", "91.158.95.35", "91.158.95.36", "134.255.89.236", "80.86.87.214", "71.193.196.211", "45.152.69.106", "144.202.102.240", "45.77.215.15", "75.119.136.242", "45.152.69.107", "209.126.87.222", "35.224.87.164", "35.185.16.142", "35.188.248.168", "35.192.148.175", "35.212.125.209", "35.211.70.213", "35.211.225.168", "35.209.122.115", "207.148.12.197", "35.199.28.194", "104.155.178.142", "103.214.5.84", "213.136.76.5", "62.171.143.203", "100.0.18.35", "161.97.80.80", "70.191.253.197", "167.86.110.193", "167.86.78.221", "161.97.86.67", "5.189.190.45", "72.194.73.254", "161.97.160.216", "207.180.230.149", "207.244.238.183", "85.240.254.144", "193.188.15.229", "81.84.131.113", "85.25.15.243", "161.97.88.170", "207.244.151.163", "35.226.43.151", "174.93.123.77", "167.86.81.150", "159.203.91.217", "95.179.133.164", "62.171.158.74", "62.75.255.12", "85.25.154.140", "75.119.157.98", "144.91.91.191", "144.91.125.106", "193.164.131.243", "173.249.9.246", "161.97.156.91", "141.94.23.248", "45.152.69.111", "178.18.251.110", "5.13.118.14", "194.233.64.223", "167.86.100.244", "161.97.80.237", "161.97.72.141", "85.25.253.62", "80.135.114.220", "62.171.130.133", "124.248.134.137", "79.199.46.173", "155.138.213.219", "194.233.65.234", "121.6.59.148", "151.197.19.215", "216.128.130.67", "62.75.255.7", "161.97.80.172", "213.136.70.145", "161.97.116.135", "73.28.105.219", "45.152.69.110", "213.136.70.146", "62.171.137.180", "73.90.121.41", "161.97.80.147", "213.136.80.3", "45.156.21.41", "213.136.74.186", "167.86.111.132", "62.171.138.24", "24.41.196.147", "70.240.240.192", "104.34.3.208", "46.107.169.103", "93.226.27.202", "173.212.217.146", "164.68.110.44", "161.97.134.40", "106.53.205.109", "105.227.25.186", "93.104.211.181", "159.89.164.160", "128.199.191.162", "165.227.226.117", "5.189.146.147", "80.86.87.252", "62.171.129.62", "75.73.255.102", "62.171.175.50", "108.61.176.246", "161.97.120.219", "213.136.86.107", "35.194.65.178", "34.75.97.252", "144.91.110.208", "209.145.58.55", "75.119.156.131", "75.119.156.126", "144.126.138.169", "109.91.221.89", "35.211.142.161", "35.212.101.247", "34.86.218.21", "75.119.156.141", "194.233.69.242", "178.18.251.50", "193.188.15.228", "82.165.32.238", "96.19.75.243", "194.233.67.22", "207.180.248.242", "75.119.156.140", "144.91.79.210", "173.212.240.64", "79.199.12.88", "144.126.138.177", "75.119.156.130", "194.233.69.243", "194.233.69.241", "144.91.94.178", "75.119.156.137", "75.119.156.127", "23.17.252.9", "173.212.224.153", "161.97.120.217", "194.233.66.225", "161.97.120.225", "161.97.120.231", "161.97.120.221", "35.231.163.87", "213.136.91.82", "35.211.192.55", "35.209.76.223", "207.246.71.87", "135.181.103.41", "161.97.71.208", "165.227.227.114", "161.97.173.93", "161.97.173.94", "144.126.138.109", "144.126.133.171", "207.180.249.214", "79.117.239.162", "75.119.156.124", "62.171.140.75", "62.171.140.162", "75.119.156.123", "91.158.95.19", "75.119.156.125", "188.26.250.85", "209.126.80.18", "161.97.120.228", "75.119.159.16", "75.119.159.12", "75.119.159.13", "75.119.159.14", "75.119.157.165", "75.119.159.15", "75.119.155.157", "75.119.155.158", "75.119.156.128", "161.97.150.49", "76.67.215.236", "178.18.242.227", "75.119.139.55", "75.119.139.56", "75.119.139.57", "75.119.155.150", "144.126.137.178", "144.126.133.176", "144.126.133.173", "144.126.133.174", "75.119.139.53", "144.126.137.176", "144.126.137.177", "144.126.133.165", "75.119.139.54", "75.119.155.151", "144.126.133.167", "144.126.133.169", "144.126.133.166", "144.126.133.175", "75.119.155.152", "161.97.128.174", "75.119.155.153", "75.119.155.154", "75.119.156.129", "75.119.155.155", "75.119.155.156", "178.200.122.11", "95.95.187.105", "86.185.120.5", "46.188.43.138", "62.171.160.137", "79.199.44.207", "5.13.112.249", "140.82.0.77", "142.93.159.140", "161.97.175.76", "46.107.169.108", "167.86.88.75", "137.220.57.128", "135.181.198.213", "149.28.177.105", "79.118.142.229", "86.126.8.94", "75.119.131.181", "68.1.121.206", "144.91.101.55", "194.195.246.244", "40.68.143.217", "82.3.119.129", "207.180.249.3", "62.171.139.75", "62.171.139.121"]
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      await rescanApps(ip);
    }
  }, 2000);
}

async function massHardFluxUpdate() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    const ips = ["5.68.124.236", "89.58.0.227", "88.168.9.84", "167.86.98.161", "161.97.180.171", "208.87.131.103", "216.238.77.65", "144.91.117.51"]
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      if (fluxVersion !== "3.2.2") {
        const updateResponse = await updateZelFluxTheHardWay(ip);
        console.log('Updating Flux on ' + ip + ': ' + updateResponse);
      }
    }
  }, 2000);
}

async function getBadFLuxVersions() {
  const ipsObtained = ["5.68.124.236", "89.58.0.227", "208.87.131.92", "88.168.9.84", "167.86.98.161", "217.160.61.162", "208.87.131.45", "208.87.131.47", "161.97.180.171", "91.201.40.253", "82.66.79.86", "208.87.131.103", "216.238.77.65", "95.111.231.173", "144.91.83.157", "144.91.117.51", "193.188.15.210", "178.18.248.135"]
  // const ipsObtained = await getIPaddresses();
  // const ipsObtained = Object.keys(logins)
  console.log(ipsObtained.length);
  // const ipsObtained = 
  let badFluxes = [];
  let unreachableFluxes = [];
  let i = 1;
  if (ipsObtained.length > 0) {
    setTimeout(async () => {
      for (const ip of ipsObtained) {
        const fluxVersion = await getFluxVersion(ip);
        if (fluxVersion !== "3.2.2") {
          badFluxes.push(ip);
          console.log(ip + ' IS A NOT CORRECT');
        } else if (!fluxVersion) {
          unreachableFluxes.push(ip);
          console.log(ip + ' IS ureachable');
        } else {
          console.log(i + ' ' + ip + ' v' + fluxVersion);
        }
        i++;
      }
      setTimeout(() => {
        console.log(badFluxes.length);
        console.log(JSON.stringify(badFluxes));
        console.log(JSON.stringify(unreachableFluxes));
      }, 1000);
    }, 2000);
  }
}

async function getBadApplication() {
  // const ipsObtained = await getIPaddresses();
  const ipsObtained = ["89.163.164.90", "45.77.74.26", "149.5.28.97", "188.34.195.98", "71.236.186.242", "173.212.238.62", "161.97.92.94", "75.119.135.174", "161.97.114.241", "5.167.249.250", "164.68.109.68", "167.86.121.153", "161.97.110.180", "144.91.88.0", "161.97.119.167", "161.97.149.227", "164.68.123.163", "144.91.100.96", "161.97.99.231", "95.216.142.156", "84.85.48.154", "194.163.151.79", "82.165.254.206", "161.97.97.194", "176.57.184.60", "173.249.50.4", "62.171.159.189", "62.171.171.108", "161.97.165.7", "176.57.184.49", "192.248.181.20", "62.171.154.225", "161.97.116.109", "95.217.118.211", "202.61.203.229", "202.61.201.53", "78.141.222.192", "45.77.52.113", "62.171.180.210", "202.61.202.107", "161.97.141.146", "144.202.101.97", "161.97.107.87", "193.188.15.209", "194.163.168.238", "62.171.146.2", "144.91.110.245", "109.205.183.77", "161.97.99.59", "161.97.99.69", "207.180.249.3", "107.152.47.22", "192.227.150.60", "193.188.15.190", "161.97.118.82", "95.111.227.39", "88.212.61.100", "202.61.201.128", "95.217.118.204", "194.163.132.181", "144.91.95.237", "207.244.236.91", "193.188.15.186", "193.188.15.187", "193.188.15.192", "62.171.153.81", "193.188.15.184", "192.248.189.63", "66.94.123.168", "62.171.179.13", "85.240.254.144", "109.235.67.17", "2.81.78.7", "139.180.167.246", "151.80.155.92", "161.97.91.207", "144.126.155.113", "207.180.249.55", "62.171.136.18", "207.244.254.212", "149.28.117.233", "164.68.127.33", "202.61.229.134", "109.205.183.58", "151.197.19.215", "193.188.15.225", "161.97.137.24", "161.97.110.171", "65.21.172.58", "207.180.244.24", "144.126.155.210", "144.91.116.126", "75.119.155.135", "194.163.168.62", "194.233.67.22", "194.163.168.40", "161.97.99.236", "68.183.73.250", "75.119.136.62", "95.111.240.33", "173.212.202.69", "109.205.183.22", "66.94.123.159", "109.205.183.215", "45.77.137.29", "5.189.170.51", "149.28.69.12", "95.111.252.95", "95.111.224.33", "193.188.15.226", "135.181.103.41", "45.132.247.146", "167.86.95.52", "194.163.187.91", "173.249.25.119", "31.19.128.172", "65.21.190.144", "168.119.150.71", "75.119.155.134", "207.180.219.104", "5.189.184.99", "173.249.36.206", "161.97.119.215", "202.61.200.217", "109.205.183.92", "202.61.200.125", "95.216.91.20", "89.233.105.18", "95.217.118.197", "89.233.105.188", "161.97.175.66", "194.163.163.214", "161.97.137.151", "95.216.91.21", "202.61.250.53", "78.26.171.231", "161.97.172.226", "173.249.23.246", "194.163.189.248", "202.61.203.55", "95.216.124.211", "95.216.124.212", "69.64.46.16", "161.97.169.30", "161.97.76.82", "194.163.189.245", "161.97.171.241", "161.97.138.172", "46.173.134.135", "46.173.134.139", "95.216.91.22", "46.173.134.175", "46.173.134.191", "46.173.134.162", "46.173.134.156", "161.97.175.191"]
  console.log(ipsObtained.length);
  let i = 1;
  const badips = [];
  if (ipsObtained.length > 0) {
    setTimeout(async () => {
      for (const ip of ipsObtained) {
        const apps = await getApplications(ip);
        if (apps) {
          if (apps.length < 33) {
            console.log(ip + ' IS A NOT CORRECT ' + apps.length);
            badips.push(ip);
            await reindexExplorer(ip);
          } else {
            const PokerTH = apps.find((app) => app.name === "PokerTH");
            if (!PokerTH) {
              console.log(ip + ' IS A NOT CORRECT B ' + apps.length);
              badips.push(ip);
              await reindexExplorer(ip);
            } else {
              if (PokerTH.height !== 955420) {
                console.log(ip + ' IS A NOT CORRECT C ' + apps.length + ' ' + PokerTH.height);
                badips.push(ip);
                await reindexExplorer(ip);
              } else {
                console.log(ip + ' IS A CORRECT');
              }
            }
          }
        }
        i++;
      }
      console.log(JSON.stringify(badips));
    }, 2000);
  }
}

async function massZelBenchUpdate() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    const ipsAll = Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll.slice(0, 4);
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      // console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      if (fluxVersion >= 57) {
        const zelbenchVersion = await getZelBenchVersion(ip);
        if (zelbenchVersion < 110) {
          console.log('Updating ' + ip);
          const updateZB = await updateZelBench(ip);
          if (updateZB === 'OK' || updateZB == 'OK2') {
            await timeout(180000);
            const zelbenchVersion2 = await getZelBenchVersion(ip);
            console.log(zelbenchVersion2);
            if (zelbenchVersion2 === 'BAD') {
              // restart zelcash
              console.log('Something went wrong on ' + ip + ' Restarting daemon.')
              const restartZelcash = await restartDaemon(ip);
              if (restartZelcash == 'OK' || restartZelcash == 'OK2') {
                await timeout(180000);
                const zelbenchVersion3 = await getZelBenchVersion(ip);
                if (zelbenchVersion3 >= 110) {
                  console.log('Update on ' + ip + ' was succesful. Restarting benchmarks.')
                  await timeout(180000);
                  await restartNodeBenchmarks(ip);
                } else {
                  console.log('Failed to update ip ' + ip);
                }
              } else {
                console.log('Critical error on ' + ip);
              }
            } else if (zelbenchVersion2 >= 110) {
              console.log('Update on ' + ip + ' was succesful.');
              const isOK = await isAllOnNodeOK(ip);
              if (isOK == 'BAD') {
                console.log('Update on ' + ip + ' RERUNNING BENCHMARKING NOTED.');
                await timeout(120000);
                await restartNodeBenchmarks(ip);
              } else {
                console.log('Update on ' + ip + ' BENCH test OK.');
              }
            } else {
              console.log('Failed to update node ' + ip);
            }
          } else {
            console.log('Bad stuff happened while running updateZelBench' + ip);
          }
        }
      }
    }
  }, 2000);
}

async function massZelBenchUpdate2() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    const ipsAll = ["75.119.137.132", "75.119.130.20", "46.107.168.224", "91.201.40.253", "206.81.14.229", "95.216.218.48", "94.130.153.193", "159.69.54.83", "116.203.33.236", "193.188.15.161", "5.189.189.194"];
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      // const fluxVersion = await getFluxVersion(ip);
      // console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      // if (fluxVersion) {
      const zelbenchVersion = await getZelBenchVersion(ip);
      console.log(i + " " + ip + " " + zelbenchVersion);
      if (zelbenchVersion < 231) {
        console.log('Updating ' + ip);
        updateZelBenchFast(ip);
      }
      // }
    }
  }, 2000);
}

async function massZelCashUpdate2() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    const ipsAll = Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      i++
      const zelcashVersion = await getZelCashVersion(ip);
      console.log(zelcashVersion);
      if (zelcashVersion < 5020050) {
        console.log('Updating ' + ip);
        updateZelCashFast(ip);
      }
    }
  }, 2000);
}

async function massZelBenchCheck() {
  loadLogins();
  let i = 0;
  setTimeout(async () => {
    const ipsAll = await getIPaddresses();
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    const badIps = [];
    console.log(totalNodes);
    for (const ip of ips) {
      i++;
      const zelbenchVersion = await getZelBenchVersion(ip);
      if (zelbenchVersion && zelbenchVersion < 231) {
        console.log(i + ' Update on ' + ip + ' ERROR');
        badIps.push(ip);
      }
    }
    console.log(JSON.stringify(badIps));
  }, 2000);
}

async function getBadFluxScannedHeights() {
  const ipsObtained = await getIPaddresses();
  let badFluxes = [];
  let badFluxBalance = [];
  let i = 1;
  if (ipsObtained.length > 0) {
    setTimeout(async () => {
      for (const ip of ipsObtained) {
        const height = await getFluxScannedHeight(ip);
        if (height < 576113) {
          badFluxes.push(ip);
          console.log(ip + ' IS A NOT SYNCED');
        } else {
          console.log(i + ' ' + ip + ' ' + height);
          const balance = await getBalance(ip, 't1TRUNKQMx1DVzym4d2Ay5E1dudEcHiyk9C');
          if (balance !== 10024750000000) {
            badFluxBalance.push(ip);
            console.log(i + ' ' + ip + ' balance is bad ' + balance);
          }
        }
        i++;
      }
      setTimeout(() => {
        console.log(badFluxes);
        console.log(badFluxBalance);
      }, 1000);
    }, 2000);
  }
}

async function getBalance(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const updateResponse = await axiosGet(`http://${adjIp}:${adjPort}/daemon/getbalance`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    if (updateResponse.data.status === 'success') {
      return true
    } else {
      throw false
    }
  } catch (error) {
    return false
  }
}

async function amIAdmin() {
  loadLogins();
  let i = 1;
  const admins = [];
  setTimeout(async () => {
    const ips = Object.keys(logins)
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const admin = await getBalance(ip);
      if (admin) {
        console.log('admin on ' + ip);
        admins.push(ip)
      } else {
        console.log(i + ' ' + ip);
      }
      i++;
    }
    setTimeout(() => {
      console.log(admins);
    }, 1000);
  }, 2000);
}

async function startFolding(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    await axiosGet(`http://${adjIp}:${adjPort}/apps/installtemporarylocalapp/foldingathome`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    return true;
  } catch (error) {
    return false
  }
}

async function removeFolding(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const response = await axiosGet(`http://${adjIp}:${adjPort}/apps/appremove/PresearchNode1646065882374`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    console.log(response.data)
    return true;
  } catch (error) {
    console.log(error);
    return false
  }
}

async function removeDibiFetch(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const response = await axiosGet(`http://${adjIp}:${adjPort}/apps/redeploy/KadenaChainWebNode/true`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 2000,
    });
    console.log(response.data)
    return true;
  } catch (error) {
    console.log(error);
    return false
  }
}

async function getKadenaLocations() {
  try {
    const response = await axiosGet('https://stats.runonflux.io/kadena/allnodes');
    const ips = [];
    response.data.data.forEach((app) => {
      ips.push(app.ip);
    });
    console.log(JSON.stringify(ips));
    console.log(ips.length);
    return ips;
  } catch (error) {
    console.log(error);
  }
}

async function getApplicationLocations(application) {
  try {
    const response = await axiosGet(`https://api.runonflux.io/apps/location/${application}`, {
      timeout: 4567,
    });
    const ips = []
    response.data.data.forEach((instance) => {
      ips.push(instance.ip);
    });
    console.log(JSON.stringify(ips))
    console.log(ips.length);
    return true;
  } catch (error) {
    console.log(error);
    return false
  }
}

async function pauseKadena(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const response = await axiosGet(`http://${adjIp}:${adjPort}/apps/appunpause/KadenaChainWebNode`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    console.log(response.data)
    return true;
  } catch (error) {
    console.log(error);
    return false
  }
}

async function massRemoveDibiFetch(ips) {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    // const ips = ["152.228.141.255", "62.171.146.55", "95.216.213.163", "176.126.47.137", "95.161.13.44", "193.188.15.178", "82.37.1.113", "72.194.73.254", "193.34.145.254", "95.111.230.98", "207.244.238.183", "75.119.140.68", "78.214.200.69", "159.69.54.207", "5.13.112.249", "75.119.157.98", "173.212.253.185", "81.250.143.48", "144.91.125.106", "178.18.251.110", "206.81.18.160", "193.188.15.167", "95.111.251.107", "161.97.116.230", "75.119.133.69", "62.171.163.219", "161.97.141.146", "95.111.230.75", "212.76.131.111", "98.111.139.233", "212.76.131.116", "159.69.185.44", "95.216.142.156", "91.228.56.157", "62.171.186.131", "173.212.216.180", "173.249.37.4", "161.97.90.183", "75.73.255.102", "212.76.131.113", "161.97.183.19", "207.244.226.251", "195.206.229.64", "207.244.229.200", "62.171.162.149", "167.86.77.149", "23.124.56.141", "95.111.226.65", "62.171.146.17", "144.91.66.23", "159.69.194.193", "95.111.239.60", "95.111.235.124", "209.145.50.124", "159.69.54.83", "173.249.35.202", "193.188.15.252", "144.91.65.69", "161.97.124.103", "173.249.53.56", "161.97.102.204", "161.97.97.227", "209.145.58.55", "164.68.127.210", "84.44.151.75", "164.68.127.228", "144.91.87.71", "167.86.98.222", "173.249.21.3", "209.145.53.60", "164.68.101.236", "62.171.166.58", "75.119.157.8", "195.201.141.128", "194.233.67.22", "207.244.234.248", "75.119.157.162", "194.163.130.22", "95.111.245.69", "167.86.77.6", "144.91.92.5", "95.111.233.248", "95.111.233.251", "62.171.189.166", "207.180.223.75", "207.180.196.222", "193.188.15.155", "99.98.217.243", "95.216.124.199", "173.212.251.209", "75.119.134.102", "173.212.252.18", "193.188.15.234", "144.91.116.117", "75.119.156.124", "95.216.80.110", "207.180.237.118", "161.97.163.220", "62.171.138.114", "193.188.15.157", "193.188.15.227", "213.136.87.20", "188.239.61.196", "95.216.80.111", "75.119.137.56", "91.158.95.34"];
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const folding = await removeDibiFetch(ip);
      if (folding) {
        console.log("hurray")
      } else {
        console.log(ip);
      }
      i++;
    }
  }, 2000);
}

async function isMessageOrError(ip) {
  try {
    const axiosConfig = {
      timeout: 4567,
    };
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const mesRes = await axiosGet(`http://${adjIp}:${adjPort}/apps/temporarymessages`, axiosConfig);
    if (mesRes.data.data.length === 1) {
      return true;
    } else {
      console.log('kaaaapppaaa');
      return false;
    }
  } catch (error) {
    return false;
  }
}

async function massCheckMessage() {
  let i = 1;
  const admins = [];
  const ips = await getIPaddresses();
  const totalNodes = ips.length;
  console.log(totalNodes);
  for (const ip of ips) {
    const okok = await isMessageOrError(ip);
    if (okok === true) {
      console.log(i + 'ok ' + ip);
    } else {
      console.log('not ok on ' + ip);
      admins.push(ip)
    }
    i++;
  }
  setTimeout(() => {
    console.log(admins);
  }, 1000);
}

async function stopBlocking(ip) {
  try {
    const axiosConfig = {
      timeout: 4567,
    };
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    await axiosGet(`http://${adjIp}:${adjPort}/explorer/stop`, axiosConfig);
    return true;
  } catch (error) {
    return false;
  }
}

async function stopBlockProcessing() {
  const ips = [
    '78.46.138.249',
    '78.46.225.128',
    '78.47.186.73',
    '78.47.187.148',
    '88.99.37.192',
    '88.99.80.124',
    '78.47.171.161',
    '116.202.21.109',
    '78.47.227.245',
    '95.216.218.48',
    '116.202.22.239',
    '116.202.25.66'
  ]
  let i = 0;
  const totalNodes = ips.length;
  console.log(totalNodes);
  for (const ip of ips) {
    const okok = await stopBlocking(ip);
    console.log(i);
    i++;
  }
}

async function reindexExplorer(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const axiosConfig = {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    };
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const response = await axiosGet(`http://${adjIp}:${adjPort}/explorer/reindex/true`, axiosConfig);
    // console.log(response);
    return response.data.data
  } catch (error) {
    return error.message;
  }
}

async function checkNewDatabase(ip) {
  try {
    const axiosConfig = {
      timeout: 4567,
    };
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const response = await axiosGet(`http://${adjIp}:${adjPort}/explorer/utxo/t3c51GjrkUg7pUiS8bzNdTnW2hD25egWUih`, axiosConfig);
    const data = response.data.data;
    console.log(data);
    if (data[0]) {
      if (data[0].vout === 1) {
        return false;
      }
      return true;
    }
    return false
  } catch (error) {
    return false;
  }
}

async function massCheckNewDatabase() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    const ips = Object.keys(logins)
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const reindexNeeded = await checkNewDatabase(ip);
      console.log(`Flux ${i} ${ip} ${reindexNeeded}`);
      i++
      if (reindexNeeded) {
        const reindexResponse = await reindexExplorer(ip);
        console.log('Reindexing Flux on ' + ip + ': ' + (reindexResponse ? reindexResponse.message : reindexResponse));
      }
    }
  }, 2000);
}

async function getOldFoldingAtHomes() {
  try {
    const response = await axios.get('https://stats.runonflux.io/fluxinfo');
    const badIps = [];
    response.data.data.forEach((flux) => {
      // console.log(flux);
      if (flux.zelapps) {
        if (flux.zelapps.runningapps.length > 0) {
          flux.zelapps.runningapps.forEach((zelapp) => {
            if (zelapp.Names[0] === "/fluxDiBiFetch") {
              badIps.push(flux.ip);
              console.log(flux.ip);
            }
          });
        }
      }
    });
    console.log(JSON.stringify(badIps));
  } catch (error) {
    console.log(error);
  }
}

async function massZelCashErroCheck() {
  loadLogins();
  let i = 0;
  setTimeout(async () => {
    const ipsAll = Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      const zelcashError = await getZelCashError(ip);
      if (zelcashError === "BAD") {
        console.log(`bad ${ip}`);
        restartDaemon(ip);
        // restart zelcash
      } else {
        console.log(ip);
      }
    }
  }, 2000);
}


async function massZelCashCheck() {
  loadLogins();
  let i = 0;
  setTimeout(async () => {
    const ipsAll = await getIPaddresses(); //Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      const zelcashVersion = await getZelCashVersion(ip);
      if (zelcashVersion >= 4000550) {
        console.log('ok');
      } else if (zelcashVersion < 4000550) {
        console.log(ip);
        i++;
        console.log(i);
      } else {
        console.log(zelcashVersion)
      }
    }
  }, 2000);
}

async function masMessageCheck(message) {
  loadLogins();
  let i = 0;
  setTimeout(async () => {
    const ipsAll = await getIPaddresses(); //Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      const zelcashVersion = await getMessage(ip, message);
      if (zelcashVersion === true) {
        console.log('ok');
        console.log(ip);
      } else {
        // console.log('notok');
        // console.log(ip);
      }
    }
  }, 2000);
}

async function rebuildZelFront(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const updateResponse = await axiosGet(`http://${adjIp}:${adjPort}/flux/rebuildhome`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    console.log(updateResponse);
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      console.log(updateResponse.data.data)
      throw updateResponse.data.data;
    }
  } catch (error) {
    console.log(error);
    return 'OK2';
  }
}

async function containsDashboard(ip) {
  try {
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] ? +ip.split(':')[1] - 1 : 16126;
    const response = await axios.get(`http://${ip}:${adjPort}`);
    if (response.data.includes('Flux, Your')) {
      return true;
    }
    return false
  } catch (e) {
    return false
  }
}

async function massCheckContainsDashboard() {
  loadLogins();
  setTimeout(async () => {
    const ipsAll = ["95.111.233.190", "95.111.247.100"]; // await getIPaddresses(); //Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      const dashboardOK = await containsDashboard(ip);
      if (!dashboardOK) {
        await rebuildZelFront(ip);
        console.log(ip);
      }
    }
  }, 2000);
}

async function reconstructHashes(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const updateResponse = await axiosGet(`http://${adjIp}:${adjPort}/apps/reconstructhashes`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    console.log(updateResponse);
  } catch (error) {
    console.log(error);
    return 'OK2';
  }
}

async function removeApp(ip, appname) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const adjIp = ip.split(':')[0];
    const adjPort = ip.split(':')[1] || 16127;
    const response = await axiosGet(`http://${adjIp}:${adjPort}/apps/appremove/${appname}/true`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 44567,
    });
    console.log(response.data)
    return true;
  } catch (error) {
    console.log(error);
    return false
  }
}

async function getApplicationLocationsUninstall(application) {
  try {
    const response = await axiosGet(`https://api.runonflux.io/apps/location/${application}`, {
      timeout: 4567,
    });
    const ips = []
    response.data.data.forEach((instance) => {
      ips.push(instance.ip);
    });
    console.log(ips);
    loadLogins();
    let i = 1;
    const admins = [];
    setTimeout(async () => {
      const totalNodes = ips.length;
      console.log(totalNodes);
      for (const ip of ips) {
        const folding = await removeApp(ip, application);
        if (folding) {
          console.log("hurray")
        } else {
          console.log(ip);
        }
        i++;
      }
      setTimeout(() => {
        console.log(admins);
      }, 1000);
    }, 2000);
    return true;
  } catch (error) {
    console.log(error);
  }
}

async function removeapplications(applications) {
  try {
    for (const app of applications) {
      console.log(`removing ${app.appName} on ${app.ip}`);
      const folding = await removeApp(app.ip, app.appName);
      if (folding) {
        console.log("hurray")
      } else {
        console.log(app.ip);
      }
    }
    return true;
  } catch (error) {
    console.log(error);
  }
}

const remove = [
  [
    { ip: '73.212.247.224', appName: 'explorer' }
  ]
]

// const nodes = ["89.58.13.42","178.18.241.226","202.61.200.238","194.163.166.132","62.171.185.239","194.163.166.131","5.189.157.9","161.97.161.22","95.216.124.196","202.61.202.55","164.68.123.43","202.61.239.158","207.180.210.204","144.91.83.157","207.180.249.81","207.180.251.106","164.68.122.130","185.218.125.231","95.111.226.131","185.252.234.129","89.58.14.206","161.97.88.170","202.61.206.118","161.97.103.214","95.111.228.182","173.249.24.103","66.94.104.246","167.86.99.108","161.97.102.205","88.198.23.116","207.180.213.235","89.58.25.104","194.163.182.156","194.163.163.211","89.58.25.225","202.61.237.47","75.119.135.51","75.119.138.45","173.249.22.199","173.249.60.160","95.111.255.69","161.97.153.110","202.61.194.173","185.215.164.58","23.88.19.178","89.58.3.226","89.58.24.249","161.97.124.100","207.180.205.49","194.163.186.209","161.97.101.200","161.97.102.204","62.171.187.143","62.171.178.237","194.233.72.243","208.87.135.14","95.216.124.203","194.163.146.238","194.163.163.213","185.237.252.247","62.171.166.59","202.61.202.227","202.61.201.56","161.97.130.106","161.97.156.19","194.163.163.209","185.188.250.77","173.249.60.183","161.97.154.69","95.111.243.242","194.163.166.133","75.119.158.36","95.111.232.85","161.97.154.71","161.97.133.161","161.97.99.236","173.212.198.141","64.227.42.55","194.163.163.210","161.97.97.102","164.68.112.202","161.97.183.19","208.87.134.22","162.212.152.110","193.188.15.193","5.189.188.239","65.21.165.2","135.181.125.49","89.166.59.157","194.163.163.214","178.18.240.255","202.61.201.21","89.58.25.205","207.180.240.218","95.216.124.194","89.58.10.47","173.212.254.79","185.217.125.75","95.111.243.248","161.97.141.28","173.212.230.38","207.180.213.214","62.171.173.208","144.91.76.192","62.171.144.23","161.97.97.77","194.163.174.86","95.216.124.204","207.180.250.106","62.171.183.139","194.163.174.85","71.126.67.84","202.61.207.40","62.171.190.167","202.61.207.240","95.216.124.202","135.181.125.51","146.255.194.226","178.18.241.197","202.61.236.30","45.83.104.44","62.171.186.241","89.58.12.39","194.13.80.131","144.91.73.208","95.216.124.199","161.97.110.171","167.86.96.78","161.97.119.215","194.163.130.206","202.61.204.151","89.58.14.17","202.61.237.24","71.126.67.85","202.61.206.120","75.119.128.132","62.171.146.12","89.58.25.54","91.230.111.27","208.87.134.16","185.232.70.252","71.126.67.86","209.145.56.10","144.126.137.171","74.142.7.117","95.216.80.121","95.216.124.195","194.163.163.207","45.132.246.245","62.171.190.19","194.36.144.191","194.163.174.87","202.61.250.53","173.212.238.11","144.91.98.69","62.171.170.200","77.68.103.73","161.97.162.210","202.61.239.147","77.68.76.222","89.58.10.49","178.18.241.199","207.180.215.211","202.61.202.238","62.171.146.21","202.61.204.48","75.119.153.92","75.119.153.4","167.86.93.137","207.180.241.244","5.189.173.167","149.255.39.23","193.188.15.195","95.216.124.209","194.163.148.252","45.129.182.59","95.216.124.201","202.61.207.10","89.58.13.115","62.171.129.78","95.216.124.200","194.163.170.21","194.163.166.134","202.61.202.211","89.58.15.4","194.35.120.80","45.142.176.146","207.180.248.154","95.216.124.208","178.18.244.206","207.180.244.236","95.111.240.33","161.97.164.232","194.163.163.212","207.180.219.104","207.180.244.43","63.250.52.246","167.86.86.3","178.18.243.34","185.237.252.248","5.189.147.106","194.163.161.184","185.237.252.127","89.58.1.245","88.198.23.105","141.94.76.4","75.119.129.69","89.58.8.80","95.111.247.46","207.180.235.244","173.212.192.3","95.111.245.117","62.171.146.18","178.18.253.164","161.97.134.122","144.91.108.196","202.61.201.13","62.171.185.208","62.171.188.152","95.111.233.193","207.180.193.83","144.91.87.50","209.126.81.235","5.189.158.155","147.182.199.182","63.250.53.22","202.61.238.139","89.58.26.53","194.163.168.198","62.171.146.17","207.180.223.23","173.212.225.34","202.61.204.93","194.163.190.243","95.111.233.243","178.18.242.131","94.16.104.218","185.245.182.172","178.18.241.54","167.86.77.6","164.68.122.129","202.61.198.182","167.86.97.60","194.163.163.208","161.97.134.154","161.97.90.182","161.97.147.155","167.86.116.93","173.249.50.74","193.188.15.220","89.233.105.18","202.61.242.230","75.119.159.136","65.21.190.188","89.58.12.71","89.58.27.240","194.163.156.188","194.163.183.182","202.61.205.163","161.97.87.56","173.212.202.225","5.189.175.166","161.97.108.17","146.255.194.230","185.193.67.0","185.193.67.1","74.142.7.119","38.105.209.123","146.255.194.229","93.104.215.90","95.111.236.211","76.67.213.49","161.97.134.198","207.244.249.214","185.239.209.11","74.142.7.121","209.59.164.68","209.182.236.129","172.93.51.145","173.249.25.231","89.58.13.47","89.58.11.113","89.58.14.52","161.97.171.229","89.58.28.83","173.212.251.47","93.104.215.107","95.111.231.173","185.193.67.2","144.91.122.6","194.163.130.22","185.188.250.71","167.86.105.81","185.187.169.116","167.86.95.178","5.189.136.54","89.58.12.152","89.58.26.115","173.212.201.140","89.58.15.95","45.142.177.186","202.61.205.168","109.90.207.31","109.90.125.189","91.192.45.220","95.111.232.102","107.152.42.100","209.59.164.74","108.58.190.254","135.181.165.186","185.217.127.183","46.4.72.119","46.4.72.125","209.250.249.228","46.4.72.110","62.171.147.231","75.119.158.46","144.91.66.78","193.38.34.84","193.38.33.172","194.163.129.118","62.171.177.13","75.119.149.23","45.63.114.193","144.91.108.145","144.91.104.192","82.37.1.113","5.161.42.245","194.163.175.57","45.79.71.219","193.188.15.239","193.188.15.198","193.188.15.174","208.87.135.93","185.202.238.152","194.163.168.39","95.179.142.63","199.247.31.134","173.249.53.56","95.179.186.221","75.119.135.231","75.119.159.254","209.250.255.127","193.38.34.89","173.249.52.26","193.38.34.13","136.244.108.25","75.119.130.25","95.179.135.137","209.250.241.199","144.91.105.147","202.61.203.151","62.171.138.214","136.244.103.2","202.61.227.7","209.145.50.124","207.244.234.198","209.126.2.53","144.126.155.210","209.126.1.201"]

// const a = [];
// remove.forEach((r) => {
//   a.push(r.ip);
//   console.log(a);
// })

// const removeB = [{
//   ip: '95.216.124.196',
//   appName: 'EthereumNodeLight',
//   createad: '1640026622'
// }]
// loadLogins();
// const ip = "161.97.85.103";
// setTimeout(() => {
//   removeFolding(ip);
// }, 2000)
//massZelCashUpdate2();
// getApplicationLocationsUninstall('testapp2');
// getKadenaLocations();
// massAppRestart('KadenaChainWebData');
// massPauseKadena()
// massZelCashErroCheck()
// massZelBenchUpdate2()
// massZelCashCheck();
// massRemoveFolding();
// getOldFoldingAtHomes()
// massStartFolding();
// massFluxUpdate();
// massZelBenchCheck();
// massHardFluxUpdate();
// massCheckContainsDashboard()
// massCheckNewDatabase();
loadLogins();
setTimeout(() => {
  massLogin();
}, 2000)
// getBadFluxScannedHeights();
// massCheckMessage();
// massRemoveDibiFetch();
// massZelCashErroCheck();
// const signature = signMessage("1619938137061r35mcztku9rt92v26wsl0m1ghwyhuwlrki4ur5zso3w",privateKey);
// console.log(signature);
// getBadFLuxVersions();
// massRescanApps();

// loadLogins();
// setTimeout(() => {
//   reconstructHashes('116.203.253.186');
// }, 2000)
// masMessageCheck('63dd0a975ce153e540322bb0ed72ced18e715baff5f7de6ced3ebee7b6526c2d');
// loadLogins();
// const message = {
//   type: 'fluxappregister',
//   version: 1,
//   appSpecifications: {
//     version: 4,
//     name: 'PresearchNode1639733534159',
//     description: 'Presearch is a Decentralized Search Engine - Host your Presearch Node on the Flux Network',
//     owner: '1HrFAWX4PorbhDv5uHpGYZY9CZaB5Kvb9j',
//     compose: [{
//       // eslint-disable-next-line max-len
//       name: 'node', description: 'The Presearch node container', repotag: 'presearch/node:latest', ports: [39361], domains: [''], environmentParameters: ['REGISTRATION_CODE=ba5ac6f70058926ae1b6f48e25d9a6b5'], commands: [], containerPorts: [38253], containerData: '/app/node', cpu: 0.3, ram: 300, hdd: 2, tiered: false,
//     }],
//     instances: 3,
//   },
//   hash: '3a9006cba1dca2877c50bfa5a5ac39d998a5ac74e79bb89ffb13f7bde5489aba',
//   timestamp: 1639733534966,
//   signature: 'IEJHpF4qPrDQhPnJTnT4o4U2LThYO3BaQVL3fbixGMn6Oltl04M4RH6mXipn9WJ6DdDO8LgytuaLORG5GDwgN6g=',
// };
// setTimeout(() => {
//   broadcastMessage('173.212.251.209', message);
// }, 2000)
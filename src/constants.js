const { version } = require('../package.json');

// 不同设备安装路径
const downloadDirectory = process.env[process.platform === 'darwin' ? 'HOME' : 'USERPROFILE'];

module.exports = {
  version,
  downloadDirectory,
};

/* eslint-disable no-param-reassign */
/**
 * @description: 创建项目
 */
const axios = require('axios');
const ora = require('ora');
const path = require('path');
const fs = require('fs');
const Inquirer = require('inquirer');
const { promisify } = require('util');
let downloadGitRepo = require('download-git-repo');
// 把异步的api转成promise
downloadGitRepo = promisify(downloadGitRepo);
const ncp = require('ncp');
// consolidate统一所有的模板引擎
let { render } = require('consolidate').ejs;

render = promisify(render);
const MetalSmith = require('metalsmith');
const { downloadDirectory } = require('./constants');

// 获取模板
async function fetchRepoLst() {
  const tplUrl = 'https://api.github.com/orgs/zhu-cli/repos';
  const { data } = await axios.get(tplUrl);
  return data;
}
// 获取版本
async function fetchTagoLst(template) {
  const tagUrl = `https://api.github.com/repos/zhu-cli/${template}/tags`;
  const { data } = await axios.get(tagUrl);
  return data;
}

// loading Fn
const waitFnLoading = (fn, msg) => async (...args) => {
  const spinner = ora(msg);
  spinner.start();
  const result = await fn(...args).catch((err) => {
    console.log(err);
    spinner.fail();
  });
  spinner.succeed();
  return result;
};

const download = async (repo, tag) => {
  let api = `zhu-cli/${repo}`;
  if (tag) {
    api += `#${tag}`;
  }
  const dest = `${downloadDirectory}/${repo}`;
  await downloadGitRepo(api, dest);
  return dest; // 下载的最终path
};

const copyTpl = async (res, projectName) => {
  await ncp(res, path.resolve(projectName));
};
module.exports = async (projectName) => {
  // 1)先获取模板
  let repos = await waitFnLoading(fetchRepoLst, '🔥 fetching template...')();
  repos = repos.map((item) => item.name);
  const { repo } = await Inquirer.prompt({
    name: 'repo',
    type: 'list',
    message: 'please choice a template to create project',
    choices: repos,
  });
  // 2)获取对应的版本号
  let tags = await waitFnLoading(fetchTagoLst, '🎈 fetching tags...')(repo);
  tags = tags.map((item) => item.name);
  const { tag } = await Inquirer.prompt({
    name: 'tag',
    type: 'list',
    message: 'please choice a tag of template',
    choices: tags,
  });
  // 已获取需求的模板和版本号
  // 把模板缓存到临时的目录里，以备下次使用
  const result = await waitFnLoading(
    download,
    '🍌 download template to cache...',
  )(repo, tag);

  if (!fs.existsSync(path.resolve(result, 'ask.js'))) {
    // 下载到指定目录，直接拷贝使用即可；
    // 拷贝到执行命令的目录下；
    await waitFnLoading(copyTpl, '🍇 copy template to command path')(
      result,
      projectName,
    );
  } else {
    // 复杂的需要模板渲染，渲染后拷贝
    await new Promise((resolve, reject) => {
      MetalSmith(__dirname)
        .source(result) // 需要编译的模板
        .destination(path.resolve(projectName)) // 编译完成后放到指定目录
        .use(async (files, metal, done) => {
          const args = require(path.join(result, 'ask.js'));
          const res = await Inquirer.prompt(args);
          const meta = metal.metadata();
          Object.assign(meta, res); // 将用户输入的值存下来方便下一个use使用
          delete files['ask.js']; // 删除ask.js文件
          done();
        })
        .use((files, metal, done) => {
          const res = metal.metadata();
          Object.keys(files).forEach(async (file) => {
            // 判断是否是.js或者.json文件
            if (file.includes('js') || file.includes('json')) {
              let content = files[file].contents.toString(); // 读取到的文件内容是个Buffer
              // 判断是否是模板
              if (content.includes('<%')) {
                // 渲染用户输入的内容到指定的位置
                content = await render(content, res);
                // 转回Buffer
                files[file].contents = Buffer.from(content);
              }
            }
          });
          done();
        })
        .build((err) => {
          if (err) {
            reject();
          } else {
            resolve();
          }
        });
    });
  }
};

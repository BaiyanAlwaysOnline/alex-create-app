// 1) 解析用户的参数
const program = require('commander');
const path = require('path');
const { version } = require('./constants');

const mapActions = {
  create: {
    alias: 'c',
    description: 'create a project',
    example: ['alex-create-app create <project-name>'],
    action: () => {
      console.log('create');
    },
  },
  config: {
    alias: 'conf',
    description: 'config project variable',
    example: [
      'alex-create-app conf set <k> <v>',
      'alex-create-app conf get <k> ',
    ],
    action: () => {},
  },
  '*': {
    description: 'command not found',
    alias: '',
    example: [''],
    action: () => {},
  },
};

Object.keys(mapActions).forEach((actionName) => {
  program
    .command(actionName)
    .alias(mapActions[actionName].alias)
    .description(mapActions[actionName].description)
    .action(() => {
      if (actionName === '*') {
        console.log(mapActions[actionName].description);
      } else {
        const file = path.resolve(__dirname, actionName);
        require(file)(...process.argv.slice(3));
      }
    });
});

// 监听--help
program.on('--help', () => {
  console.log('\nExample:');
  Object.keys(mapActions).forEach((programItem) => {
    mapActions[programItem].example.forEach((example) => {
      console.log(`  ${example}`);
    });
  });
});

// 解析 process.argv 系统参数
program.version(version).parse(process.argv);

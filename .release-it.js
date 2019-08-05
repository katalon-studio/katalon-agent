const version = process.env.npm_package_version;
const user = 'sonhuynhpham';
const token = '${GITHUB_TOKEN}';

module.exports = {
    git: {
      pushRepo: `https://${user}:${token}@github.com/katalon-studio/katalon-agent.git`,
      changelog: 'git log -1 --pretty=format:"%s%n%n>**Commit:** %h%d%n>**Author:** %an%n>**Date:** %ai%n"',
      tagName: `v${version}`,
      requireCleanWorkingDir: false,
      tag: false,
      commit: false,
      push: false,
    },
    github: {
        release: true,
        releaseName: `Release ${version} 🚧`,
        draft: true,
        assets: ['bin/agentconfig', 'bin/*x64*', 'service.*', 'start.*', 'nssm.exe'],
    },
    npm: false,
    increment: false,
}

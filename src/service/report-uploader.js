const glob = require('glob');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const api = require('../core/api');

class Report {
  constructor(fullPath, dirName) {
    this.path = fullPath;
    this.dirName = dirName;
  }
}

function uploadFile(projectId, batch, folderName, filePath, isEnd, reportType, opts = {}) {
  return api.getUploadInfo(projectId).then(({ body }) => {
    const { uploadUrl } = body;
    const uploadPath = body.path;

    return api.uploadFile(uploadUrl, filePath).then(() => {
      const fileName = path.basename(filePath);
      return api.uploadFileInfo(
        projectId,
        batch,
        folderName,
        fileName,
        uploadPath,
        isEnd,
        reportType,
        opts,
      );
    });
  });
}

function collectReports(folderPaths = [], reportPattern = '*') {
  const reports = [];
  folderPaths.forEach((folderPath) => {
    const pathPattern = path.resolve(folderPath, reportPattern);
    const reportPaths = glob.sync(pathPattern, { nodir: true });
    reportPaths
      .map((reportPath) => new Report(reportPath, path.dirname(reportPath)))
      .forEach((report) => reports.push(report));
  });
  return reports;
}

module.exports = {
  uploadReports(projectId, folderPaths, reportType, reportPattern, opts = {}) {
    const reports = collectReports(folderPaths, reportPattern);
    const [first, ...rest] = reports;
    if (!first) {
      return Promise.resolve();
    }

    const batch = `${new Date().getTime()}-${uuidv4()}`;

    const uploadPromises = rest.map((report) =>
      uploadFile(projectId, batch, report.dirName, report.path, false, reportType, opts),
    );

    return Promise.all(uploadPromises).then(() =>
      uploadFile(projectId, batch, first.dirName, first.path, true, reportType, opts),
    );
  },
};

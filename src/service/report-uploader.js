const glob = require('glob');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const katalonRequest = require('../helper/katalon-request');

function uploadFile(projectId, batch, folderName, filePath, isEnd, reportType, opts = {}) {
  return katalonRequest.getUploadInfo(projectId).then(({ body }) => {
    const { uploadUrl } = body;
    const uploadPath = body.path;

    return katalonRequest.uploadFile(uploadUrl, filePath).then(() => {
      const fileName = path.basename(filePath);
      return katalonRequest.uploadFileInfo(
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

module.exports = {
  uploadReports(projectId, folderPath, reportType, reportPattern, opts = {}) {
    const pathPattern = path.resolve(folderPath, reportPattern);
    const reports = glob.sync(pathPattern, { nodir: true });
    const dirNames = reports.map((report) => path.dirname(path.relative(folderPath, report)));

    const [first, ...rest] = reports;
    const [firstDirName, ...restDirNames] = dirNames;
    if (!first) {
      return Promise.resolve();
    }

    const batch = `${new Date().getTime()}-${uuidv4()}`;

    const uploadPromises = rest.map((report, idx) =>
      uploadFile(projectId, batch, restDirNames[idx], report, false, reportType, opts),
    );

    return Promise.all(uploadPromises).then(() =>
      uploadFile(projectId, batch, firstDirName, first, true, reportType, opts),
    );
  },
};

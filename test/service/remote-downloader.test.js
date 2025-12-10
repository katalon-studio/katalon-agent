const fs = require('fs-extra');
const path = require('path');
const { KatalonStudioDownloader } = require('../../src/service/remote-downloader');
const file = require('../../src/core/file');

jest.mock('../../src/core/file');
jest.mock('fs-extra');

const logger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};

describe('KatalonStudioDownloader test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should rename Katalon_Studio_Engine folder to kre after extraction', async () => {
    const downloadUrl = 'https://example.com/katalon-studio.zip';
    const targetDir = '/Users/test/.katalon/10.4.2';
    const extractedFiles = [
      { path: 'Katalon_Studio_Engine_MacOS-10.4.2/Contents/MacOS/katalonc' },
      { path: 'Katalon_Studio_Engine_MacOS-10.4.2/Contents/Info.plist' },
    ];

    file.downloadAndExtract.mockResolvedValue(extractedFiles);
    fs.existsSync.mockReturnValue(true);
    fs.renameSync.mockImplementation(() => {});

    const downloader = new KatalonStudioDownloader(logger, downloadUrl);
    const result = await downloader.download(targetDir);

    expect(file.downloadAndExtract).toHaveBeenCalledWith(downloadUrl, targetDir, false, logger);
    expect(fs.existsSync).toHaveBeenCalledWith(
      path.join(targetDir, 'Katalon_Studio_Engine_MacOS-10.4.2'),
    );
    expect(fs.renameSync).toHaveBeenCalledWith(
      path.join(targetDir, 'Katalon_Studio_Engine_MacOS-10.4.2'),
      path.join(targetDir, 'kre'),
    );
    expect(logger.info).toHaveBeenCalledWith('Renaming Katalon_Studio_Engine_MacOS-10.4.2 to kre');
    expect(result).toEqual(extractedFiles);
  });

  it('should rename Katalon_Studio_Engine_Windows folder to kre', async () => {
    const downloadUrl = 'https://example.com/katalon-studio.zip';
    const targetDir = 'C:\\Users\\test\\.katalon\\10.4.2';
    const extractedFiles = [
      { path: 'Katalon_Studio_Engine_Windows-10.4.2/katalonc.exe' },
      { path: 'Katalon_Studio_Engine_Windows-10.4.2/plugins/plugin.jar' },
    ];

    file.downloadAndExtract.mockResolvedValue(extractedFiles);
    fs.existsSync.mockReturnValue(true);
    fs.renameSync.mockImplementation(() => {});

    const downloader = new KatalonStudioDownloader(logger, downloadUrl);
    await downloader.download(targetDir);

    expect(fs.renameSync).toHaveBeenCalledWith(
      path.join(targetDir, 'Katalon_Studio_Engine_Windows-10.4.2'),
      path.join(targetDir, 'kre'),
    );
    expect(logger.info).toHaveBeenCalledWith('Renaming Katalon_Studio_Engine_Windows-10.4.2 to kre');
  });

  it('should rename Katalon_Studio_Engine_Linux folder to KRE', async () => {
    const downloadUrl = 'https://example.com/katalon-studio.zip';
    const targetDir = '/home/user/.katalon/10.4.2';
    const extractedFiles = [
      { path: 'Katalon_Studio_Engine_Linux_64-10.4.2/katalonc' },
      { path: 'Katalon_Studio_Engine_Linux_64-10.4.2/configuration/config.ini' },
    ];

    file.downloadAndExtract.mockResolvedValue(extractedFiles);
    fs.existsSync.mockReturnValue(true);
    fs.renameSync.mockImplementation(() => {});

    const downloader = new KatalonStudioDownloader(logger, downloadUrl);
    await downloader.download(targetDir);

    expect(fs.renameSync).toHaveBeenCalledWith(
      path.join(targetDir, 'Katalon_Studio_Engine_Linux_64-10.4.2'),
      path.join(targetDir, 'kre'),
    );
    expect(logger.info).toHaveBeenCalledWith('Renaming Katalon_Studio_Engine_Linux_64-10.4.2 to kre');
  });

  it('should not rename folder if it does not start with Katalon_Studio_Engine_', async () => {
    const downloadUrl = 'https://example.com/some-other-package.zip';
    const targetDir = '/Users/test/.katalon/10.4.2';
    const extractedFiles = [
      { path: 'SomeOtherFolder/file1.txt' },
      { path: 'SomeOtherFolder/file2.txt' },
    ];

    file.downloadAndExtract.mockResolvedValue(extractedFiles);
    fs.existsSync.mockReturnValue(true);

    const downloader = new KatalonStudioDownloader(logger, downloadUrl);
    await downloader.download(targetDir);

    expect(fs.renameSync).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Renaming'));
  });

  it('should not rename if extracted folder does not exist', async () => {
    const downloadUrl = 'https://example.com/katalon-studio.zip';
    const targetDir = '/Users/test/.katalon/10.4.2';
    const extractedFiles = [
      { path: 'Katalon_Studio_Engine_MacOS-10.4.2/Contents/MacOS/katalonc' },
    ];

    file.downloadAndExtract.mockResolvedValue(extractedFiles);
    fs.existsSync.mockReturnValue(false);

    const downloader = new KatalonStudioDownloader(logger, downloadUrl);
    await downloader.download(targetDir);

    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.renameSync).not.toHaveBeenCalled();
  });

  it('should handle empty extractedFiles array', async () => {
    const downloadUrl = 'https://example.com/katalon-studio.zip';
    const targetDir = '/Users/test/.katalon/10.4.2';
    const extractedFiles = [];

    file.downloadAndExtract.mockResolvedValue(extractedFiles);

    const downloader = new KatalonStudioDownloader(logger, downloadUrl);
    const result = await downloader.download(targetDir);

    expect(fs.existsSync).not.toHaveBeenCalled();
    expect(fs.renameSync).not.toHaveBeenCalled();
    expect(result).toEqual(extractedFiles);
  });

  it('should handle null extractedFiles', async () => {
    const downloadUrl = 'https://example.com/katalon-studio.zip';
    const targetDir = '/Users/test/.katalon/10.4.2';

    file.downloadAndExtract.mockResolvedValue(null);

    const downloader = new KatalonStudioDownloader(logger, downloadUrl);
    const result = await downloader.download(targetDir);

    expect(fs.existsSync).not.toHaveBeenCalled();
    expect(fs.renameSync).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('should handle files in subdirectories correctly', async () => {
    const downloadUrl = 'https://example.com/katalon-studio.zip';
    const targetDir = '/Users/test/.katalon/10.4.2';
    const extractedFiles = [
      { path: 'Katalon_Studio_Engine_MacOS-10.4.2/deep/nested/path/file.txt' },
    ];

    file.downloadAndExtract.mockResolvedValue(extractedFiles);
    fs.existsSync.mockReturnValue(true);
    fs.renameSync.mockImplementation(() => {});

    const downloader = new KatalonStudioDownloader(logger, downloadUrl);
    await downloader.download(targetDir);

    expect(fs.renameSync).toHaveBeenCalledWith(
      path.join(targetDir, 'Katalon_Studio_Engine_MacOS-10.4.2'),
      path.join(targetDir, 'kre'),
    );
  });

  it('should handle different version numbers in folder name', async () => {
    const downloadUrl = 'https://example.com/katalon-studio.zip';
    const targetDir = '/Users/test/.katalon/11.0.0';
    const extractedFiles = [
      { path: 'Katalon_Studio_Engine_MacOS-11.0.0/katalonc' },
    ];

    file.downloadAndExtract.mockResolvedValue(extractedFiles);
    fs.existsSync.mockReturnValue(true);
    fs.renameSync.mockImplementation(() => {});

    const downloader = new KatalonStudioDownloader(logger, downloadUrl);
    await downloader.download(targetDir);

    expect(fs.renameSync).toHaveBeenCalledWith(
      path.join(targetDir, 'Katalon_Studio_Engine_MacOS-11.0.0'),
      path.join(targetDir, 'kre'),
    );
    expect(logger.info).toHaveBeenCalledWith('Renaming Katalon_Studio_Engine_MacOS-11.0.0 to kre');
  });
});

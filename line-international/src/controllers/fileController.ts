import { Controller, Exception, Get, Params, Post, Req, Res, Query, Delete, Put, Cached, Caches, filterFunctions, $mkdir, $rmdir, $rename, Index, env, $getType, $content, $join, globalEvents, Headers, Auth, BasicAuth, calculateFolderDepth, calculateFileDepth } from "../utils/index.js";
import type { Response, Request } from 'express';
import { dirname, join } from "path";
import { type UploadedFile } from 'express-fileupload';

const fileRootDir = env.server.storagePath;

@Caches()
@Controller('/files')
export class FileController {

  @Cached('search', 1000 * 30)
  @Get('/search/:searchTerm(*)')
  public async searchFiles(@Params('searchTerm') searchTerm: string, @Query('filters') filters: string = '', @Res() res: Response, @Req() req: Request) {
    const searchResult = Index.search(searchTerm, filters);
    return {
      files: searchResult,
      count: searchResult.length
    };
  }

  @Get('/preview/:fileName(*)')
  public async getFilePreview(@Params('fileName') filePath: string, @Res() res: Response) {
    const path = $join(fileRootDir, filePath);
    const fileType = await $getType(path);
    if (fileType) {
      const fileName = filePath.split('/').pop();
      const discoveredFile: DiscoveredFile = {
        depth: 0,
        fileName: fileName,
        filePath: filePath,
        isDirectory: false,
      };

      if (filterFunctions.type.image(discoveredFile)) {
        res.contentType(fileType);
        res.sendFile(`${fileRootDir}/${filePath}`);
        return;
      }
      else {
        res.contentType(fileType);
        res.send((await $content(path)).split('\n').slice(0, 10).map((line) => line.substring(0, 100)).join('\n'));
        return;
      }
    }
    return new Exception('File not found', 'FileNotFoundException', {
      status: 404
    });
  }

  @Get('/')
  public async getFiles() {
    return Index.getFiles('/', 1);
  }

  // DIRECTORY OPERATIONS

  @Post('/directory/:folderName(*)')
  public async createFolder(@Params('folderName') folderName: string, @Auth('basic') basicAuth: BasicAuth) {
    if (!basicAuth) return new Exception('Unauthorized', 'UnauthorizedException');

    await $mkdir($join(fileRootDir, folderName));

    const file = {
      fileName: folderName.split('/').pop() as string,
      filePath: folderName,
      isDirectory: true,
      depth: calculateFolderDepth(folderName)
    };

    Index.add(file);

    globalEvents.emit('audit', basicAuth.username, `Created folder ${folderName}`, 'create', file);

    return file;
  }

  @Delete('/directory/:folderName(*)')
  public async deleteFolder(@Params('folderName') folderName: string, @Auth('basic') basicAuth: BasicAuth) {
    if (!basicAuth) return new Exception('Unauthorized', 'UnauthorizedException');

    await $rmdir($join(fileRootDir, folderName));

    const file = {
      fileName: folderName.split('/').pop() as string,
      filePath: folderName,
      isDirectory: true,
      depth: calculateFolderDepth(folderName)
    };

    Index.delete(file);

    globalEvents.emit('audit', basicAuth.username, `Deleted folder ${folderName}`, 'delete', file);

    return file;
  }

  @Get('/directory')
  @Get('/directory/:dirName(*)')
  public async getDirectory(@Params('dirName') dirName: string, @Res() res: Response, @Req() req: Request) {
    const files = Index.getFiles(dirName, 1);

    return {
      files: files,
      count: files.length
    };
  }

  // FILE OPERATIONS

  @Get('/file/:fileName(*)')
  public async getFile(@Params('fileName') fileName: string, @Res() res: Response, @Req() req: Request, @Auth('basic') basicAuth: BasicAuth) {
    if (!basicAuth) return new Exception('Unauthorized', 'UnauthorizedException');

    const fileMimeType = await $getType($join(fileRootDir, fileName));

    if (fileMimeType) {
      globalEvents.emit('audit', basicAuth.username, `Downloaded file ${fileName}`, 'download', null);
      res.contentType('application/octet-stream');
      res.sendFile(`${fileRootDir}/${fileName}`);
      return;
    }

    return null;
  }

  @Post('/file')
  @Post('/file/:dirName(*)')
  public async uploadFile(@Params('dirName') dirName: string = '', @Req() req: Request, @Auth('basic') basicAuth: BasicAuth) {
    if (!basicAuth) return new Exception('Unauthorized', 'UnauthorizedException');

    const files = req.files?.files instanceof Array ? req.files?.files as UploadedFile[] : [req.files?.files as UploadedFile];
    const processedFiles: DiscoveredFile[] = [];

    if (dirName.charAt(0) !== '/') {
      dirName = '/' + dirName;
    }

    const path = $join(fileRootDir, dirName);


    if (!files) return {
      files: [],
      count: 0
    };

    for (const file of files) {
      await file.mv($join(path, file.name));
      const fileObj = {
        fileName: file.name,
        filePath: $join(dirName, file.name),
        isDirectory: false,
        depth: calculateFileDepth($join(dirName, file.name))
      } as DiscoveredFile;
      processedFiles.push(fileObj);
      globalEvents.emit('audit', basicAuth.username, `Uploaded files ${processedFiles.map((file) => file.fileName).join(', ')}`, 'create', fileObj);
    }

    Index.add(...processedFiles);

    return {
      files: processedFiles,
      count: processedFiles.length
    };
  }

  @Delete('/file/:fileName(*)')
  public async deleteFile(@Params('fileName') fileName: string, @Auth('basic') basicAuth: BasicAuth) {
    if (!basicAuth) return new Exception('Unauthorized', 'UnauthorizedException');

    await $rmdir($join(fileRootDir, fileName));

    const file = {
      fileName: fileName.split('/').pop() as string,
      filePath: fileName,
      isDirectory: false,
      depth: calculateFileDepth(fileName)
    } as DiscoveredFile;

    Index.delete(file);


    globalEvents.emit('audit', basicAuth.username, `Deleted file ${fileName}`, 'delete', file);

    return file;
  }

  @Put('/file/:newName/:fileName(*)')
  public async renameFile(@Params('newName') newName: string, @Params('fileName') fileName: string, @Auth('basic') basicAuth: BasicAuth) {
    if (!basicAuth) return new Exception('Unauthorized', 'UnauthorizedException');

    await $rename(newName, $join(fileRootDir, fileName));

    const newFileName = $join(fileName, '..', newName);

    const file = {
      fileName: newName,
      filePath: newFileName,
      isDirectory: false,
      depth: calculateFileDepth(newFileName)
    };

    Index.update(fileName, file);

    globalEvents.emit('audit', basicAuth.username, `Renamed file ${fileName} to ${newName}`, 'update', file);

    return file;
  }
}
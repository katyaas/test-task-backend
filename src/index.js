'use strict';

import express from 'express';
import Bb from 'bluebird';
import path from 'path';
import cors from 'cors';
import multipart from 'connect-multiparty';
import bodyParser from 'body-parser';
import mime from 'mime-types';

import config from './config';

const dir = path.join(__dirname, '..', config.directory);
const fs = Bb.promisifyAll(require('fs'));

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

const app = express();
app.use(cors());
const jsonParser = bodyParser.json();
const multipartMiddleware = multipart();

function readFileStats(files) {
  return Promise.all(
    files.map(async (file) => {
      const filePath = path.join(dir, file.name || file);
      const stats = await fs.statAsync(filePath);
      return { fileName: file.name, size: stats.size, updatedAt: stats.mtime, mime: mime.lookup(filePath) }
    })
  );
}

app.get('/files', async (req, res) => {
  let files = await fs.readdirAsync(dir, { withFileTypes: true });
  files = files.filter(file => file.isFile());
  const fileStats = await readFileStats(files);
  res.status(200).send({
    files: fileStats,
  });
});

app.get('/files/:fileName', async (req, res) => {
  try {
    const filePath = path.join(dir, req.params.fileName);
    const fileMime = mime.lookup(filePath);
    const fileStats = await readFileStats([req.params.fileName]);
    if (fileMime.startsWith('text/') || fileMime.startsWith('image/')) {
      res.writeHead(200, {
        'Content-Type': fileMime,
        'Content-Length': fileStats[0].size,
        'Transfer-Encoding': 'chunked'
      });
      const file = fs.createReadStream(filePath);
      file.pipe(res);
    } else {
      res.status(400).send({
        error: `Mime type ${fileMime} not supported`,
      });
    }
  } catch(err) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  }
});

app.post('/files', multipartMiddleware, async (req, res) => {
  if (!req.files) {
    res.status(400).send({
      error: 'No files to upload',
    });
  }
  const files = Object.values(req.files).map(item => Object.values(item)[0]);
  await Promise.all(files.map(file => fs.copyFileAsync(file.path, path.join(dir, file.name))));
  const fileStats = await readFileStats(files);
  await Promise.all(files.map(file => fs.unlinkAsync(file.path)));
  res.status(201).send({
    files: fileStats,
  });
});

app.delete('/files', jsonParser, async (req, res) => {
  if (!req.body.fileName) {
    res.status(400).send({
      error: 'No files to remove',
    });
  }
  await fs.unlinkAsync(path.join(dir, req.body.fileName));
  res.status(200).send({
    success: true,
  });
});

app.listen(config.port, () => {
  console.log(`server running on port ${config.port}`)
});
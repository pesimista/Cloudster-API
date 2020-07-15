const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const request = require('request');

let location = 'Folder';
const upload = multer({ dest: location + '/' });
const app = express();
const react = express();

const os = require('os');

const ranger = require('./ranger');
const mdb = require('./dataBase');

const net = os.networkInterfaces();

app.set('views', process.cwd());
const _ = process.platform === 'win32' ? '\\' : '/';

/*----------------------------------------------------------*/
/*--------------------Express Middleware--------------------*/
/*----------------------------------------------------------*/
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

react.use(bodyParser.urlencoded({ extended: false }));
react.use(bodyParser.json());
react.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

app.use((req, res, next) => {
  let at = new Date();
  let time = `${at.getHours()}:${at.getMinutes()}:${at.getMilliseconds()}`;
  console.log(`\n--------------Connection enabled with client--------------`);
  console.log(req.headers['user-agent']);
  console.log(req.ip, '\tAt ' + time);
  next();
});
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});
app.use(express.static(__dirname + _));
/*----------------------------------------------------------*/
/*--------------------Express Middleware--------------------*/
/*----------------------------------------------------------*/

app.get('/api/dir', (req, res) => {
  let dir;
  net[Object.keys(net)[0]].forEach((ip) => {
    if (ip.family === 'IPv4') {
      dir = ip.address;
    }
  });
  res.send({ IP: dir });
});

/*--------------------Deprecated--------------------*/
app.get('/api/files', (req, res) => {
  res.send(ranger.getFiles(req.query.dir || ''));
});
/*--------------------Deprecated--------------------*/

/**/
function getFilesById(req, res) {
  try {
    let file = ranger.getFile(req.params.id);
    console.log(`get /api/files/ ${file} \t| Lvl ${req.query.lvl}`);
    if (file === undefined) {
      res.status(404).send('Not found');
      console.log('UNDEFINED');
    }
    console.log('Dependecy path : ', ranger.getDependency(file));
    res.sendFile(ranger.getDependency(file));
  } catch (e) {
    res.status(404).send('Error in request');
    console.log('Error in request', e);
  }
}
app.get('/api/files/:id', getFilesById);

// Download file
app.get('/api/download/:id', (req, res) => {
  let file = ranger.getFile(req.params.id);
  console.log('Attemp to download', req.params.id);
  console.log('Query', req.query);
  // res.send(req.query);
  if (req.query.user) {
    mdb.userExists(parseInt(req.query.user), () => {
      mdb.makeReg({
        userId: req.query.user,
        fileId: req.params.id,
        accion: 'download',
      });
      res.download(ranger.getDependency(file));
    });
  } else {
    console.log('Here');
    res.status(404).send('Missing user id');
  }
});

// Get file inFo
app.get('/api/fileInfo/:id', (req, res) => {
  console.log(`GET /api/fileInfo/${req.params.id}`);
  let fileInfo = ranger.getFile(req.params.id);
  console.log(fileInfo);
  res.send(fileInfo);
});

app.get('/api/allFiles', (req, res) => {
  let files = ranger.getAllFiles();
  res.send(files);
});

//Sends the info about the files in this folder
app.get('/api/allFiles/:id', (req, res) => {
  // res.send(typeof req.params.id);
  const nivel = req.query.user ? parseInt(req.query.user) : 1;
  // console.log(nivel);
  // console.log(ranger.getAllFiles());
  let filtered = ranger
    .getAllFiles()
    .filter((item) => item.dependency == req.params.id && item.nivel <= nivel);
  if (filtered.length === 0) {
    filtered = [
      {
        id: 0,
        name: '',
        url: '',
        ext: '',
        isFile: false,
        lastModified: 0,
        fullSize: 0,
        size: 0,
        nivel: 1,
        dependency: req.params.id,
      },
    ];
  }
  console.log(`Get /api/allFiles/${req.params.id}`);
  console.log(`Sending ${filtered.lenght} files`);
  res.send(filtered);
});

app.get('/api/users', (req, res) => {
  console.log(`Get /api/users/`);
  mdb.getUsers((data) => {
    res.send(data);
  });
});
app.get('/api/users/:id', (req, res) => {
  console.log(`Get /api/users/${req.params.id}`);
  mdb.getUsers((data) => {
    let toSend = data.filter((f) => f.id === parseInt(req.params.id));
    if (toSend.length === 0) res.status(404).send({ response: 'Not found' });
    else res.send(toSend[0]);
  });
});
app.get('/api/questions/:usuario', (req, res) => {
  console.log(`Get /api/questions/ | user ${req.params.usuario}`);
  mdb.getQuestions(req.params.usuario, (data) => {
    res.send(data);
  });
});
app.get('/api/questions', (req, res) => {
  console.log(`Get /api/questions`);
  mdb.getQuestionList((data) => {
    res.send(data);
  });
});

/*--------------------POST--------------------*/
app.post('/api/file', upload.single('file'), (req, res, next) => {
  console.log('Nombre original  :', req.file.originalname);
  console.log('Nombre de archivo:', req.file.filename);

  console.log(req.body);

  let dir;
  const where = req.query.whereTo || '0';
  if (where) {
    dir = ranger.wd;
  } else {
    console.log(req.query);
    let file = ranger.getFile(req.query.whereTo);
    dir = ranger.getDependency(file);
  }
  ranger.rename(
    req.file.path,
    `${dir}${_}${req.file.originalname}`,
    where,
    (message) => res.send(message)
  );
  console.log('Received');
});

app.post('/api/login', (req, res, next) => {
  // console.log(req);
  const data = req.body;
  console.log('data', data);
  mdb.login({ usuario: data.usuario, password: data.password }, (reply) => {
    console.log(reply.response);
    res.send(reply);
  });
});

app.post('/api/register', (req, res, next) => {
  const data = req.body;
  mdb.register(data, (reply) => {
    console.log(reply.response);
    res.send(reply);
  });
});

app.post('/api/update/usuario', (req, res, next) => {
  const data = req.body;
  if (!req.query.nivel) {
    console.log('Cambiando informacion de usuario');
    mdb.changeUserData(data, (reply) => {
      console.log(reply.response);
      res.send(reply);
    });
  } else {
    console.log('Cambiando Nivel de usuario');
    mdb.setNivel(data, () => res.status(200).send({ response: 'oll korrect' }));
  }
});
app.post('/api/update/file', (req, res, next) => {
  console.log('Cambiando nivel de archivo');
  const data = req.body;
  ranger.setNivel(data.id, data.newNivel);
  res.status(200).send({ response: 'oll korrect' });
});

app.post('/api/checkQuestions', (req, res, next) => {
  const data = req.body;
  console.log('Check :', req.body);
  mdb.checkQuestions(
    {
      usuario: data.usuario,
      respuesta1: data.respuesta1,
      respuesta2: data.respuesta2,
    },
    (reply) => {
      console.log(reply.response);
      res.send(reply);
    }
  );
});
/*--------------------POST--------------------*/

/*--------------------PUT --------------------*/
app.post('/api/password', (req, res, next) => {
  const data = req.body;
  console.log('PUT /api/password');
  console.log('data : ', data);
  mdb.changePassword(data, (data) => {
    console.log(data.response);
    res.send(data);
  });
});

/*--------------------Delete --------------------*/
app.delete('/api/users/:id', (req, res) => {
  console.log(`Deleting user...`);
  mdb.deleteUser(req.params.id, (reply) => {
    console.log(reply.response, reply.usuario);
    res.send(reply);
  });
});

/*--------------------Delete --------------------*/

// PORT
const port = process.env.PORT || 6969;

setTimeout(() => {
  app.listen(port, () => {
    console.log('\n');
    console.log(`Express Running on ${process.platform}`);
    Object.keys(net).forEach((type) => {
      net[type].forEach((ip) => {
        if (ip.family === 'IPv4') {
          console.log(`${type}\t: ${ip.address}:${process.env.PORT || 6969}`);
        }
      });
    });
    //  console.log(os.hostname());
  });
}, 1000);

react.use(express.static(__dirname));
react.use(express.static(__dirname + _ + 'build'));
react.get('/:route', (req, res) => {
  console.log('REACT --- ', req.url);
  res.sendFile(__dirname + _ + 'build' + _ + 'index.html');
});
react.post('/api/file', upload.single('file'), (req, res, next) => {
  console.log('Nombre original  :', req.file.originalname);
  console.log('Nombre de archivo:', req.file.filename);

  let dir;
  const where = req.query.whereTo || '0';
  if (where) {
    dir = ranger.wd;
  } else {
    console.log(req.query);
    let file = ranger.getFile(req.query.whereTo);
    dir = ranger.getDependency(file);
  }
  ranger.rename(
    req.file.path,
    `${dir}${_}${req.file.originalname}`,
    where,
    (message) => res.send(message)
  );
  console.log('Received');
});

react.post('/api/*', (req, res) => {
  console.log('login', req.originalUrl);
  if (req.originalUrl.includes('/api/file?whereTo=')) {
    request({
      url: 'http://localhost:6969' + req.originalUrl,
      method: 'POST',
      enctype: 'multipart/form-data',
      body: req.body,
    }).pipe(res);
  } else {
    request({
      method: 'post',
      url: 'http://localhost:6969' + req.originalUrl,
      headers: {
        'User-Agent': req.headers['user-agent'],
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    }).pipe(res);
  }
});

react.get('/api/*', (req, res) => {
  // console.log('login', req.originalUrl);
  request({
    method: 'get',
    url: 'http://localhost:6969' + req.originalUrl,
    headers: {
      'User-Agent': req.headers['user-agent'],
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body),
  }).pipe(res);
});
react.delete('/api/*', (req, res) => {
  // console.log('login', req.originalUrl);
  request({
    method: 'delete',
    url: 'http://localhost:6969' + req.originalUrl,
    headers: {
      'User-Agent': req.headers['user-agent'],
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body),
  }).pipe(res);
});

// react.get('/api/*', (req, res) =>{
//   request.post('http://localhost:6969/api/login').pipe(res);
// })

setTimeout(() => {
  react.listen(3000, () => {
    console.log('\n');
    console.log(`React Running on ${process.platform}`);
    Object.keys(net).forEach((type) => {
      net[type].forEach((ip) => {
        if (ip.family === 'IPv4') {
          console.log(`${type}\t: ${ip.address}:3000`);
        }
      });
    });
    //  console.log(os.hostname());
  });
}, 2000);

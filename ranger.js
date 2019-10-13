const fs = require('fs');
const path = require('path');

let fileList = [];

const _ = (process.platform==='win32'? '\\' : '/');
let cwd;

function getFile(id)
{
	if(typeof id === 'string') return fileList.find(f => f.id === parseInt(id));
	else return fileList.find(f => f.id === id);
}


/*--------------------Deprecated--------------------*/
// function getFilesInDirectory(realativeDir)
// {
// 	var localFiles = [];
// 	const dir = cwd + _ +realativeDir
// 	var unprocessedFiles;
// 	try
// 	{
// 		unprocessedFiles = fs.readdirSync(dir , {withFileTypes: true});
// 	} 
// 	catch(err)
// 	{
// 		console.log(`no such file or directory, scandir ${dir}`);
// 		return '404 not found';
// 	}

// 	unprocessedFiles.forEach( (dirent, index) => {
// 		var stat;
// 		try
// 		{
// 			fs.accessSync(realativeDir+dirent.name);
// 		}
// 		catch(e)
// 		{
// 			console.log('Deprecated!');
// 			console.log(`getFilesInDirectory : no such file or directory, stat ${dir+dirent.name}`);
// 			return '404 not found';
// 		}
// 		stat = fs.statSync(realativeDir+dirent.name);
// 		localFiles.push({
// 			id: index,
// 			name: dirent.name,
// 			url : encodeURIComponent(dirent.name),
// 			ext: (!dirent.isFile()? ' ' : 
// 					path.parse(dirent.name).ext.substring(1)==='' ? '~' : 
// 					path.parse(dirent.name).ext.substring(1)),
// 			isFile: dirent.isFile(),
// 			lastModified: parseDate(stat.mtime),
// 			fullSize: stat.size,
// 			size: parseSize(stat.size)
// 		});
// 	});
// 	return localFiles;
// }
/*--------------------Deprecated--------------------*/


function parseSize(size)
{
	if(size<1024) return `${size.toFixed(2)} Bytes`
	size = size/1024;
	if(size<1024) return `${size.toFixed(2)} KB`
	size = size/1024;
	if(size<1024) return `${size.toFixed(2)} MB`
	size = size/1024;
	return `${size.toFixed(2)} GB`
}

function parseDate(arg)
{
	return `${arg.getDate()}/${arg.getMonth()+1}/${arg.getFullYear()}`;
}

function getAllFiles()
{
	if(fileList!==[]) return fileList;
}

function loadAllFiles(index, dir, nivel){
	var Files = [], unprocessedFiles = [];
	const dep = index;
	try
	{
		unprocessedFiles = fs.readdirSync(dir , {withFileTypes: true});
	} 
	catch(err)
	{
		console.log(`no such file or directory, scandir ${dir}`);
		return '404 not found';
	}

	unprocessedFiles.forEach( (dirent) => {
		var stat;
		if(dirent.name !== 'node_modules' && dirent.name !== 'build' && dirent.name !=='files.json' && dirent.name !=='ranger.json' ){
			try
			{
				stat = fs.statSync(dir+_+dirent.name);
			}
			catch(e)
			{
				console.log(`loadAllFiles : no such file or directory, stat ${dir+dirent.name}`);
				console.log(e);
				return '404 not found';
			}
			Files.push({
				id: ++index,
				name: dirent.name,
				ext: (!dirent.isFile()? '' : 
						path.parse(dirent.name).ext.substring(1)==='' ? '~' : 
						path.parse(dirent.name).ext.substring(1)),
				isFile: stat.isFile(),
				lastModified: parseDate(stat.mtime),
				fullSize: stat.size,
				size: parseSize(stat.size),
				dependency: dep,
				nivel: nivel
			});
			if(!dirent.isFile()) 
			{
				let dependedFiles = loadAllFiles(index, dir+_+dirent.name, nivel );
				Files = Files.concat(dependedFiles);
				index += dependedFiles.length;
			}
		}
	});
	return Files;
}

function createJSON(data, message, con)
{
	fs.writeFile('files.json', data, 'utf8', 
		(err) => {
			if(err) {
				console.log('An error occurred during initialization.');
				return;
			}
			console.log(`\nfiles.json Successfully ${message}!\n`);
			if(con)fileList = JSON.parse(fs.readFileSync('files.json', 'utf8'));
			return;
	});
}

function parseDependency(file)
{
	let dir = file.name;
	if(file.dependency !== 0)
	{
		dir = parseDependency(getFile(file.dependency)) + _ + dir;
	}
	return dir;
}

function getDependency(file){
	let dir = cwd+_+parseDependency(file, fileList);
	return dir;
}

function setNivel(id, newNivel)
{
	for(let x = 0;x < fileList.length; ++x)
	{
		if(fileList[x].id===id)
		{
			fileList[x].nivel = newNivel;
			break;
		}
	}
}

function rename(file, newName, where, callback)
{
	fs.access(file, (err) => 
	{
		console.log('File', file);
		console.log('newName', newName);
		if(!err)
		{
			fs.rename(file, newName, (err) =>
			{
				if(err){
					if( err.message.includes('cross-device link not permitted') ){
						var is = fs.createReadStream(file);
						var os = fs.createWriteStream(newName);
						is.pipe(os);
						is.on('end',function() {
							fs.unlinkSync(file);
							addToFile(newName, fileList.length+1, parseInt(where));
							createJSON(JSON.stringify(fileList), 'updated', false);
							callback({response: 'Received'});
						});

					} 
				}
				else 
				{
					addToFile(newName, fileList.length+1, parseInt(where));
					createJSON(JSON.stringify(fileList), 'updated', true);
					callback({response: 'Received'});
				}
			});
		}
		else console.log(err.message) 
	});
}

function addToFile( dir, index, dep )
{
	let dirent = path.parse(dir);
	try
	{
		stat = fs.statSync(dir);
	}
	catch(e)
	{
		console.log(`addToFile : no such file or directory, stat ${dir}`);
		console.log(e);
		return '404 not found';
	}
	fileList.push({
		id: index,
		name: dirent.base,
		ext: (!stat.isFile()? '' : 
				dirent.ext.substring(1)==='' ? '~' : 
				dirent.ext.substring(1)),
		isFile: stat.isFile(),
		lastModified: parseDate(stat.mtime),
		fullSize: stat.size,
		size: parseSize(stat.size),
		dependency: dep,
		nivel: 1
	});
}


while(!cwd)
{
	try{
		fs.accessSync('Directorio.txt');
		let directory = fs.readFileSync('Directorio.txt', 'utf-8');
		try{
			fs.accessSync(directory);
			cwd = directory;
		}
		catch(e)
		{
			console.log(directory);
			console.log(`La direccion en el archivo 'Directorio.txt' no es valida`);
			console.log(`Corrija y vuelva a intentarlo`);
			process.exit();
		}
	}
	catch(err)
	{
		console.log('--------------		Creando Directorio.txt		--------------');
		try{
			fs.writeFileSync('Directorio.txt', process.cwd() + _ +'Folder' , 'utf8');
		}
		catch(e)
		{
			console.log('Ha ocurrido un error al inicializar.');
			console.error(e);
			process.exit();
		}
	}
}

let initialFiles = JSON.stringify(loadAllFiles(0, cwd, 1));
console.log('Creating json')
createJSON( initialFiles, 'created', true);

module.exports = {
	rename = rename,
	getFiles = getFilesInDirectory,
	getAllFiles = getAllFiles,
	getDependency = getDependency,
	getFile = getFile,
	wd = cwd,
	setNivel = setNivel
}
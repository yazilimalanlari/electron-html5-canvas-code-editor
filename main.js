const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const { readFileSync, writeFileSync, readdirSync, statSync } = require('fs');
const { basename, join } = require('path');
const { homedir } = require('os');

const LAST_SESSION_PATH = join(homedir(), '.pldeditor/last-session.json');

let win, savePath;

let openedFiles = [];
let openRootFolder = null;

function setOpenedFiles() {
    for (const file of openedFiles) {
        win.webContents.send('open-file', {
            content: readFileSync(file.path, 'utf-8'),
            filename: file.filename,
            path: file.path
        });
    }
}

function getFiles(path) {
    const files = [];
    const stat = statSync(path);
    if (stat.isFile()) {
        return [{
            name: basename(path),
            path,
            type: 'file'
        }]
    }
    
    for (const name of readdirSync(path)) {
        const pathJoin = join(path, name);
        const stat = statSync(pathJoin);
        const object = {
            name,
            path: pathJoin,
            type: stat.isFile() ? 'file' : 'directory'
        }
        
        if (stat.isDirectory()) {
            object.files = getFiles(pathJoin);
        }
        files.push(object);
    }
    return files;
}

function getOpenFolder(path) {
    const items = [];
    for (const name of readdirSync(path)) {
        const stat = statSync(join(path, name));
        items.push({
            name,
            path: join(path, name),
            type: stat.isFile() ? 'file' : 'directory'
        });
    }
    return items;
}

function openFolder(path) {
    win.webContents.send('open-folder', getOpenFolder(path));
}

function openFile(path) {
    if (openedFiles.find(file => file.path === path)) return;
    const content = readFileSync(path, 'utf-8');
    const file = {
        content,
        filename: basename(path),
        path
    }
    openedFiles.push({ filename: file.filename, path });
    win.webContents.send('open-file', file);
}

const menuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'New File',
                click() {
                    win.webContents.send('open-file', {
                        content: '',
                        filename: 'New File',
                        path: '@new-file' + Math.random().toString()
                    });
                }
            },
            {
                label: 'Open File',
                click() {
                    const result = dialog.showOpenDialogSync({
                        properties: ['openFile']
                    });
                    
                    if (result !== undefined) {
                        openFile(result[0]);
                    }
                }
            },
            {
                label: 'Open Folder',
                click() {
                    const result = dialog.showOpenDialogSync({
                        properties: ['openDirectory']
                    });
                    
                    if (result !== undefined) {
                        openRootFolder = result[0];
                        openFolder(openRootFolder);
                    }
                }
            },
            {
                label: 'Save',
                click() {
                    win.webContents.send('save');
                }
            },
            {
                label: 'Save As',
                click() {
                    savePath = dialog.showSaveDialogSync({
                        properties: ['openFile']
                    });
                    if (savePath !== undefined)
                        win.webContents.send('save', 'save-as');
                }
            }
        ]
    }
];

const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);

function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
            devTools: true
        }
    });
    win.maximize();

    win.loadFile('index.html');
    win.once('ready-to-show', () => {
        const lastSession = JSON.parse(readFileSync(LAST_SESSION_PATH, 'utf-8'));
        openedFiles = lastSession.openedFiles;
        openRootFolder = lastSession.openRootFolder;
        setOpenedFiles();
        
        if (openRootFolder != null) openFolder(openRootFolder);
    });
}

app.whenReady().then(createWindow);


app.on('window-all-closed', () => {
    writeFileSync(LAST_SESSION_PATH, JSON.stringify({ openedFiles, openRootFolder }), 'utf-8');
    if (process.platform !== 'darwin') {    
        app.quit();
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('open-dev-tools', () => win.webContents.openDevTools());

ipcMain.on('save', (e, data) => {
    if (data.openedFile.path.startsWith('@new-file')) {
        const path = dialog.showSaveDialogSync({
            properties: ['openFile']
        });
        if (path === undefined) return;
        const filename = basename(path);
        writeFileSync(path, data.content, 'utf-8');
        openedFiles.push({
            filename,
            path
        });
    } else {
        writeFileSync(data.openedFile.path, data.content, 'utf-8');
    }
});

ipcMain.on('save-as', (e, data) => {
    writeFileSync(savePath, data, 'utf-8')
});

ipcMain.on('open-file', (e, path) => {
    openFile(path);
});

ipcMain.on('close-file', (e, path) => {
    const index = openedFiles.findIndex(file => file.path === path);
    openedFiles.splice(index, 1);
});
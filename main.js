const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const { readFileSync, writeFileSync, readdirSync, statSync } = require('fs');
const { basename, join } = require('path');
const { homedir } = require('os');

let win, savePath;

let openedFiles = [];

function setOpenedFiles() {
    const path = join(homedir(), '.pldeditor/openedFiles.json');
    openedFiles = JSON.parse(readFileSync(path, 'utf-8'));
    for (const file of openedFiles) {
        win.webContents.send('open-file', {
            content: readFileSync(file.path, 'utf-8'),
            fileName: file.filename,
            path: file.path
        });
    }
}

function getFiles(path, files = []) {
    const stat = statSync(path);
    if (stat.isFile()) {
        return {
            type: 'file',
            name: basename(path),
            path
        }
    }

    for (const name of readdirSync(path)) {
        path = join(path, name);
        files.push({
            
        });
    }
    return files;
}

const menuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Open File',
                async click() {
                    const result = await dialog.showOpenDialog({
                        properties: ['openFile']
                    });
                    
                    if (!result.canceled) {
                        const content = readFileSync(result.filePaths[0], 'utf-8');
                        const file = {
                            content,
                            fileName: basename(result.filePaths[0]),
                            path: result.filePaths[0]
                        }
                        openedFiles.push({ filename: file.fileName, path: file.path });
                        win.webContents.send('open-file', file);
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
                        console.log(getFiles(result[0]));
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

    win.loadFile('index.html');
    //win.webContents.openDevTools();
    win.once('ready-to-show', () => {
        setOpenedFiles();
    });
}

app.whenReady().then(createWindow);


app.on('window-all-closed', () => {
    const openedFilesPath = join(homedir(), '.pldeditor/openedFiles.json');
    writeFileSync(openedFilesPath, JSON.stringify(openedFiles), 'utf-8');
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
    writeFileSync(data.openedFile.path, data.content, 'utf-8');
});
ipcMain.on('save-as', (e, data) => {
    writeFileSync(savePath, data, 'utf-8')
});

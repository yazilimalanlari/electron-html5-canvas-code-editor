const { ipcRenderer, remote } = require('electron');
const Tabs = {
    list: [],
    active: null,
    add(title, path, content) {
        const tab = document.createElement('div');
        tab.classList.add('tab');
        tab.setAttribute('data-path', path);
        tab.innerHTML = `
            <span class="tab-title">${title}</span>
            <span class="tab-close">&times</span>
        `;
        this.list.push({
            element: tab,
            path
        });
        document.querySelector('.tabs').appendChild(tab);

        if (this.active != null) {
            this.active.rows = JSON.stringify(rows);
        }

        this.active = this.list[this.list.length - 1];
        tab.addEventListener('click', () => this.change(path));
        setContent(content.replace(/\t/g, '    '));
    },
    change(path) {
        const tab = this.list.find(tab => tab.element.getAttribute('data-path') === path);
        this.active.rows = JSON.stringify(rows);
        this.active = tab;
        rows.splice(0, rows.length, ...JSON.parse(tab.rows));
        draw();
    }
}

function setContent(content) {
    const arrayContent = content.split('\n').map(line => line.split(''));
    rows.splice(0, rows.length, ...arrayContent);
    draw();
}

ipcRenderer.on('open-file', (e, file) => {
    document.title = file.fileName;
    Tabs.add(file.fileName, file.path, file.content);
});

ipcRenderer.on('save', (e, type) => {
    const content = [...rows].map(row => [...row].join('')).join('\n');
    
    if (type === 'save-as') {
        ipcRenderer.send('save-as', content);
    } else {
        ipcRenderer.send('save', {
            openedFile: { path: Tabs.active.path },
            content
        });
    }
});

//remote.webContents.openDevTools();

window.addEventListener('keydown', e => {
    if (e.key === 'F12') {
        ipcRenderer.send('open-dev-tools', true);
    }
});

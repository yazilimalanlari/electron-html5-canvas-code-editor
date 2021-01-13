const { ipcRenderer, remote } = require('electron');
const Tabs = {
    list: [],
    active: null,
    add(title, path, content) {
        const tab = document.createElement('div');
        document.querySelectorAll('.tab.active').forEach(element => element.classList.remove('active'));
        tab.classList.add('tab', 'active');
        tab.setAttribute('data-path', path);
        tab.innerHTML = `
            <span class="tab-title">${title}</span>
            <span class="tab-close" data-role="close">&times</span>
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
        tab.addEventListener('click', e => {
            if (e.target.getAttribute('data-role') === 'close') {
                this.close(path);
            } else {
                this.change(path);
            }
        });
        setContent(content.replace(/\t/g, '    '));
    },
    change(path) {
        const tab = this.list.find(tab => tab.element.getAttribute('data-path') === path);
        document.querySelectorAll('.tab.active').forEach(element => element.classList.remove('active'));
        tab.element.classList.add('active');
        this.active.rows = JSON.stringify(rows);
        this.active = tab;
        rows.splice(0, rows.length, ...JSON.parse(tab.rows));
        draw();
    },
    close(path) {
        const index = this.list.findIndex(tab => tab.element.getAttribute('data-path') === path);
        if (index > 0) {
            this.change(this.list[index - 1].element.getAttribute('data-path'));
        } else {
            rows.splice(0, rows.length);
            this.active = null;
            draw();
        }
        
        this.list[index].element.remove();
        this.list.splice(index, 1);
        ipcRenderer.send('close-file', path);
    }
}

function setContent(content) {
    const arrayContent = content.split('\n').map(line => line.split(''));
    rows.splice(0, rows.length, ...arrayContent);
    draw();
}

ipcRenderer.on('open-file', (e, file) => {
    document.title = file.filename;
    Tabs.add(file.filename, file.path, file.content);
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

function setFiles(files, parentNode) {
    const element = document.createElement('ul');
    for (const file of (files ?? [])) {
        element.innerHTML += `<li class="${file.type}" data-path="${file.path}">${file.name}</li>`;
        
        if (file.type === 'directory') {
            setFiles(file.files, element);
        }
    }
    parentNode.appendChild(element);
}

document.addEventListener('click', e => {
    if ([...e.target.classList].includes('file')) {
        const path = e.target.getAttribute('data-path');
        ipcRenderer.send('open-file', path);
    }
});

ipcRenderer.on('open-folder', (e, files) => {
    setFiles(files, document.querySelector('.files'));    
});

window.addEventListener('keydown', e => {
    if (e.key === 'F12') {
        ipcRenderer.send('open-dev-tools', true);
    }
});

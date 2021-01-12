const editor = document.createElement('canvas');
editor.classList.add('editor');
document.querySelector('.wrapper').appendChild(editor);

const rect = editor.getBoundingClientRect();

editor.width = rect.width;
editor.height = rect.height;

const editorConfig = {
    paddingLeft: 50,
    paddingTop: 20,
    backgroundColor: '#151517'
}

const ctx = editor.getContext('2d');
ctx.lineCap = 'round';

const cursor = {
    x: 0,
    y: 0,
    color: 'white',
    draw() {
        const x = this.x * 10 + (editorConfig.paddingLeft);
        const y = this.y * rowHeight - scroll.calculateScrollRealPositionY() + (editorConfig.paddingTop / 4);
        const w = 2;
        const h = rowHeight;
        this.color = this.color === 'white' ? '#151517' : 'white';
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, w, h);
    },
    animation() {
        setInterval(this.draw.bind(this), 1000);
    }
}

let rowHeight = 20;

const scroll = {
    x: 0,
    _y: 0,
    height: 0,
    scrollHeight: 0,
    shown: 0,
    get y() {
        return this._y;
    },
    set y(value) {
        if (this.calculateScrollPositionY(value) <= 0)
            this._y = 0;
        else if (this.calculateScrollPositionY(value) >= editor.height - this.scrollHeight)
            this._y = editor.height - this.scrollHeight;
        else {
            this._y = this.calculateScrollPositionY(value);
        }
    },
    calculateScrollPositionY(acceleration) {    
        return this.y + acceleration / (this.height / (rowHeight * this.shown));
    },
    calculateScrollRealPositionY() {
        const shown = editor.height / rowHeight;
        const height = rowHeight * rows.length;
        return this.y * (height / (rowHeight * shown));
    },
    setMouseDownPositionY(value) {
        this._y = value < 0 ? 0 : value;
    },
    draw() {
        this.shown = editor.height / rowHeight;
        this.height = rowHeight * rows.length;
        this.scrollHeight = (this.shown * rowHeight) / (this.height / editor.height);
        if (this.shown < rows.length) {
            ctx.fillStyle = 'grey';
            ctx.fillRect(editor.width - 10, this.y, 10, this.scrollHeight)
        }
    }
}

const selection = {
    isSelection: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    realStartX: 0,
    realStartY: 0,
    draw(x, y, w, h) {
        ctx.globalAlpha = .2;
        ctx.fillStye = '#ffffff';
        ctx.fillRect(x, y, w, h);
    },
    setCopy(data) {
        const textarea = document.createElement('textarea');
        textarea.value = data;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    },
    copy() {
        if (!this.isSelection) return;
        let dataRange = rows.slice(this.startY, this.endY + 1);
        dataRange[0] = dataRange[0].slice(this.startX);
        const i = dataRange.length > 0 ? dataRange.length - 1 : 0;
        dataRange[i] = dataRange[i].slice(0, i === 0 ? this.endX - this.startX : this.endX);

        const result = dataRange.map(row => row.join('')).join('\n');
        this.setCopy(result);
    },
    cut() {
        if (!this.isSelection) return;
        const inline = this.startY === this.endY;
        const result = [rows[this.startY].splice(this.startX, inline ? this.endX - this.startX : rows[this.startY].length - this.startX)];
        if (!inline) {
            const lastRow = rows[this.endY].splice(0, this.endX);
            if (this.endY - this.startY > 1) {
                result.push(...rows.splice(this.startY + 1, this.endY - this.startY - 1));
            }
        }

        this.setCopy(result.map(row => row.join('')).join('\n'));
        selection.isSelection = false;    
        draw();
    }
}

const rows = [[]];

/*for (let i = 0; i < 10; i++) {
    rows.push([]);
    for (let c = 0; c < 25; c++) {
        rows[i].push(Math.floor(Math.random() * 10));
    }
}*/

const fontFamily = 'Source Code Pro';
const fontSize = 16;

const charsColors = {
    '{': 'green',
    '}': 'green'
}

const keywords = [
    'function',
    'const',
    'let',
    'var',
    'return',
    'class',
    'if',
    'else',
    'switch',
    'case',
    'break'
]

function calculateCharPositionX(charX) {
    return charX * 10 + editorConfig.paddingLeft;
}

const lastCharAnimation = {
    char: { x: -1, y: -1 },
    fromX: -1,
    toX: -1,
    globalAlpha: 0,
    isFinished: true,
    interval: null,
    setAnimation(x, y) {
        if (this.interval != null) clearInterval(this.interval);
        this.char = { x, y };
        this.isFinished = false;
        this.toX = calculateCharPositionX(x);
        this.fromX = this.toX - 10;
        this.globalAlpha = 0;
        this.interval = setInterval(() => {
            this.fromX += 2;
            if (this.globalAlpha < 1)
                this.globalAlpha += .2;
            draw();
            if (this.fromX >= this.toX) {
                clearInterval(this.interval);
                this.isFinished = true;
            }
        }, 50);
    },
    getAnimation(originalX, originalY) {
        if (this.isFinished || originalX !== this.char.x || originalY !== this.char.y) {
            return { 
                x: calculateCharPositionX(originalX),
                globalAlpha: 1
            }
        }
        return {
            x: this.fromX,
            globalAlpha: this.globalAlpha
        }
    }
}

function getColor(x, y) {
    const row = rows[y] ?? [];
    let keyword = row.join('').substring(x);

    const index = keyword.indexOf(' ');
    keyword = keyword.substring(0, index);
    const color = keywords.includes(keyword) ? '#de47de' : 'white';

    return {
        endX: x + keyword.length,
        color
    }
}

const isStringControlChar = char => ['\'', '"', '`'].includes(char);
const ignoreCharControl = (row, index) => {
    let count = 0;
    for (let i = index - 1; i > 0; i--) {
        if (row[i] === '\\') {
            count++;
        } else
            break;
    }
    return count % 2 !== 0;
}
const isOperators = char => ['+', '-', '*', '/', '%'].includes(char);

function draw() {
    ctx.globalAlpha = 1;
    ctx.fillStyle = editorConfig.backgroundColor;
    ctx.fillRect(0, 0, editor.width, editor.height);
    let color = null;
    let charY = 0;
    let string = false, type;
    let endX;
    let prototype = false;
    const shown = editor.height / rowHeight;
    const start = Math.floor(scroll.calculateScrollRealPositionY() / rowHeight);
    for (let i = start; i < start + shown && i < rows.length; i++) {
    //for (let i = 0; i < rows.length; i++) {
        const charY = i;
        const row = rows[i];
        ctx.globalAlpha = 1;
        let charX = 0;
        ctx.fillStyle = 'white';
        ctx.font = `14px "Source Code Pro"`;
        ctx.fillText(i + 1, 10, charY * rowHeight + editorConfig.paddingTop - scroll.calculateScrollRealPositionY());
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (isStringControlChar(char) && i > 0 && !ignoreCharControl(row, i)) {
                string = !string;
            } else if (char === '.') {
                prototype = true;
            } else if (['(', ')', ';', '='].includes(char) && prototype) {
                prototype = false;
            }

            let isColor = false;

            if (string || isStringControlChar(char)) {
                color = 'yellow'
                isColor = true;
            } else if (endX === undefined || charX > endX) {
                const result = getColor(charX, charY);
                endX = result.endX;
                color = result.color;
                isColor = color !== 'white';
            }

            if (!string && !isColor && (!isNaN(char) || isOperators(char))) {
                if (isOperators(char))
                    color = '#b847de';
                else 
                    color = '#869ad9';
            } else if (prototype) {
                color = '#59a9e3';
            } else if (!string && charX > endX) {
                color = 'white';
            }

            const animation = lastCharAnimation.getAnimation(charX, charY);
            ctx.globalALpha = animation.globalAlpha;
            ctx.fillStyle = color;
            ctx.font = `${fontSize}px ${fontFamily}`;
            ctx.fillText(char, animation.x, charY * rowHeight + editorConfig.paddingTop - scroll.calculateScrollRealPositionY());
            charX++;
        }

        if (selection.isSelection && selection.startY <= charY && selection.endY >= charY) {
            let x, y, w, h;
            
            if (selection.startY !== charY && selection.endY !== charY) {
                x = editorConfig.paddingLeft;
                w = row.length * 10;
            } else if (selection.realStartY === charY && selection.realEndY === charY) {
                x = selection.startX * 10 + editorConfig.paddingLeft;
                w = selection.endX * 10 + editorConfig.paddingLeft - x;
                if (x < editorConfig.paddingLeft) x = editorConfig.paddingLeft;
            } else if (selection.realEndY === charY) {
                if (selection.realStartY <= charY) {
                    x = editorConfig.paddingLeft;
                    w = selection.endX * 10 - x + editorConfig.paddingLeft;
                } else {
                    x = selection.startX * 10 + editorConfig.paddingLeft;
                    w = row.length * 10 - x + editorConfig.paddingLeft;
                }
            } else if (selection.realStartY === charY) {
                if (selection.realEndY < charY) {
                    x = editorConfig.paddingLeft;
                    w = selection.realStartX * 10;
                } else {
                    x = selection.realStartX * 10 + editorConfig.paddingLeft;
                    w = row.length * 10 - x + editorConfig.paddingLeft;
                }
            }

            y = (charY - 1) * rowHeight + editorConfig.paddingTop + (editorConfig.paddingTop / 4) - scroll.calculateScrollRealPositionY();
            h = rowHeight;
            const maxWidth = row.length * 10 + editorConfig.paddingLeft - x;
            if (w > maxWidth) w = maxWidth;

            selection.draw(x, y, w, h);
        }
        endX = undefined;
    }
    cursor.draw();
    scroll.draw();
}

const SYSTEM_CHARS = [
    'Enter',
    'Backspace',
    'Delete',
    'Alt',
    'Shift',
    'AltGraph',
    'ArrowLeft',
    'ArrowUp',
    'ArrowRight',
    'ArrowDown',
    'Tab',
    'Control',
    'Escape'
].concat([...Array(12)].map((_, i) => `F${i + 1}`));

const History = {
    index: 0,
    undoCount: 0,
    data: [
        {
            cursor: {
                x: cursor.x,
                y: cursor.y
            },
            rows: JSON.parse(JSON.stringify(rows))
        }
    ],
    setHistory() {
        if (this.diffControl()) {
            this.data.push({
                cursor: {
                    x: cursor.x,
                    y: cursor.y
                },
                rows: JSON.parse(JSON.stringify(rows))
            });
            historyTimeout = null;
            this.index++;
        }
    },
    diffControl() {
        const lastHistory = this.data[this.data.length - 1].rows;
        if (rows.length !== lastHistory.length) return true;

        for (let i = 0; i < rows.length; i++) {
            if (rows[i].length !== lastHistory[i].length)
                return true
            
            for (let c = 0; c < rows[i].length; c++) {
                if (rows[i][c] !== lastHistory[i][c]) return true;
            }
        }
        return false;
    },
    change(type) {
        let changeStatus = false;
        if (type === 'undo' && this.index > 0) {
            this.index--;
            this.undoCount++;
            changeStatus = true;
        } else if (type === 'redo' && this.index + 1 < this.data.length) {
            this.index++;
            this.undoCount--;
            changeStatus = true;
        }
        if (changeStatus === false) return;
        const historyData = this.data[this.index];
        rows.splice(0, rows.length, ...historyData.rows);
        cursor.x = historyData.cursor.x;
        cursor.y = historyData.cursor.y;
        draw();
    },
    clearRedo() {
        if (this.undoCount === 0) return;
        const data = JSON.parse(JSON.stringify(this.data));
        data.splice(this.data.length - this.undoCount, this.undoCount);
        this.index = data.length - 1;
        this.undoCount = 0;
        this.data.splice(0, this.data.length, ...data);
        setTimeout(this.setHistory.bind(this), 250);
    }
};

let historyTimeout = null;
document.addEventListener('keydown', e => {
    if (historyTimeout != null) {
        clearTimeout(historyTimeout);
    }

    if (e.ctrlKey === false && History.undoCount === 0) {
        historyTimeout = setTimeout(History.setHistory.bind(History), 250);
    }

    switch (e.key) {
        case 'Enter':
            rows.splice(cursor.y + 1, 0, rows[cursor.y].splice(cursor.x));
            cursor.x = 0;
            cursor.y++;
            if (!rows[cursor.y - 1].find(char => char !== ' ')) {
                for (let i = 0; i < rows[cursor.y - 1].length; i++) {
                    rows[cursor.y].push(' ');
                    cursor.x++;
                }
            }
            History.setHistory();
            break;
        case 'Backspace':
            if (cursor.x > 0) {
                rows[cursor.y].splice(--cursor.x, 1);
            } else if (cursor.y > 0) {
                cursor.x = rows[--cursor.y].length;
                rows[cursor.y].push(...rows.splice(cursor.y + 1, 1)[0]);
            }
            break;
        case 'Delete':
            if (cursor.x < rows[cursor.y].length) {
                rows[cursor.y].splice(cursor.x, 1);
            } else {
                rows.splice(cursor.y + 1, 1);
            }
            break;
        case 'ArrowLeft':
            if (cursor.x > 0)
                cursor.x--;
            else if (cursor.y > 0) {
                cursor.x = rows[cursor.y - 1].length;
                cursor.y--;
            }
            break;
        case 'ArrowUp':
            if (cursor.y > 0) {
                const row = rows[--cursor.y];
                if (cursor.x > row.length) cursor.x = row.length;
            }
            break;
        case 'ArrowRight':
            if (cursor.x < rows[cursor.y].length)
                cursor.x++;
            else if (cursor.y + 1 < rows.length) {
                cursor.x = 0;
                cursor.y++;
            }
            break;
        case 'ArrowDown':
            if (cursor.y + 1 < rows.length) {
                const row = rows[++cursor.y];
                if (cursor.x > row.length) cursor.x = row.length;
            }
            break;
        case 'Tab':
            for (let i = 0; i < 4; i++) {
                rows[cursor.y].splice(cursor.x++, 0, ' ');
            }
            e.preventDefault();
            break;
        default:
            if (e.ctrlKey) {
                if (e.key.toUpperCase() === 'C') {
                    selection.copy();
                } else if (e.key.toUpperCase() === 'X') {
                    selection.cut();
                } else if (e.key.toUpperCase() === 'Z') {
                    History.change('undo');
                } else if (e.key.toUpperCase() === 'Y') {
                    History.change('redo');
                }
                return;
            }
    }
    //console.log(e.key);

    if (cursor.y >= rows.length) rows.push([]);
    

    if (!SYSTEM_CHARS.includes(e.key)) {
        History.clearRedo();
        lastCharAnimation.setAnimation(cursor.x, cursor.y);
        rows[cursor.y].splice(cursor.x++, 0, e.key);
    }
    draw();
});

scroll.draw();
draw();
cursor.animation();

document.addEventListener('wheel', (e) => {
    scroll.y = e.deltaY;
    draw();
});

let scrollMove = false;

editor.addEventListener('mousedown', e => {
    const rect = editor.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.x - editorConfig.paddingLeft) / 10);
    const y = Math.round((e.clientY - rect.y - editorConfig.paddingTop + scroll.calculateScrollRealPositionY()) / rowHeight);

    if (getPosition(e).x >= editor.width - 10) {
        scroll.setMouseDownPositionY(getPosition(e).y - (scroll.scrollHeight / 2));
        scrollMove = true;
    } else {
        if (y < 0)
            cursor.y = 0;
        else if (y < rows.length)
            cursor.y = y;
        else 
            cursor.y = rows.length - 1;

        if (x < 0)
            cursor.x = 0;
        else if (rows.length > 0 && x <= rows[cursor.y].length)
            cursor.x = x;
        else if (rows.length > 0)
            cursor.x = rows[cursor.y].length;
    }
    draw();
});

const getPosition = e => {
    const rect = editor.getBoundingClientRect();
    return {
        x: e.clientX - rect.x,
        y: e.clientY - rect.y
    }
}


let clickStatus, startX, startY;
editor.addEventListener('mousedown', e => {
    selection.isSelection = false;
    const position = getPosition(e);
    selection.realStartX = startX = selection.startX = Math.round((position.x - editorConfig.paddingLeft) / 10);
    selection.realStartY = startY = selection.startY = Math.abs(Math.round((position.y - editorConfig.paddingTop + (editorConfig.paddingTop / 2) + scroll.calculateScrollRealPositionY()) / rowHeight));
    clickStatus = true;
    draw();
});

window.addEventListener('mouseup', () => {
    clickStatus = false;
    scrollMove = false;
});

editor.addEventListener('mousemove', e => {
    if (scrollMove) {
        scroll.setMouseDownPositionY(getPosition(e).y - (scroll.scrollHeight / 2));
        draw();
        return 
    }

    if (getPosition(e).x >= editor.width - 10) {
        editor.style.cursor = 'auto';
    } else {
        editor.style.cursor = 'text';
    }
    

    if (!clickStatus) return;
    selection.isSelection = true;
    const position = getPosition(e);
    selection.realEndX = selection.endX = Math.round((position.x - editorConfig.paddingLeft) / 10);
    selection.realEndY = selection.endY = Math.abs(Math.round((position.y - editorConfig.paddingTop + (editorConfig.paddingTop / 2) + scroll.calculateScrollRealPositionY()) / rowHeight));

    if (selection.endX < 0) selection.endX = 0;

    if (startX > selection.endX) {
        selection.startX = selection.endX;
        selection.endX = startX;
    }

    if (startY > selection.endY) {
        selection.startY = selection.endY;
        selection.endY = startY;
    }
    draw();
});

document.addEventListener('paste', e => {
    const value = e.clipboardData.getData('Text');
    const chars = rows[cursor.y].splice(cursor.x);
    const parse = value.split('\n');
    const firstLine = parse.shift();
    rows[cursor.y].push(...firstLine.split(''));

    let y = cursor.y + 1;
    for (const line of parse) {
        rows.splice(y++, 0, line.split(''));
    }
    cursor.x = rows[y - 1].length;
    rows[y - 1].push(...chars);
    draw();
});

window.addEventListener('resize', e => {
    const rect = editor.getBoundingClientRect();
    editor.width = rect.width;
    editor.height = rect.height;
    draw();
})

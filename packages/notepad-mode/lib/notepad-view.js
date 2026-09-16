const fs = require('fs')
const path = require('path')
const { Emitter, CompositeDisposable } = require('atom')

module.exports = class NotepadView {
  constructor(uri) {
    this.uri = uri
    this.filePath = uri.startsWith('notepad://') ? null : uri
    this.emitter = new Emitter()
    this.disposables = new CompositeDisposable()
    this.dirty = false
    this.element = document.createElement('div')
    this.element.className = 'notepad-tab-container'
    this.element.innerHTML = `
      <div class="notepad-toolbar">
        <button data-command="bold"><b>B</b></button><button data-command="italic"><i>I</i></button><button data-command="underline"><u>U</u></button>
        <button data-command="formatBlock" data-value="h1">H1</button><button data-command="formatBlock" data-value="h2">H2</button>
        <button data-command="insertUnorderedList">• List</button><button data-command="insertOrderedList">1. List</button>
        <span class="notepad-divider"></span><label>Font <select data-command="fontName"><option>Segoe UI</option><option>Calibri</option><option>Consolas</option><option>Georgia</option></select></label>
        <label>Size <select data-command="fontSize"><option value="2">14</option><option value="3">16</option><option value="4">18</option><option value="5">24</option><option value="6">32</option></select></label>
        <button class="notepad-save">Save</button><button class="notepad-save-as">Save As</button>
      </div><div class="notepad-canvas" contenteditable="true" spellcheck="true"></div>
      <div class="notepad-status"><span class="notepad-name">Untitled.note</span><span class="notepad-count">0 characters</span></div>`
    this.canvas = this.element.querySelector('.notepad-canvas')
    this.disposables.add(atom.commands.add(this.element, {
      'notepad-mode:bold': () => this.command('bold'),
      'notepad-mode:italic': () => this.command('italic')
    }))
    this.element.querySelectorAll('[data-command]').forEach(control => {
      control.addEventListener('mousedown', event => event.preventDefault())
      control.addEventListener('click', () => this.command(control.dataset.command, control.dataset.value || control.value))
    })
    this.element.querySelector('.notepad-save').addEventListener('click', () => this.save())
    this.element.querySelector('.notepad-save-as').addEventListener('click', () => this.saveAs())
    this.canvas.addEventListener('input', () => { this.dirty = true; this.updateStatus(); this.emitter.emit('did-change-modified') })
    this.load()
  }

  load() {
    if (this.filePath && fs.existsSync(this.filePath)) this.canvas.innerHTML = fs.readFileSync(this.filePath, 'utf8')
    else this.canvas.innerHTML = '<p><br></p>'
    this.element.querySelector('.notepad-name').textContent = this.filePath ? path.basename(this.filePath) : 'Untitled.note'
    this.updateStatus()
  }

  command(name, value) { this.canvas.focus(); document.execCommand(name, false, value || null); this.dirty = true; this.updateStatus() }
  updateStatus() { this.element.querySelector('.notepad-count').textContent = `${this.canvas.innerText.length} characters${this.dirty ? ' · Modified' : ''}` }
  getTitle() { return `${this.filePath ? path.basename(this.filePath) : 'Untitled.note'}${this.dirty ? ' *' : ''}` }
  getURI() { return this.uri }
  getElement() { return this.element }
  onDidChangeTitle(callback) { return this.emitter.on('did-change-title', callback) }
  onDidChangeModified(callback) { return this.emitter.on('did-change-modified', callback) }
  serialize() { return { deserializer: 'NotepadView', uri: this.uri } }
  copy() { return new NotepadView(this.uri) }
  destroy() { this.disposables.dispose(); this.element.remove() }
  async save() { return this.filePath ? this.write() : this.saveAs() }
  async saveAs() {
    const result = await atom.applicationDelegate.showSaveDialog({ defaultPath: 'Untitled.note', filters: [{ name: 'Rich notes', extensions: ['note'] }] })
    if (!result.canceled && result.filePath) { this.filePath = result.filePath; this.uri = result.filePath; this.write() }
  }
  write() { fs.writeFileSync(this.filePath, this.canvas.innerHTML, 'utf8'); this.dirty = false; this.element.querySelector('.notepad-name').textContent = path.basename(this.filePath); this.updateStatus(); this.emitter.emit('did-change-title'); this.emitter.emit('did-change-modified') }
}

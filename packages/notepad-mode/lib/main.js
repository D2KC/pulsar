const { CompositeDisposable } = require('atom')
const NotepadView = require('./notepad-view')

module.exports = {
  activate() {
    this.disposables = new CompositeDisposable()
    this.disposables.add(atom.workspace.addOpener(uri => {
      if (uri === 'notepad://new' || uri.endsWith('.note')) return new NotepadView(uri)
    }))
    this.disposables.add(atom.commands.add('atom-workspace', {
      'notepad-mode:new': () => atom.workspace.open('notepad://new'),
      'notepad-mode:open': async () => {
        const result = await atom.applicationDelegate.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Rich notes', extensions: ['note'] }] })
        if (!result.canceled && result.filePaths?.[0]) atom.workspace.open(result.filePaths[0])
      }
    }))
  },
  deactivate() { this.disposables?.dispose() }
}

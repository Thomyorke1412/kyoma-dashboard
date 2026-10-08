import { Blob as NodeBlob } from 'node:buffer'

if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(this)
    })
  }
}

const implSymbol = Object.getOwnPropertySymbols(new Blob([])).find((s) => s.description === 'impl')
const realStructuredClone = globalThis.structuredClone

globalThis.structuredClone = (value, options) => {
  if (implSymbol && value instanceof Blob && value[implSymbol] && value[implSymbol]._buffer !== undefined) {
    return realStructuredClone(new NodeBlob([value[implSymbol]._buffer], { type: value.type }), options)
  }
  return realStructuredClone(value, options)
}

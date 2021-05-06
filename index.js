const THREE = require('three')
const Buffer = global.Buffer
global.self = global
global.window = global
global.THREE = THREE
global.Blob = require('node-blob')
global.FileReader = require('./FileReader')
global.XMLHttpRequest = require('xhr2')
global.atob = require('atob')
global.fflate = require('fflate')

require('./mockDocument')
require('./mockURL')

require('three/examples/js/exporters/GLTFExporter')
require('three/examples/js/loaders/GLTFLoader')
require('three/examples/js/loaders/DRACOLoader')
require('three/examples/js/loaders/FBXLoader')
require('three/examples/js/loaders/OBJLoader')
const USDZExporter = require('./USDZExporter')

class NodeThreeExporter {
  constructor() {
    this.gltfLoader = new THREE.GLTFLoader()
    this.gltfLoader.setDRACOLoader(new THREE.DRACOLoader())
    this.objLoader = new THREE.OBJLoader()
    this.fbxLoader = new THREE.FBXLoader()
    this.gltfExporter = new THREE.GLTFExporter()
    this.usdzExporter = new USDZExporter()
  }

  getLoader(format) {
    if (!format) { return }
    format = format.toLowerCase()
    if (format === 'obj') {
      return this.objLoader
    } else if (format === 'fbx') {
      return this.fbxLoader
    } else if (format === 'gltf' || format === 'glb') {
      return this.gltfLoader
    } else {
      console.warn('Unknow loader format! Available formats: gltf, glb, obj, fbx')
    }
  }

  toArrayBuffer(buf) {
    var ab = new ArrayBuffer(buf.length)
    var view = new Uint8Array(ab)
    for (var i = 0; i < buf.length; ++i) {
      view[i] = buf[i]
    }
    return ab
  }

  prepareData(rawData, type) {
    if (type === 'obj') {
      if (typeof rawData === 'string') { return rawData }
      return rawData.toString ? rawData.toString() : rawData()
    }

    return Buffer.isBuffer(rawData) ? this.toArrayBuffer(rawData) : rawData
  }

  load(url, afterLoad, onError) {
    const ext = url.split('.').pop()
    const loader = this.getLoader(ext)
    if (!loader) { return }

    const onLoad = loadedModel => {
      const model = loadedModel.scene || loadedModel
      afterLoad(model)
    }

    loader.load(url, onLoad, null, onError)
  }

  parse(format, data, onParse, onError) {
    const onComplete = parsedData => {
      const model = parsedData.scene || parsedData
      onParse(model)
    }

    const loader = this.getLoader(format)
    if (!loader) { return }
    const preparedData = this.prepareData(data, format)

    if (format === 'fbx' || format === 'obj') {
      const parsedData = loader.parse(preparedData)
      onComplete(parsedData)
    } else if (format === 'glb' || format === 'gltf') {
      loader.parse(preparedData, './', onComplete, onError)
    }
  }

  generate(format, object, onParse, onError) {
    if (format === 'usdz') {
      this.usdzExporter.parse(object)
        .then(modelData => {
          const buffer = Buffer.from(modelData)
          onParse(buffer)
        })
        .catch(err => onError && onError(err))
    } else if (format === 'gltf') {
      try {
        this.gltfExporter.parse(object, modelData => {
          const buffer = Buffer.from(JSON.stringify(modelData))
          onParse(buffer)
        })
      } catch (err) {
        onError(err)
      }
    } else {
      console.warn('Unknow generating format! Available formats: gltf, usdz')
    }
  }
}

module.exports = NodeThreeExporter


const fs = require('fs')

const rolexBuffer = fs.readFileSync('./rolex.gltf')

const exporter = new NodeThreeExporter()


exporter.parse('gltf', rolexBuffer, model => {

  exporter.generate('gltf', model, buffer => {

    fs.writeFileSync('./model.gltf', buffer)
  })
})


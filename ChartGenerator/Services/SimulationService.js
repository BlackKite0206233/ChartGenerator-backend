let Promise       = require('bluebird')
let child_process = require('child_process')

let errorMsgService = require('./ErrorMsgService')

let config = require('../../config/config')

let makeFile = function (path) {
  return Promise((resolve, reject) => {
    child_process.exec('sh ' + config.cuda.makeFile + ' ' + path, (err, stdout, stderr) => {
      if (err) {
        console.log(err)
        reject(err)
        return
      }
      resolve()
    })
  })
}

let simulation = function (path, simIndex) {
  return Promise((resolve, reject) => {
    child_process.exec(path + 'Simulation ' + path + 'input.csv', (err, stdout, stderr) => {
      if (err) {
        console.log(err)
        reject(err)
        return
      }
      resolve()
    })
  })
}

module.exports = {
  makeFile:   makeFile,
  simulation: simulation
}
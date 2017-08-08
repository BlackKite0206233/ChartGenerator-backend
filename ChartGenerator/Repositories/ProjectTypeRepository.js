let Promise = require('bluebird')

let model = require('../connect')

let getAllType = function () {
  return new Promise((resolve, reject) => {
    model.knex.select().from('projecttype').then(allType => {
      resolve(allType)
    }).catch(error => {
      console.log(error)
      reject()
    })
  })
}

let getTypeById = function (id) {
  return new Promise((resolve, reject) => {
    model.knex.select().from('projecttype').where('id', id).then(type => {
      if (type[0] === undefined) {
        reject('Project type error')
      } else {
        resolve(type[0])
      }
    }).catch(error => {
      console.log(error)
      reject()
    })
  })
}

let createType = function (name) {
  return new Promise((resolve, reject) => {
    model.knex('projecttype').insert('name', name).then(() => {
      resolve()
    }).catch(error => {
      console.log(error)
      reject()
    })
  })
}

module.exports = {
  getAllType:  getAllType,
  getTypeById: getTypeById,
  createType:  createType
}
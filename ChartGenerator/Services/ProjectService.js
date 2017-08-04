let Promise = require('bluebird')

let redisRepository    = require('../Repositories/RedisRepository')
let projectRepoisitory = require('../Repositories/ProjectRepository')
let fileService        = require('./FileService')

let dataSet  = ['name', 'block', 'thread', 'runTime', 'symbol', 'reels', 'rows', 'betCost']
let fileName = ['baseStops', 'bonusStops', 'basePayTable', 'bonusPayTable', 'attr']

let extension = '.csv'
let folder    = './'

let getAllProject = function (token) {
  return new Promise((resolve, reject) => {
    redisRepository.getAccountId(req.get('Authorization')).then(accountId => {
      return projectRepoisitory.getAllProject(accountId)
    }).then(allProject => {
      resolve(allProject)
    }).catch(error => {
      reject()
    })
  })
}

let getProjectById = function (token, id) {
  return new Promise((resolve, reject) => {
    let data = {}
    redisRepository.getAccountId(token).then(accountId => {
      return projectRepoisitory.getProjectById(accountId, id)
    }).then(projectInfo => {
      data = projectInfo
  
      let readFile = {}
      for (let i of fileName) {
        readFile[i] = fileService.ReadFile(data[i])
      }
      
      return Promise.props(readFile)
    }).then(fileContext => {
      for (let i of fileName) {
        data[i] = fileContext[i]
      }
      resolve(data)
    }).catch(err => {
      reject()
    })
  })
}

let create = function (token, body) {
  let userId
  return new Promise((resolve, reject) => {
    redisRepository.getAccountId(token).then(accountId => {
      userId = accountId

      for (let i of dataSet) {
        if (body[i] === undefined) {
          reject()
        } else {
          data[i] = body[i]
        }
      }

      for (let i of fileName) {
        if (body[i] === undefined) {
          reject()
        } else {
          data[i] = './'
        }
      }

      return projectRepoisitory.createProject(userId, data)
    }).then(() => {
      return projectRepoisitory.getNewestProject(userId)
    }).then(projectInfo => {
      let path = folder + userId + '/' + projectInfo.id
  
      for (let i of fileName) {
        data[i] = path + '/' + i + extension
      }
    
      let promise = []
      promise.push(projectRepoisitory.updateProject(userId, data))
      for (let i of fileName) {
        promise.push(fileService.createFile(data[i], body[i]))
      }
    
      Promise.all(promise).then(() => {
        resolve()
      }).catch(error => {
        reject()
      })
    }).catch(error => {
      reject()
    })
  })
}

let update = function (token, id, body) {
  return new Promise((resolve, reject) => {
    redisRepository.getAccountId(token).then(accountId => {
      let userId = accountId
      let path   = folder + userId + '/' + id
  
      let data = {
        userId: userId
      }
  
      for (let i of dataSet) {
        if (body[i] === undefined) {
          res.json({error: 'serverError'})
        } else {
          data[i] = body[i]
        }
      }
  
      for (let i of fileName) {
        if (body[i] === undefined) {
          res.json({error: 'serverError'})
        } else {
          data[i] = path + '/' + i + extension
        }
      }
  
      let promise = []
      for (let i of fileName) {
        promise.push(fileService.deleteFile(data[i], body[i]))
      }
  
      Promise.all(promise).then(() => {
        let promise = []
        promise.push(projectRepoisitory.updateProject(id, data))
        for (let i of fileName) {
          promise.push(fileService.createFile(data[i], body[i]))
        }
      
        return Promise.all(promise)
      }).then(() => {
        resolve()
      }).catch(error => {
        reject()
      })
    }).catch(error => {
      reject()
    })
  })
}

let deleteProject = function (token, id) {
  let userId
  return new Promise((resolve, reject) => {
    redisRepository.getAccountId(token).then(accountId => {
      userId = accountId
      return projectRepoisitory.deleteProject(userId, id)
     }).then(() => {
      return fileService.deleteFolder(folder + userId + '/' + id)
     }).then(() => {
      resolve()
     }).catch(error => {
      reject()
     })
  })
}

module.exports = {
  getAllProject:  getAllProject,
  getProjectById: getProjectById,
  create:         create,
  update:         update,
  deleteProject:  deleteProject
}
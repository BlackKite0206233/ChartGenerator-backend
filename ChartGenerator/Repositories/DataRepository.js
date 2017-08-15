let Promise = require('bluebird')
let mapify  = require('es6-mapify')

let projectRepository = require('./ProjectRepository')

let model = require('../connect')

let calPayOutDistribution = function (tableIndex, projectId, request) {
  let table = ['overall', 'basegame', 'freegame']

  let size          = request.size
  let distributions = JSON.parse(request.distribution)

  let result = new Map()
  let key    = []

  for (let distribution of distributions) {
    for (let i = distribution.lower; i < distribution.upper; i = Math.round((i + distribution.space) * 10) / 10) {
      key.push(i)
      result.set(i, 0)
    }
  }
  
  return new Promise((resolve, reject) => {
    projectRepository.getProjectById(projectId).then(project => {
      return model.knex(table[tableIndex] + projectId).select(model.knex.raw('round((`netWin` / ? + 1) * 10) / 10 as payOut, count(*) as count', [project.betCost])).where('id', '<=', size).groupBy('payOut').orderBy('payOut', 'asc')
    }).then(rows => {
      let i = 0
      
      for (let row of rows) {
        while (key[i++] < row.payOut) {}
        i--
        result.set(key[i], result.get(key[i]) + row.count)
      }

      resolve(mapify.demapify(result))
    }).catch(error => {
      console.log(error)
      reject()
    })
  })
}

let getOverAll = function (projectId, request) {
  return new Promise((resolve, reject) => {
    calPayOutDistribution(0, projectId, request).then(result => {
      resolve(result)
    }).catch(() => {
      reject()
    })
  })
}

let getBaseGame = function (projectId, request) {
  return new Promise((resolve, reject) => {
    calPayOutDistribution(1, projectId, request).then(result => {
      resolve(result)
    }).catch(() => {
      reject()
    })
  })
}

let getFreeGame = function (projectId, request) {
  return new Promise((resolve, reject) => {
    calPayOutDistribution(2, projectId, request).then(result => {
      resolve(result)
    }).catch(() => {
      reject()
    })
  })
}

let getRTP = function (projectId, request) {
  return new Promise((resolve, reject) => {
    let size  = request.size
    let step  = request.step
    let range = request.range

    let result = new Map()

    projectRepository.getProjectById(projectId).then(project => {
      return model.knex.raw('select `rtp`, count(*) `count` from (select ((sum(`netWin`) + ?) / ?) `rtp`, floor((`id` - 1) / ?) `group` from `overall' + projectId + '` where `id` <= ? group by `group`) `result` group by `rtp` order by `rtp` asc', [project.betCost * step, step, step, size])
      // return model.knex.select(model.knex.raw('((sum(`netWin`) + ?) / ?) as rtp, floor((`id` - 1) / ?) as `group`', [project.betCost * step, step, step])).from('overall' + projectId).where('id', '<=', size).groupBy('group').orderBy('rtp', 'asc')
    }).then(rtpSet => {
      for (let rtp of rtpSet[0]) {
        let tmp = Math.floor(rtp.rtp * 100 / range)
        while (tmp >= result.size) {
          result.set(result.size * result.size / 100, 0)
        }
        result.set(tmp * range / 100, result.get(tmp * range / 100) + rtp.count)
      }
      resolve(mapify.demapify(result))
    }).catch(error => {
      console.log(error)
      reject()
    })
  })
}

let getTotalNetWin = function (projectId, request) {
  return new Promise((resolve, reject) => {
    let size    = request.size
    let range   = request.range

    let result = new Map()
    result.set(0, 0)

    model.knex('overall' + projectId).select().where('id', '<=', size).then(rows => {
      let min = 0
      let max = 0

      let netWin = 0
      for (let row of rows) {
        if (row.triger === 0) {
          netWin += row.netWin
        } else {
          let tmp = Math.floor(netWin / range)
          while (tmp < min || tmp > max) {
            if (tmp < min) {
              result.set((--min) * range, 0)
            } else {
              result.set((++max) * range, 0)
            }
          }
          netWin = 0
          result.set(range * tmp, result.get(range * tmp) + 1)
        }
      }
      resolve(mapify.demapify(result))
    }).catch(error => {
      console.log(error)
      reject()
    })
  })
}

let getSurvivalRate = function (projectId, request) {
  return new Promise((resolve, reject) => {
    let size = request.size
    model.knex('survivalrate' + projectId).select().where('id', '<=', size).then(rows => {
      resolve(rows)
    }).catch(error => {
      console.log(error)
      reject()
    })
  })
}

module.exports = {
  getOverAll:      getOverAll,
  getBaseGame:     getBaseGame,
  getFreeGame:     getFreeGame,
  getRTP:          getRTP,
  getTotalNetWin:  getTotalNetWin,
  getSurvivalRate: getSurvivalRate
}

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
      let sum   = 0
      let count = 0

      let q1  = Math.ceil(size / 4)
      let mid = Math.ceil(size / 2)
      let q3  = Math.ceil(size * 3 / 4)

      let q1Flag  = true
      let midFlag = true
      let q3Flag  = true

      let tableData = {
        min: rows[0].payOut,
        max: rows[rows.length - 1].payOut
      }

      let i = 0
      for (let row of rows) {
        count += row.count
        sum = Math.round(sum + row.payOut * row.count)

        if (q1Flag && count > q1) {
          tableData.q1 = row.payOut
          q1Flag = false
        } else if (midFlag && count > mid) {
          tableData.mid = row.payOut
          midFlag = false
        } else if (q3Flag && count > q3) {
          tableData.q3 = row.payOut
          q3Flag = false
        }

        while (key[i++] < row.payOut) {}
        i--
        result.set(key[i], result.get(key[i]) + row.count)
      }

      tableData.avg = Math.floor(sum / size * 100) / 100

      resolve({chartData: mapify.demapify(result), tableData: tableData})
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
      return model.knex.raw('select `rtp`, count(*) `count` from (select ((sum(`netWin`) + ?) / ?) `rtp`, floor((`id` - 1) / ?) `group` from `overall' + projectId + '` where `id` <= ? group by `group`) `result` group by `rtp` order by `rtp` asc', [project.betCost * step, project.betCost * step, step, size])
      // return model.knex.select(model.knex.raw('((sum(`netWin`) + ?) / ?) as rtp, floor((`id` - 1) / ?) as `group`', [project.betCost * step, step, step])).from('overall' + projectId).where('id', '<=', size).groupBy('group').orderBy('rtp', 'asc')
    }).then(rtpSet => {
      let sum   = 0
      let count = 0

      let q1  = Math.ceil(size / step / 4)
      let mid = Math.ceil(size / step / 2)
      let q3  = Math.ceil(size / step * 3 / 4)

      let q1Flag  = true
      let midFlag = true
      let q3Flag  = true

      let tableData = {
        min: Math.floor(rtpSet[0][0].rtp * 100 / range) * range / 100,
        max: Math.floor(rtpSet[0][rtpSet[0].length - 1].rtp * 100 / range) * range / 100
      }

      for (let rtp of rtpSet[0]) {
        let tmp = Math.floor(rtp.rtp * 100 / range)
        count += rtp.count
        sum = Math.round(sum + tmp * range / 100 * rtp.count)
        
        if (q1Flag && count > q1) {
          tableData.q1 = tmp * range / 100
          q1Flag = false
        } else if (midFlag && count > mid) {
          tableData.mid = tmp * range / 100
          midFlag = false
        } else if (q3Flag && count > q3) {
          tableData.q3 = tmp * range / 100
          q3Flag = false
        }

        while (tmp >= result.size) {
          result.set(result.size * range / 100, 0)
        }
        result.set(tmp * range / 100, result.get(tmp * range / 100) + rtp.count)
      }

      tableData.avg = Math.floor(sum * step * 100 / size) / 100

      resolve({chartData: mapify.demapify(result), tableData: tableData})
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

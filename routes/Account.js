let express = require('express')
let bcrypt  = require('bcrypt-nodejs')

let accountService = require('../ChartGenerator/Services/AccountService')

let router = express.Router()

// login
router.post('/', (req, res, next) => {
  accountService.login(req.body).then(token => {
    res.status(200).json({token: token})
  }).catch(error => {
    res.status(400).json(error)
  })
})

// register
router.post('/register', (req, res, next) => {
  accountService.register(req.body).then(token => {
    res.status(200).json({token: token})
  }).catch(error => {
    res.status(400).json(error)
  })
})

// update account data
router.put('/', (req, res, next) => {
  accountService.update(req.get('Authorization'), req.body).then(token => {
    res.status(200).json({token: token})
  }).catch(error => {
    res.status(400).json(error)
  })
})

// check if the account is unused
router.post('/confirm', (req, res, next) => {
  accountService.checkAccount(req.body.account).then(() => {
    res.status(200).json({message: 'success'})
  }).catch(error => {
    res.status(400).json(error)
  })
})

// get account data
router.get('/', (req, res, next) => {
  accountService.getAccount(req.get('Authorization')).then(userInfo => {
    res.status(200).json(userInfo)
  }).catch(error => {
    res.status(400).json(error)
  })
})

module.exports = router
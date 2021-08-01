var express = require('express');
const { where } = require('../db');
var router = express.Router();
const db = require('../db');
//by payment id
router.post('/transaction', (req, res) => {
    if (req.session.loggedIn) {
        db.from('payments').where({
            transaction_id: req.body.id
        }).then(result => {
            if (result.length != 0) {
                res.json(result[0]);
            }
            else {
                res.json({
                    'message': 'payment have not been requested yet'
                })
            }
        })
    }
    else {
        res.json({
            'message': 'You are not logged in'
        })
    }
})

// by customerId
router.get('/user', (req, res) => {
    if (req.session.loggedIn) {
        db.from('payments').where({
            'customer_id': req.session.uid
        }).then(value => {
            if (value.length != 0) {
                res.json(value);
            }
            else {
                res.json({
                    'message': 'No Payments Found'
                })
            }
        }).catch(err => {
            res.json({
                'message': err
            })
        })
    } else {
        res.json({
            'message': 'You are not logged in'
        })
    }
})
// by worker id
router.get('/worker', (req, res) => {
    if (req.session.worker) {
        db.from('payments').where({
            'worker_id': req.session.workerId
        }).then(value => {
            if (value.length != 0) {
                res.json(value);
            }
            else {
                res.json({
                    'message': 'No Payments Found'
                })
            }
        }).catch(err => {
            res.json({
                'message': err
            })
        })
    } else {
        res.json({
            'message': 'You are not logged in'
        })
    }
})

module.exports = router;